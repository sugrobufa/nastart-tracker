#!/usr/bin/env python3
"""Parse НАСТАРТ PDF protocols. Uses pdfplumber for layout-based extraction,
with PyMuPDF multi-line parsing as fallback for PDFs with encoding issues."""

import json
import os
import re
import pdfplumber
import fitz  # PyMuPDF

PDF_DIR = "/home/user/workspace/pdf_protocols"
OUTPUT_FILE = "/home/user/workspace/pdf_parsed_results.json"

PROTOCOLS = [
    {"name": "2022_10_30_3tour", "date": "2022-10-30", "meet": "НАСТАРТ III тур 2022"},
    {"name": "2022_12_18_4tour", "date": "2022-12-18", "meet": "НАСТАРТ IV тур 2022"},
    {"name": "2023_03_19_1tour", "date": "2023-03-19", "meet": "НАСТАРТ I тур 2023"},
    {"name": "2023_05_21_2tour_7-8", "date": "2023-05-21", "meet": "НАСТАРТ II тур 2023"},
    {"name": "2023_05_21_2tour_9plus", "date": "2023-05-21", "meet": "НАСТАРТ II тур 2023"},
    {"name": "2023_10_29_3tour_7-8", "date": "2023-10-29", "meet": "НАСТАРТ III тур 2023"},
    {"name": "2023_10_29_3tour_9plus", "date": "2023-10-29", "meet": "НАСТАРТ III тур 2023"},
    {"name": "2023_12_24_4tour_7-8", "date": "2023-12-24", "meet": "НАСТАРТ IV тур 2023"},
    {"name": "2023_12_24_4tour_9plus", "date": "2023-12-24", "meet": "НАСТАРТ IV тур 2023"},
    {"name": "2024_03_17_1tour_7-8", "date": "2024-03-17", "meet": "НАСТАРТ I тур 2024"},
    {"name": "2024_03_17_1tour_9plus", "date": "2024-03-17", "meet": "НАСТАРТ I тур 2024"},
    {"name": "2024_05_19_2tour_7-8", "date": "2024-05-19", "meet": "НАСТАРТ II тур 2024"},
    {"name": "2024_05_19_2tour_9plus", "date": "2024-05-19", "meet": "НАСТАРТ II тур 2024"},
    {"name": "2025_12_14_4tour_7", "date": "2025-12-14", "meet": "НАСТАРТ IV тур 2025"},
    {"name": "2025_12_14_4tour_8plus", "date": "2025-12-14", "meet": "НАСТАРТ IV тур 2025"},
    # New protocols (downloaded from настарт.рф)
    {"name": "2024_10_27_3tour_7", "date": "2024-10-27", "meet": "НАСТАРТ III тур 2024"},
    {"name": "2024_10_27_3tour_8plus", "date": "2024-10-27", "meet": "НАСТАРТ III тур 2024"},
    {"name": "2025_03_16_1tour_7", "date": "2025-03-16", "meet": "НАСТАРТ I тур 2025"},
    {"name": "2025_03_16_1tour_8plus", "date": "2025-03-16", "meet": "НАСТАРТ I тур 2025"},
    {"name": "2025_05_18_2tour_7", "date": "2025-05-18", "meet": "НАСТАРТ II тур 2025"},
    {"name": "2025_05_18_2tour_8plus", "date": "2025-05-18", "meet": "НАСТАРТ II тур 2025"},
    {"name": "2025_10_19_3tour_7", "date": "2025-10-19", "meet": "НАСТАРТ III тур 2025"},
    {"name": "2025_10_19_3tour_8plus_s1", "date": "2025-10-19", "meet": "НАСТАРТ III тур 2025"},
    {"name": "2025_10_19_3tour_9plus", "date": "2025-10-19", "meet": "НАСТАРТ III тур 2025"},
    {"name": "2026_02_15_1tour", "date": "2026-02-15", "meet": "НАСТАРТ I тур 2026"},
    {"name": "2025_10_19_3tour_8plus", "date": "2025-10-19", "meet": "НАСТАРТ III тур 2025"},
    {"name": "2024_12_22_4tour_7", "date": "2024-12-22", "meet": "НАСТАРТ IV тур 2024"},
    {"name": "2024_12_22_4tour_8plus", "date": "2024-12-22", "meet": "НАСТАРТ IV тур 2024"},
]

