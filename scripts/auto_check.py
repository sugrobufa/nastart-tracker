#!/usr/bin/env python3
"""
Автоматическая проверка и загрузка новых протоколов НАСТАРТ.

Источники:
  1. настарт.рф — страницы прошедших стартов (tpost)
  2. Telegram-канал https://t.me/s/swimschool1cup

Скрипт:
  - Проверяет известные и новые страницы событий на настарт.рф
  - Собирает ссылки на Яндекс.Диск с протоколами
  - Сравнивает с уже имеющимися в PROTOCOLS (parse_pdfs.py)
  - Скачивает новые PDF через Yandex Disk API
  - Обновляет PROTOCOLS в parse_pdfs.py
  - Запускает пайплайн (парсинг + дедупликация)

Выход:
  - exit code 0: есть изменения (новые протоколы скачаны и обработаны)
  - exit code 1: нет изменений
"""

import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(REPO_ROOT, "scripts")
PDF_DIR = os.path.join(REPO_ROOT, "pdf_protocols")
PARSE_SCRIPT = os.path.join(SCRIPTS_DIR, "parse_pdfs.py")
DEDUP_SCRIPT = os.path.join(SCRIPTS_DIR, "deduplicate.py")
DATA_JSON = os.path.join(REPO_ROOT, "data.json")

# настарт.рф base URL (punycode)
NASTART_BASE = "https://xn--80aa1bodgc.xn--p1ai"
# Sprint section tpost base
TPOST_BASE = f"{NASTART_BASE}/sprint/15032026/tpost"

# Known event page URLs on настарт.рф
# Format: (tpost_slug, description)
# Newer events use date-based slugs (DDMMYYYY), older use Tilda hashes
KNOWN_EVENT_PAGES = [
    ("15032026", "НАСТАРТ II тур 2026"),
    ("15022026itogi", "НАСТАРТ I тур 2026"),
    ("14122025", "НАСТАРТ IV тур 2025"),
    ("19102025", "НАСТАРТ III тур 2025"),
    ("l09bslmis1-sorevnovaniya-po-plavaniyu-nastart-ii-tu", "НАСТАРТ II тур 2025"),
    ("3fiuyrbp01-sorevnovaniya-po-plavaniyu-nastart-i-tur", "НАСТАРТ I тур 2025"),
    ("tgxuauyno1-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ IV тур 2024"),
    ("yk4vgtvsu1-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ III тур 2024"),
    ("9b2mhb1fb1-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ II тур 2024"),
    ("20t1hauht1-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ I тур 2024"),
    ("xz2c87yy11-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ IV тур 2023"),
    ("1gf0upkro1-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ III тур 2023"),
    ("nkdrhz4x21-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ II тур 2023"),
    ("5kdgamxgp1-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ I тур 2023"),
    ("mkf0nmhbc1-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ IV тур 2022"),
    ("d591anmb91-otkritie-sorevnovaniya-po-plavaniyu-nast", "НАСТАРТ III тур 2022"),
]

# Telegram channel public preview
TELEGRAM_CHANNEL = "https://t.me/s/swimschool1cup"

# Yandex Disk public API
YADISK_API = "https://cloud-api.yandex.net/v1/disk/public/resources"

# Russian month names for date parsing
MONTHS_RU = {
    "января": 1, "февраля": 2, "марта": 3, "апреля": 4,
    "мая": 5, "июня": 6, "июля": 7, "августа": 8,
    "сентября": 9, "октября": 10, "ноября": 11, "декабря": 12,
}

TOUR_ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV"}
TOUR_FROM_ROMAN = {"i": 1, "ii": 2, "iii": 3, "iv": 4}


# ============================================================
# HTTP Utilities
# ============================================================