def detect_pool_length(pdf_path):
    """Detect pool length (25m or 50m) from PDF header text.
    Returns 'SCM' for 25m, 'LCM' for 50m, None if unknown.
    Tries PyMuPDF first (more reliable for encoded PDFs), then pdfplumber."""
    texts = []
    
    # Try PyMuPDF first — better with encoding issues
    try:
        doc = fitz.open(pdf_path)
        for i in range(min(3, len(doc))):
            t = doc[i].get_text()
            if t:
                texts.append(t)
        doc.close()
    except:
        pass
    
    # Also try pdfplumber
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages[:3]:
                t = page.extract_text()
                if t:
                    texts.append(t)
    except:
        pass
    
    combined = '\n'.join(texts).lower()
    
    # Look for explicit pool length markers
    if re.search(r'бассейн\s+25\s*м', combined) or re.search(r'25\s*метр', combined):
        return 'SCM'
    if re.search(r'бассейн\s+50\s*м', combined) or re.search(r'50\s*метр', combined):
        return 'LCM'
    # Check for short/long course keywords
    if 'короткая вода' in combined or 'short course' in combined:
        return 'SCM'
    if 'длинная вода' in combined or 'long course' in combined:
        return 'LCM'
    
    return None


def detect_pool_name(pdf_path):
    """Detect pool/venue name from PDF header."""
    texts = []
    try:
        doc = fitz.open(pdf_path)
        for i in range(min(2, len(doc))):
            t = doc[i].get_text()
            if t:
                texts.append(t)
        doc.close()
    except:
        pass
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages[:2]:
                t = page.extract_text()
                if t:
                    texts.append(t)
    except:
        pass
    
    combined = '\n'.join(texts)
    
    # Known pool names
    if re.search(r'Акватория\s*ЗИЛ', combined, re.IGNORECASE):
        return 'Акватория «ЗИЛ»'
    if re.search(r'Янтарь', combined, re.IGNORECASE):
        return 'ДС «Янтарь»'
    if re.search(r'Олимпийск', combined, re.IGNORECASE):
        return 'Олимпийский'
    
    return None


STROKE_MAP = {
    "вольный стиль": ("Вольный стиль", "FREE"),
    "на спине": ("На спине", "BACK"),
    "брасс": ("Брасс", "BREAST"),
    "баттерфляй": ("Баттерфляй", "FLY"),
    "комплексное плавание": ("Комплексное плавание", "MEDLEY"),
    "комплексн.плавание": ("Комплексное плавание", "MEDLEY"),
    "комплекс": ("Комплексное плавание", "MEDLEY"),
}

def parse_time_to_seconds(time_str):
    time_str = time_str.strip()
    if ':' in time_str:
        parts = time_str.split(':')
        if len(parts) == 2:
            return round(int(parts[0]) * 60 + float(parts[1]), 2)
        elif len(parts) == 3:
            return round(int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2]), 2)
    return round(float(time_str), 2)

def format_time(time_sec):
    if time_sec >= 3600:
        h = int(time_sec // 3600)
        m = int((time_sec % 3600) // 60)
        s = time_sec % 60
        return f"{h:02d}:{m:02d}:{s:05.2f}"
    elif time_sec >= 60:
        m = int(time_sec // 60)
        s = time_sec % 60
        return f"00:{m:02d}:{s:05.2f}"
    else:
        return f"00:00:{time_sec:05.2f}"

def determine_gender(text):
    t = text.lower()
    if any(w in t for w in ["женщин", "девочк", "девушк", "юниорк"]):
        return "F"
    elif any(w in t for w in ["мужчин", "мальчик", "юнош", "юниор"]):
        return "M"
    return None

def extract_birth_year(s):
    s = s.strip()
    m = re.match(r'\d{2}\.\d{2}\.(\d{4})', s)
    if m:
        return int(m.group(1))
    m = re.match(r'(\d{4})', s)
    if m:
        return int(m.group(1))
    return None

def fix_name_case(name):
    if not name:
        return name
    if name == name.upper():
        parts = name.split('-')
        return '-'.join(p.capitalize() for p in parts)
    return name

# ============================================================
# Method 1: pdfplumber (single-line layout) - works for most PDFs
# ============================================================
def parse_pdfplumber(pdf_path, meta):
    """Parse using pdfplumber which gives layout-based single-line results."""
    results = []
    
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"
    
    # Check if text has Cyrillic
    cyrillic = sum(1 for c in full_text if '\u0400' <= c <= '\u04ff')
    if cyrillic < 50:
        return None  # Signal to use fallback
    
    lines = full_text.split('\n')
    
    current_gender = None
    current_distance = None
    current_stroke = None
    current_stroke_en = None
    last_place = 0
    
    event_pattern = re.compile(
        r'(\d+)m\s+(Вольный стиль|На спине|Брасс|Баттерфляй|Комплексное плавание|Комплексн\.плавание)',
        re.IGNORECASE
    )
    gender_words_re = re.compile(
        r'(Девочки|Девушки|Женщины|Мальчики|Юноши|Юниорки|Юниоры|Мужчины)', re.IGNORECASE
    )
    
    result_re = re.compile(
        r'^\s*(\d+)\.\s+'
        r'([А-ЯЁ][А-ЯЁа-яё\-]+)\s+'
        r'([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)\s+'
        r'(\d{2}\.\d{2}\.\d{4}|\d{4})\s+'
        r'(.+?)\s+'
        r'(\d{1,2}:\d{2}\.\d{2}|\d+\.\d{2})\s*'
        r'(\d+)?\s*'
    )
    dsq_re = re.compile(
        r'^\s*(DSQ|DNS)\s+'
        r'([А-ЯЁ][А-ЯЁа-яё\-]+)\s+'
        r'([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)\s+'
        r'(\d{2}\.\d{2}\.\d{4}|\d{4})\s*'
    )
    shared_re = re.compile(
        r'^\s*([А-ЯЁ][А-ЯЁа-яё\-]{2,})\s+'
        r'([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)\s+'
        r'(\d{2}\.\d{2}\.\d{4}|\d{4})\s+'
        r'(.+?)\s+'
        r'(\d{1,2}:\d{2}\.\d{2}|\d+\.\d{2})\s*'
        r'(\d+)?\s*'
    )
    
    skip_words = ['Splash Meet Manager', 'Registered to', 'Страница',
                  'Система автоматической', 'SEIKO', 'Бассейн', 'Место Фамилия',
                  'Очки:', 'FINA', 'AQUA']
    
    for line in lines:
        ls = line.strip()
        if not ls:
            continue
        
        em = event_pattern.search(ls)
        if em:
            current_distance = em.group(1)
            stroke_lower = em.group(2).lower()
            for key, (ru, en) in STROKE_MAP.items():
                if key in stroke_lower:
                    current_stroke = ru
                    current_stroke_en = en
                    break
            gm = gender_words_re.search(ls)
            if gm:
                g = determine_gender(gm.group(1))
                if g:
                    current_gender = g
            continue
        
        if any(skip in ls for skip in skip_words):
            continue
        if re.match(r'^\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)', ls):
            continue
        if re.match(r'^\d{2}\.\d{2}\.\d{4}\s+-\s+\d{2}:\d{2}', ls):
            continue
        if ls == "Результаты":
            continue
        if re.match(r'^Дистанция\s+\d+\s*$', ls):
            continue
        
        gm = gender_words_re.search(ls)
        if gm and not re.match(r'^\s*\d+\.', ls) and not re.match(r'^\s*(DSQ|DNS)', ls):
            if not re.search(r'\d{1,2}:\d{2}\.\d{2}\s+\d+\s*$', ls) and not re.search(r'\d{2}\.\d{2}\s+\d+\s*$', ls):
                g = determine_gender(gm.group(1))
                if g:
                    current_gender = g
                continue
        
        if re.match(r'^(\d{4})\s+и\s+старше', ls):
            continue
        
        if not current_distance or not current_stroke:
            continue
        
        rm = result_re.match(ls)
        if rm:
            place = int(rm.group(1))
            lastname = rm.group(2).strip()
            firstname = rm.group(3).strip()
            birth_year = extract_birth_year(rm.group(4))
            team = rm.group(5).strip()
            time_str = rm.group(6).strip()
            if birth_year is None:
                continue
            try:
                time_sec = parse_time_to_seconds(time_str)
                time_formatted = format_time(time_sec)
            except:
                continue
            last_place = place
            results.append({
                "lastname": fix_name_case(lastname),
                "firstname": fix_name_case(firstname),
                "birth_year": birth_year,
                "gender": current_gender or "U",
                "club": team,
                "meet": meta["meet"], "date": meta["date"],
                "distance": current_distance,
                "stroke": current_stroke, "stroke_en": current_stroke_en,
                "time": time_formatted, "time_sec": time_sec,
                "place": place, "status": "",
            })
            continue
        
        dm = dsq_re.match(ls)
        if dm:
            status = dm.group(1)
            lastname = dm.group(2).strip()
            firstname = dm.group(3).strip()
            birth_year = extract_birth_year(dm.group(4))
            if birth_year is None:
                continue
            results.append({
                "lastname": fix_name_case(lastname),
                "firstname": fix_name_case(firstname),
                "birth_year": birth_year,
                "gender": current_gender or "U",
                "club": "",
                "meet": meta["meet"], "date": meta["date"],
                "distance": current_distance,
                "stroke": current_stroke, "stroke_en": current_stroke_en,
                "time": "", "time_sec": 0,
                "place": 0, "status": status,
            })
            continue
        
        sm = shared_re.match(ls)
        if sm:
            lastname = sm.group(1).strip()
            firstname = sm.group(2).strip()
            birth_year = extract_birth_year(sm.group(3))
            team = sm.group(4).strip()
            time_str = sm.group(5).strip()
            if birth_year is None:
                continue
            try:
                time_sec = parse_time_to_seconds(time_str)
                time_formatted = format_time(time_sec)
            except:
                continue
            results.append({
                "lastname": fix_name_case(lastname),
                "firstname": fix_name_case(firstname),
                "birth_year": birth_year,
                "gender": current_gender or "U",
                "club": team,
                "meet": meta["meet"], "date": meta["date"],
                "distance": current_distance,
                "stroke": current_stroke, "stroke_en": current_stroke_en,
                "time": time_formatted, "time_sec": time_sec,
                "place": last_place, "status": "",
            })
            continue
    
    return results

# ============================================================
# Method 2: PyMuPDF multi-line parsing (for PDFs with encoding issues in pdfplumber)
# ============================================================
def parse_fitz_multiline(pdf_path, meta):
    """Parse using PyMuPDF which gives multi-line output (each field on separate line)."""
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    doc.close()
    
    # Check Cyrillic
    cyrillic = sum(1 for c in full_text if '\u0400' <= c <= '\u04ff')
    if cyrillic < 50:
        print(f"  -> WARNING: Even PyMuPDF has low Cyrillic ({cyrillic})")
        return []
    
    lines = full_text.split('\n')
    results = []
    
    current_gender = None
    current_distance = None
    current_stroke = None
    current_stroke_en = None
    
    event_pattern = re.compile(
        r'(\d+)m\s+(Вольный стиль|На спине|Брасс|Баттерфляй|Комплексное плавание|Комплексн\.плавание)',
        re.IGNORECASE
    )
    gender_words_re = re.compile(
        r'(Девочки|Девушки|Женщины|Мальчики|Юноши|Юниорки|Юниоры|Мужчины)', re.IGNORECASE
    )
    
    # In multi-line mode, a result looks like:
    # Line N: "1. LASTNAME Firstname"  (or "DSQ LASTNAME Firstname" or "DNS ...")
    # Line N+1: "YYYY" or "DD.MM.YYYY"
    # Line N+2: "Team name"
    # Line N+3: "HH:MM.SS" or "MM:SS.SS" or "SS.SS"  (time)
    # Line N+4: "NNN" (points)
    
    place_name_re = re.compile(
        r'^\s*(\d+)\.\s+([А-ЯЁ][А-ЯЁа-яё\-]+)\s+([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)\s*$'
    )
    dsq_name_re = re.compile(
        r'^\s*(DSQ|DNS)\s+([А-ЯЁ][А-ЯЁа-яё\-]+)\s+([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)\s*$'
    )
    shared_name_re = re.compile(
        r'^\s*([А-ЯЁ][А-ЯЁа-яё\-]{2,})\s+([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)\s*$'
    )
    birth_re = re.compile(r'^\s*(\d{2}\.\d{2}\.\d{4}|\d{4})\s*$')
    time_re = re.compile(r'^\s*(\d{1,2}:\d{2}\.\d{2}|\d+\.\d{2})\s*$')
    points_re = re.compile(r'^\s*(\d{1,4})\s*$')
    
    i = 0
    last_place = 0
    
    while i < len(lines):
        ls = lines[i].strip()
        
        if not ls:
            i += 1
            continue
        
        # Event header
        em = event_pattern.search(ls)
        if em:
            current_distance = em.group(1)
            stroke_lower = em.group(2).lower()
            for key, (ru, en) in STROKE_MAP.items():
                if key in stroke_lower:
                    current_stroke = ru
                    current_stroke_en = en
                    break
            gm = gender_words_re.search(ls)
            if gm:
                g = determine_gender(gm.group(1))
                if g:
                    current_gender = g
            i += 1
            continue
        
        # Gender line
        gm = gender_words_re.search(ls)
        if gm and not place_name_re.match(ls) and not dsq_name_re.match(ls):
            g = determine_gender(gm.group(1))
            if g:
                current_gender = g
            i += 1
            continue
        
        if not current_distance or not current_stroke:
            i += 1
            continue
        
        # Try place + name line
        pm = place_name_re.match(ls)
        if pm:
            place = int(pm.group(1))
            lastname = pm.group(2).strip()
            firstname = pm.group(3).strip()
            
            # Look ahead for birth year, team, time
            birth_year = None
            team = ""
            time_str = None
            
            j = i + 1
            # Next: birth year
            if j < len(lines) and birth_re.match(lines[j].strip()):
                birth_year = extract_birth_year(lines[j].strip())
                j += 1
            
            # Next: team (could be any text that's not a time or points)
            if j < len(lines):
                candidate = lines[j].strip()
                if candidate and not time_re.match(candidate) and not points_re.match(candidate):
                    team = candidate
                    j += 1
            
            # Next: time
            if j < len(lines) and time_re.match(lines[j].strip()):
                time_str = lines[j].strip()
                j += 1
            
            # Next: points (skip)
            if j < len(lines) and points_re.match(lines[j].strip()):
                j += 1
            
            if birth_year and time_str:
                try:
                    time_sec = parse_time_to_seconds(time_str)
                    time_formatted = format_time(time_sec)
                    last_place = place
                    results.append({
                        "lastname": fix_name_case(lastname),
                        "firstname": fix_name_case(firstname),
                        "birth_year": birth_year,
                        "gender": current_gender or "U",
                        "club": team,
                        "meet": meta["meet"], "date": meta["date"],
                        "distance": current_distance,
                        "stroke": current_stroke, "stroke_en": current_stroke_en,
                        "time": time_formatted, "time_sec": time_sec,
                        "place": place, "status": "",
                    })
                    i = j
                    continue
                except:
                    pass
            
            i += 1
            continue
        
        # Try DSQ/DNS
        dm = dsq_name_re.match(ls)
        if dm:
            status = dm.group(1)
            lastname = dm.group(2).strip()
            firstname = dm.group(3).strip()
            
            j = i + 1
            birth_year = None
            if j < len(lines) and birth_re.match(lines[j].strip()):
                birth_year = extract_birth_year(lines[j].strip())
                j += 1
            
            # Skip team
            if j < len(lines):
                candidate = lines[j].strip()
                if candidate and not time_re.match(candidate) and not points_re.match(candidate):
                    j += 1
            
            if birth_year:
                results.append({
                    "lastname": fix_name_case(lastname),
                    "firstname": fix_name_case(firstname),
                    "birth_year": birth_year,
                    "gender": current_gender or "U",
                    "club": "",
                    "meet": meta["meet"], "date": meta["date"],
                    "distance": current_distance,
                    "stroke": current_stroke, "stroke_en": current_stroke_en,
                    "time": "", "time_sec": 0,
                    "place": 0, "status": status,
                })
                i = j
                continue
            
            i += 1
            continue
        
        i += 1
    
    return results

def main():
    all_results = []
    
    for proto in PROTOCOLS:
        pdf_path = os.path.join(PDF_DIR, f"{proto['name']}.pdf")
        if not os.path.exists(pdf_path):
            print(f"[SKIP] {proto['name']}.pdf not found")
            continue
        
        print(f"[PARSING] {proto['name']}.pdf ({proto['meet']})...")
        
        # Detect pool length from PDF header
        pool_course = detect_pool_length(pdf_path)
        if pool_course is None:
            pool_course = 'LCM'  # Default fallback — most НАСТАРТ events are 50m
            print(f"  -> Pool length: UNKNOWN (defaulting to LCM/50m)")
        else:
            label = '25m' if pool_course == 'SCM' else '50m'
            print(f"  -> Pool length: {pool_course} ({label})")
        
        # Also detect pool name
        pool_name = detect_pool_name(pdf_path)
        if pool_name:
            print(f"  -> Pool: {pool_name}")
        
        # Try pdfplumber first
        results = parse_pdfplumber(pdf_path, proto)
        
        if results is None or len(results) == 0:
            # Fallback to PyMuPDF multi-line
            print(f"  -> pdfplumber failed/empty, trying PyMuPDF multi-line...")
            results = parse_fitz_multiline(pdf_path, proto)
        
        # Attach course and pool to each result
        for r in results:
            r['course'] = pool_course
            r['pool'] = pool_name or ''
        
        all_results.extend(results)
        print(f"  -> Extracted {len(results)} results")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"TOTAL RESULTS: {len(all_results)}")
    
    by_meet = {}
    for r in all_results:
        by_meet[r['meet']] = by_meet.get(r['meet'], 0) + 1
    for meet, count in sorted(by_meet.items()):
        print(f"  {meet}: {count}")
    
    athletes = set()
    for r in all_results:
        athletes.add((r['lastname'], r['firstname'], r['birth_year']))
    print(f"\nUNIQUE ATHLETES: {len(athletes)}")
    
    statuses = {}
    for r in all_results:
        s = r['status'] or 'OK'
        statuses[s] = statuses.get(s, 0) + 1
    print(f"STATUS DISTRIBUTION: {statuses}")
    
    # Show sample from each meet
    print(f"\nSAMPLES:")
    seen = set()
    for r in all_results:
        if r['meet'] not in seen and r['status'] == '':
            seen.add(r['meet'])
            print(f"  [{r['meet']}] {r['lastname']} {r['firstname']} ({r['birth_year']}) "
                  f"- {r['distance']}m {r['stroke']} - {r['time']} - place {r['place']}")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\nSaved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