def fetch_url(url, retries=3):
    """Fetch URL content as string."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                              "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None  # Page doesn't exist
            if attempt == retries - 1:
                print(f"  [ERROR] HTTP {e.code} fetching {url}")
                return None
        except Exception as e:
            if attempt == retries - 1:
                print(f"  [ERROR] Failed to fetch {url}: {e}")
                return None
    return None


def fetch_json(url):
    """Fetch URL and parse JSON."""
    content = fetch_url(url)
    if content:
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            print(f"  [ERROR] JSON parse error: {e}")
    return None


def download_file(url, dest_path):
    """Download a file from URL to dest_path."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        })
        with urllib.request.urlopen(req, timeout=120) as resp:
            with open(dest_path, "wb") as f:
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
        return True
    except Exception as e:
        print(f"  [ERROR] Download failed: {e}")
        return False


# ============================================================
# Read existing PROTOCOLS from parse_pdfs.py
# ============================================================

def get_existing_protocols():
    """Read the PROTOCOLS list from parse_pdfs.py and return set of names."""
    with open(PARSE_SCRIPT, "r", encoding="utf-8") as f:
        content = f.read()
    names = set()
    for m in re.finditer(r'"name"\s*:\s*"([^"]+)"', content):
        names.add(m.group(1))
    return names


def get_existing_meets():
    """Get set of (meet, date) tuples already in PROTOCOLS."""
    with open(PARSE_SCRIPT, "r", encoding="utf-8") as f:
        content = f.read()
    meets = set()
    for m in re.finditer(
        r'\{"name":\s*"([^"]+)",\s*"date":\s*"([^"]+)",\s*"meet":\s*"([^"]+)"\}',
        content
    ):
        meets.add((m.group(1), m.group(2), m.group(3)))
    return meets


# ============================================================
# Event page discovery
# ============================================================

def generate_candidate_slugs():
    """
    Generate candidate tpost slugs for new events that might have been added.
    Based on the observation that newer events use DDMMYYYY or DDMMYYYYitogi slugs.
    
    НАСТАРТ competitions happen ~4 times/year (roughly March, May, October, December).
    We generate candidates for likely competition dates in the last 3 months.
    """
    candidates = []
    now = datetime.now()

    # Only check competition-likely weekends (Sat/Sun) in the last 90 days
    for days_ago in range(0, 90):
        dt = now - timedelta(days=days_ago)
        # Competitions are typically on weekends
        if dt.weekday() in (5, 6):  # Saturday or Sunday
            slug_base = f"{dt.day:02d}{dt.month:02d}{dt.year}"
            candidates.append(slug_base)
            candidates.append(f"{slug_base}itogi")

    return candidates


def discover_event_pages():
    """
    Discover all event pages to check for protocols.
    Returns list of (url, description) tuples.
    """
    pages = []

    # 1. Known event pages
    for slug, desc in KNOWN_EVENT_PAGES:
        url = f"{TPOST_BASE}/{slug}"
        pages.append((url, desc))

    # 2. Try to discover new date-based slugs
    existing_slugs = set(slug for slug, _ in KNOWN_EVENT_PAGES)
    candidates = generate_candidate_slugs()

    # Only test candidates not already in known list
    new_candidates = [c for c in candidates if c not in existing_slugs]

    # Test a limited batch of candidates
    max_tests = min(len(new_candidates), 10)
    if max_tests > 0:
        print(f"  Проверка {max_tests} возможных новых дат...")
    tested = 0
    for slug in new_candidates:
        if tested >= max_tests:
            break
        url = f"{TPOST_BASE}/{slug}"
        html = fetch_url(url)
        if html and len(html) > 5000:  # Real page, not 404
            # Check if it contains competition-related content
            if "протокол" in html.lower() or "настарт" in html.lower():
                print(f"  [НОВАЯ СТРАНИЦА] {url}")
                pages.append((url, f"Новая страница: {slug}"))
        tested += 1

    return pages


# ============================================================
# Extract protocols from event pages
# ============================================================

def extract_protocols_from_page(url, page_desc=""):
    """
    Fetch an event page and extract protocol Yandex Disk links with metadata.
    Returns list of protocol dicts with url, text, date, tour, age_group.
    """
    html = fetch_url(url)
    if not html:
        return []

    # Clean text for metadata extraction
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'\s+', ' ', text)

    protocols = []

    # Find all Yandex Disk /i/ links (individual files = protocols)
    for m in re.finditer(
        r'<a[^>]*href="(https://disk\.yandex\.ru/i/[^"]+)"[^>]*>(.*?)</a>',
        html, re.DOTALL
    ):
        link_url = m.group(1)
        link_text = re.sub(r'<[^>]+>', '', m.group(2)).strip()

        # Get surrounding context for metadata
        start = max(0, m.start() - 500)
        end = min(len(html), m.end() + 200)
        context = re.sub(r'<[^>]+>', ' ', html[start:end])
        context = re.sub(r'\s+', ' ', context).strip()

        protocols.append({
            "url": link_url,
            "text": link_text,
            "context": context,
            "source_url": url,
            "source_desc": page_desc,
        })

    # Also find bare URLs not in anchor tags
    for m in re.finditer(r'(https://disk\.yandex\.ru/i/[A-Za-z0-9_-]+)', html):
        link_url = m.group(1)
        if not any(p["url"] == link_url for p in protocols):
            protocols.append({
                "url": link_url,
                "text": "",
                "context": "",
                "source_url": url,
                "source_desc": page_desc,
            })

    return protocols


def _extract_age_group(text):
    """Extract age group from text. Returns '7', '7-8', '8plus', '9plus', or None."""
    # Check most specific patterns first
    if re.search(r'7[\s-]*8\s*лет', text):
        return "7-8"
    if re.search(r'9\s*лет\s*и\s*старше|9\s*\+|9plus', text):
        return "9plus"
    if re.search(r'8\s*лет\s*и\s*старше|8\s*\+|8plus', text):
        return "8plus"
    # "7 лет" only if not part of "7-8"
    if re.search(r'\b7\s*лет\b', text) or re.search(r'участник\w*\s+7\b', text):
        if not re.search(r'7[\s-]*8', text):
            return "7"
    return None


def extract_metadata_from_protocol(proto, page_html_text=""):
    """
    Extract structured metadata from a protocol link.
    Returns: {"name", "date", "meet", "age_group"} or None if cannot determine.
    """
    text = (proto.get("text", "") + " " + proto.get("context", "")).lower()

    # Extract date from text: "DD месяца YYYY" (with or without spaces)
    date = None
    for m in re.finditer(
        r'(\d{1,2})\s*(января|февраля|марта|апреля|мая|июня|июля|августа|'
        r'сентября|октября|ноября|декабря)\s*(\d{4})',
        text
    ):
        day = int(m.group(1))
        month = MONTHS_RU.get(m.group(2))
        year = int(m.group(3))
        if month and 2020 <= year <= 2030:
            date = f"{year}-{month:02d}-{day:02d}"
            break

    # Also try from URL slug (DDMMYYYY pattern)
    if not date:
        source_url = proto.get("source_url", "")
        for m in re.finditer(r'/tpost/(\d{2})(\d{2})(\d{4})', source_url):
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if 1 <= month <= 12 and 2020 <= year <= 2030:
                date = f"{year}-{month:02d}-{day:02d}"
                break

    if not date:
        return None

    year = int(date[:4])

    # Extract tour number
    tour = None
    # Search in full text context
    for m in re.finditer(r'[«"]?настарт[»"]?\s*(i{1,3}v?|[1-4])\s*тур', text, re.IGNORECASE):
        tour_str = m.group(1).lower()
        tour = TOUR_FROM_ROMAN.get(tour_str) or int(tour_str) if tour_str.isdigit() else None
        if tour:
            break

    if not tour:
        # Try "N тур" without НАСТАРТ prefix
        for m in re.finditer(r'(i{1,3}v?|[1-4])\s*тур', text, re.IGNORECASE):
            tour_str = m.group(1).lower()
            tour = TOUR_FROM_ROMAN.get(tour_str) or (int(tour_str) if tour_str.isdigit() else None)
            if tour:
                break

    if not tour:
        # Try from page description
        desc = proto.get("source_desc", "").lower()
        for m in re.finditer(r'(i{1,3}v?|[1-4])\s*тур', desc, re.IGNORECASE):
            tour_str = m.group(1).lower()
            tour = TOUR_FROM_ROMAN.get(tour_str) or (int(tour_str) if tour_str.isdigit() else None)
            if tour:
                break

    if not tour:
        return None

    # Extract age group — check the link's own text first, then context
    # (Context may contain age groups from other protocol links on same page)
    link_text = proto.get("text", "").lower()
    age_group = _extract_age_group(link_text)
    if not age_group:
        age_group = _extract_age_group(text)

    # Build names
    d = datetime.strptime(date, "%Y-%m-%d")
    tour_roman = TOUR_ROMAN.get(tour, str(tour))

    name = f"{d.year}_{d.month:02d}_{d.day:02d}_{tour}tour"
    if age_group:
        name += f"_{age_group}"

    meet = f"НАСТАРТ {tour_roman} тур {year}"

    return {
        "name": name,
        "date": date,
        "meet": meet,
        "age_group": age_group,
        "url": proto["url"],
    }


# ============================================================
# Telegram channel
# ============================================================

def check_telegram_channel():
    """Check Telegram channel for protocol links."""
    print("\n=== Проверка Telegram-канала ===")
    html = fetch_url(TELEGRAM_CHANNEL)
    if not html:
        print("  Не удалось загрузить Telegram-канал")
        return []

    protocols = []

    # Find Yandex Disk /i/ links (protocol files)
    for m in re.finditer(
        r'<a[^>]*href="(https://disk\.yandex\.ru/i/[^"]+)"[^>]*>',
        html
    ):
        link_url = m.group(1)
        # Get message context
        start = max(0, m.start() - 2000)
        context = html[start:m.end() + 500]
        context_text = re.sub(r'<[^>]+>', ' ', context)
        context_text = re.sub(r'\s+', ' ', context_text).strip()

        # Only include if looks like a protocol
        if any(w in context_text.lower() for w in ["протокол", "результат", "итог", "настарт"]):
            protocols.append({
                "url": link_url,
                "text": context_text[-300:],
                "context": context_text,
                "source_url": TELEGRAM_CHANNEL,
                "source_desc": "Telegram",
            })

    print(f"  Найдено ссылок на протоколы: {len(protocols)}")
    return protocols


# ============================================================
# Yandex Disk API
# ============================================================

def get_yadisk_resource_info(public_url):
    """Get resource info (filename, type, etc.) for a Yandex Disk public link."""
    encoded = urllib.parse.quote(public_url, safe='')
    api_url = f"{YADISK_API}?public_key={encoded}"
    return fetch_json(api_url)


def download_yadisk_file(public_url, dest_path, path_in_folder=None):
    """Download a file from Yandex Disk public link."""
    encoded = urllib.parse.quote(public_url, safe='')
    params = f"public_key={encoded}"
    if path_in_folder:
        params += f"&path={urllib.parse.quote(path_in_folder, safe='')}"

    api_url = f"{YADISK_API}/download?{params}"
    data = fetch_json(api_url)
    if not data or "href" not in data:
        print(f"  [ERROR] Не удалось получить ссылку для скачивания")
        return False

    return download_file(data["href"], dest_path)


# ============================================================
# Update parse_pdfs.py
# ============================================================

def add_protocol_to_parse_script(name, date, meet):
    """Add a new entry to the PROTOCOLS list in parse_pdfs.py."""
    with open(PARSE_SCRIPT, "r", encoding="utf-8") as f:
        content = f.read()

    new_entry = f'    {{"name": "{name}", "date": "{date}", "meet": "{meet}"}},'

    # Find the closing ] of PROTOCOLS list
    match = re.search(r'(PROTOCOLS\s*=\s*\[.*?)(^\])', content, re.DOTALL | re.MULTILINE)
    if not match:
        print(f"  [ERROR] Не найден конец списка PROTOCOLS в parse_pdfs.py")
        return False

    insert_pos = match.start(2)
    content = content[:insert_pos] + new_entry + "\n" + content[insert_pos:]

    with open(PARSE_SCRIPT, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✓ Добавлен в PROTOCOLS: {name}")
    return True


# ============================================================
# Main logic
# ============================================================

def main():
    print("=" * 60)
    print("НАСТАРТ: автоматическая проверка новых протоколов")
    print(f"Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    os.makedirs(PDF_DIR, exist_ok=True)

    # Read existing protocols
    existing_names = get_existing_protocols()
    print(f"\nСуществующие протоколы: {len(existing_names)}")
    for n in sorted(existing_names):
        print(f"  - {n}")

    # Get stats before
    athletes_before, results_before = 0, 0
    if os.path.exists(DATA_JSON):
        with open(DATA_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        athletes_before = len(data)
        results_before = sum(len(a["results"]) for a in data)

    # ---- Phase 1: Collect all protocol links ----
    all_protocol_links = []

    # Source 1: настарт.рф event pages
    print("\n=== Проверка настарт.рф ===")
    event_pages = discover_event_pages()
    print(f"  Всего страниц событий: {len(event_pages)}")

    for url, desc in event_pages:
        protocols = extract_protocols_from_page(url, desc)
        if protocols:
            print(f"  {desc}: {len(protocols)} протокол(ов)")
        all_protocol_links.extend(protocols)

    # Source 2: Telegram channel
    tg_protocols = check_telegram_channel()
    all_protocol_links.extend(tg_protocols)

    # Deduplicate by URL
    seen = set()
    unique_links = []
    for p in all_protocol_links:
        if p["url"] not in seen:
            seen.add(p["url"])
            unique_links.append(p)

    print(f"\nВсего уникальных ссылок на протоколы: {len(unique_links)}")

    # ---- Phase 2: Identify new protocols ----
    new_protocols = []
    for link in unique_links:
        meta = extract_metadata_from_protocol(link)
        if not meta:
            # Can't determine metadata — skip
            continue

        # Check if already in PROTOCOLS
        name = meta["name"]
        if name in existing_names:
            continue

        # Check for close matches (same date + tour, different age suffix)
        prefix = "_".join(name.split("_")[:4])  # YYYY_MM_DD_Ntour
        is_covered = False
        for existing in existing_names:
            existing_prefix = "_".join(existing.split("_")[:4])
            if prefix == existing_prefix:
                # Same date+tour exists — check age group
                existing_suffix = existing[len(existing_prefix):]
                new_suffix = name[len(prefix):]
                if existing_suffix == new_suffix:
                    is_covered = True
                    break

        if is_covered:
            continue

        new_protocols.append(meta)

    # Deduplicate new protocols by name
    seen_names = set()
    deduped = []
    for p in new_protocols:
        if p["name"] not in seen_names:
            seen_names.add(p["name"])
            deduped.append(p)
    new_protocols = deduped

    if not new_protocols:
        print("\n✓ Новых протоколов не найдено")
        return False

    print(f"\n{'='*60}")
    print(f"Найдено {len(new_protocols)} новых протоколов:")
    for p in new_protocols:
        print(f"  + {p['name']} ({p['meet']}, возраст: {p.get('age_group', '?')})")
        print(f"    URL: {p['url']}")

    # ---- Phase 3: Download and register ----
    downloaded_count = 0
    downloaded_names = []

    for proto in new_protocols:
        name = proto["name"]
        url = proto["url"]
        pdf_path = os.path.join(PDF_DIR, f"{name}.pdf")

        if os.path.exists(pdf_path):
            print(f"\n  [SKIP] PDF уже существует: {name}.pdf")
            # But maybe not in PROTOCOLS — add if needed
            if name not in existing_names:
                add_protocol_to_parse_script(name, proto["date"], proto["meet"])
                downloaded_count += 1
                downloaded_names.append(name)
            continue

        print(f"\n--- Загрузка: {name} ---")

        # Check resource info
        info = get_yadisk_resource_info(url)
        if not info:
            print(f"  [ERROR] Не удалось получить информацию о ресурсе")
            continue

        if info.get("type") == "file":
            fname = info.get("name", "")
            if not fname.lower().endswith(".pdf"):
                print(f"  [SKIP] Не PDF: {fname}")
                continue

            if download_yadisk_file(url, pdf_path):
                size_kb = os.path.getsize(pdf_path) / 1024
                print(f"  ✓ Сохранён: {name}.pdf ({size_kb:.0f} KB)")
                add_protocol_to_parse_script(name, proto["date"], proto["meet"])
                downloaded_count += 1
                downloaded_names.append(name)

        elif info.get("type") == "dir":
            # Folder — look for PDFs inside
            items = info.get("_embedded", {}).get("items", [])
            pdf_items = [it for it in items if it.get("name", "").lower().endswith(".pdf")]

            if not pdf_items:
                print(f"  [SKIP] Нет PDF в папке")
                continue

            if len(pdf_items) == 1:
                if download_yadisk_file(url, pdf_path, path_in_folder=f"/{pdf_items[0]['name']}"):
                    size_kb = os.path.getsize(pdf_path) / 1024
                    print(f"  ✓ Сохранён: {name}.pdf ({size_kb:.0f} KB)")
                    add_protocol_to_parse_script(name, proto["date"], proto["meet"])
                    downloaded_count += 1
                    downloaded_names.append(name)
            else:
                for idx, item in enumerate(pdf_items):
                    suffix = f"_s{idx+1}" if idx > 0 else ""
                    item_name = f"{name}{suffix}"
                    item_path = os.path.join(PDF_DIR, f"{item_name}.pdf")
                    print(f"  -> {item['name']} как {item_name}.pdf")
                    if download_yadisk_file(url, item_path, path_in_folder=f"/{item['name']}"):
                        size_kb = os.path.getsize(item_path) / 1024
                        print(f"    ✓ ({size_kb:.0f} KB)")
                        add_protocol_to_parse_script(item_name, proto["date"], proto["meet"])
                        downloaded_count += 1
                        downloaded_names.append(item_name)

    if downloaded_count == 0:
        print("\n⚠ Не удалось скачать ни одного нового протокола")
        return False

    print(f"\n✓ Загружено новых протоколов: {downloaded_count}")

    # ---- Phase 4: Run pipeline ----
    print("\n=== Запуск пайплайна ===")

    print("  Шаг 1: Парсинг PDF...")
    result = subprocess.run(
        [sys.executable, PARSE_SCRIPT],
        capture_output=True, text=True, cwd=REPO_ROOT
    )
    if result.returncode != 0:
        print(f"  [ERROR] parse_pdfs.py завершился с ошибкой:\n{result.stderr}")
        return False
    # Show last few lines of output
    lines = result.stdout.strip().split('\n')
    for line in lines[-10:]:
        print(f"    {line}")

    print("  Шаг 2: Дедупликация...")
    result = subprocess.run(
        [sys.executable, DEDUP_SCRIPT],
        capture_output=True, text=True, cwd=REPO_ROOT
    )
    if result.returncode != 0:
        print(f"  [ERROR] deduplicate.py завершился с ошибкой:\n{result.stderr}")
        return False
    lines = result.stdout.strip().split('\n')
    for line in lines[-10:]:
        print(f"    {line}")

    # ---- Phase 5: Report ----
    athletes_after, results_after = 0, 0
    if os.path.exists(DATA_JSON):
        with open(DATA_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        athletes_after = len(data)
        results_after = sum(len(a["results"]) for a in data)

    print(f"\n{'='*60}")
    print(f"ИТОГО:")
    print(f"  Спортсменов: {athletes_before} → {athletes_after} (+{athletes_after - athletes_before})")
    print(f"  Результатов: {results_before} → {results_after} (+{results_after - results_before})")
    print(f"  Новые протоколы: {', '.join(downloaded_names)}")

    # Save summary for CI
    summary = {
        "timestamp": datetime.now().isoformat(),
        "new_protocols": downloaded_names,
        "downloaded": downloaded_count,
        "athletes_before": athletes_before,
        "athletes_after": athletes_after,
        "results_before": results_before,
        "results_after": results_after,
    }
    summary_path = os.path.join(SCRIPTS_DIR, "update_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"\n  Сводка сохранена: {summary_path}")

    return True


if __name__ == "__main__":
    changed = main()
    # Exit 0 = changes found, 1 = no changes
    sys.exit(0 if changed else 1)
