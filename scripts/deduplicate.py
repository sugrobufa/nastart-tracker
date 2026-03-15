#!/usr/bin/env python3
"""
Deduplicate НАСТАРТ athletes and build golden records with club history.
Reads pdf_parsed_results.json, outputs data.json for the website.
"""

import json
import os
import re
from collections import defaultdict

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DATA = os.path.join(REPO_ROOT, "scripts", "pdf_parsed_results.json")
OUTPUT_FILE = os.path.join(REPO_ROOT, "data.json")

# Optional: LENEX data from настарт.рф (if present)
LENEX_DATA = os.path.join(REPO_ROOT, "scripts", "nastart_data.json")


# ============================================================
# Club name normalization
# ============================================================
def normalize_club_name(name):
    if not name:
        return ""
    s = name.strip().strip('"').strip("'").strip()
    s = re.sub(r'(?i)школа\s+плавания\s*(?:№|#)\s*1', 'ШП №1', s)
    s = re.sub(r'ШП\s*№\s*1', 'ШП №1', s)
    s = re.sub(r'(?i)MURENA\s+Lazarev\s+[Ss]wimming\s+[Cc]lub', 'MURENA Lazarev Swimming Club', s)
    s = re.sub(r'^"?Восточная лига"?\s*', 'Восточная лига ', s)
    s = re.sub(r'^МГ\s+Сколково\s*', 'МГ Сколково ', s)
    s = re.sub(r'ПК\s*[«"]?Катюша[»"]?', 'ПК «Катюша»', s)
    s = s.replace('"', '«')
    if s.count('«') == 1 and '»' not in s:
        s += '»'
    m = re.search(r'([А-ЯЁ][а-яё]{1,20})\s+([А-ЯЁа-яё][А-ЯЁа-яё.\s,]{0,10})\s*$', s)
    if m:
        surname = m.group(1)
        raw_init = m.group(2)
        letters = re.findall(r'[А-ЯЁ]', raw_init)
        if 1 <= len(letters) <= 3:
            initials = '.'.join(letters) + '.'
            prefix = s[:m.start()].rstrip()
            s = f"{prefix} {surname} {initials}" if prefix else f"{surname} {initials}"
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def normalize_pool_name(name):
    if not name:
        return ''
    s = name.strip()
    s = s.replace('«', '').replace('»', '').replace('"', '').strip()
    if 'ЗИЛ' in s:
        return 'Акватория «ЗИЛ»'
    if 'Янтарь' in s:
        return 'ДС «Янтарь»'
    return s


def club_canonical_key(name):
    s = normalize_club_name(name).lower()
    s = re.sub(r'[^\w]', '', s)
    return s


# ============================================================
# Step 1: Build records from sources
# ============================================================
def build_from_sources():
    all_records = []

    # LENEX data (optional)
    if os.path.exists(LENEX_DATA):
        with open(LENEX_DATA, 'r') as f:
            lenex_athletes = json.load(f)

        MEET_MAP = {
            '"Настарт" I тур': 'НАСТАРТ I тур 2026',
            'Первенство "Настарт" IV тур': 'НАСТАРТ IV тур 2024',
        }

        for a in lenex_athletes:
            birth_year = int(a['birthdate'][:4]) if a.get('birthdate') else 0
            club = a['clubs'][0] if a.get('clubs') else ''
            for r in a['results']:
                if r['meet'] in MEET_MAP:
                    r['meet'] = MEET_MAP[r['meet']]
                all_records.append({
                    'lastname': a['lastname'],
                    'firstname': a['firstname'],
                    'birthdate': a.get('birthdate', ''),
                    'birth_year': birth_year,
                    'gender': a.get('gender', 'U'),
                    'club': club,
                    'result': r,
                })
        print(f"LENEX records: {len(all_records)}")

    # PDF parsed data
    if os.path.exists(PDF_DATA):
        with open(PDF_DATA, 'r') as f:
            pdf_results = json.load(f)

        pdf_count = 0
        for pr in pdf_results:
            course = pr.get('course', 'LCM')
            pool = pr.get('pool', '') or 'Акватория «ЗИЛ»'
            result = {
                "meet": pr['meet'],
                "date": pr['date'],
                "city": "Москва",
                "course": course,
                "pool": pool,
                "distance": pr['distance'],
                "stroke": pr['stroke'],
                "stroke_en": pr['stroke_en'],
                "time": pr['time'],
                "time_sec": pr['time_sec'],
                "entry_time": "",
                "entry_time_sec": 0,
                "place": pr['place'],
                "status": pr['status'],
            }
            all_records.append({
                'lastname': pr['lastname'],
                'firstname': pr['firstname'],
                'birthdate': f"{pr['birth_year']}-01-01",
                'birth_year': pr['birth_year'],
                'gender': pr['gender'],
                'club': pr.get('club', ''),
                'result': result,
            })
            pdf_count += 1
        print(f"PDF records: {pdf_count}")

    print(f"Total records from all sources: {len(all_records)}")
    return all_records


# ============================================================
# Step 2: Deduplicate
# ============================================================
def deduplicate(all_records):
    exact_groups = defaultdict(list)
    for rec in all_records:
        key = (rec['lastname'].strip().lower(), rec['firstname'].strip().lower())
        exact_groups[key].append(rec)
    print(f"Exact name groups: {len(exact_groups)}")

    short_groups = defaultdict(list)
    for (lname, fname), records in exact_groups.items():
        first_word = fname.split()[0]
        short_key = (lname, first_word)
        short_groups[short_key].append((fname, records))

    name_groups = {}
    patronymic_merges = 0
    for short_key, entries in short_groups.items():
        if len(entries) == 1:
            fname, records = entries[0]
            name_groups[(short_key[0], fname)] = records
        else:
            all_years = set()
            for fname, records in entries:
                for r in records:
                    all_years.add(r['birth_year'])
            year_range = max(all_years) - min(all_years) if all_years else 0
            if year_range <= 2:
                merged_records = []
                for fname, records in entries:
                    merged_records.extend(records)
                best_fname = max([e[0] for e in entries], key=len)
                name_groups[(short_key[0], best_fname)] = merged_records
                patronymic_merges += len(entries) - 1
            else:
                for fname, records in entries:
                    name_groups[(short_key[0], fname)] = records

    print(f"Patronymic merges: {patronymic_merges}")
    print(f"Merged name groups: {len(name_groups)}")

    athletes = []
    for (lname, fname), records in name_groups.items():
        records.sort(key=lambda r: r['birth_year'])
        clusters = []
        for rec in records:
            merged = False
            for cluster in clusters:
                cluster_years = set(r['birth_year'] for r in cluster)
                if any(abs(rec['birth_year'] - cy) <= 1 for cy in cluster_years):
                    cluster.append(rec)
                    merged = True
                    break
            if not merged:
                clusters.append([rec])
        for cluster in clusters:
            athletes.append(build_golden_record(cluster))

    print(f"Final athletes: {len(athletes)}")
    return athletes


def build_golden_record(records):
    best_birthdate = records[0]['birthdate']
    for r in records:
        bd = r['birthdate']
        if not bd.endswith('-01-01') and best_birthdate.endswith('-01-01'):
            best_birthdate = bd

    gender = 'U'
    for r in records:
        if r['gender'] != 'U':
            gender = r['gender']
            break

    lastname = records[0]['lastname']
    firstname = records[0]['firstname']
    for r in records:
        if r['lastname'] != r['lastname'].upper():
            lastname = r['lastname']
        candidate = r['firstname']
        if candidate != candidate.upper() and len(candidate) > len(firstname):
            firstname = candidate
        elif candidate != candidate.upper() and firstname == firstname.upper():
            firstname = candidate

    seen = set()
    all_results = []
    for rec in records:
        result = rec['result']
        club = normalize_club_name(rec['club'])
        rk = (result['date'], result['distance'], result['stroke'],
              result.get('time_sec', 0), result.get('status', ''))
        if rk in seen:
            continue
        seen.add(rk)
        r_copy = dict(result)
        r_copy['club'] = club
        r_copy['pool'] = normalize_pool_name(r_copy.get('pool', ''))
        all_results.append(r_copy)

    all_results.sort(key=lambda r: r['date'])

    club_by_year = defaultdict(set)
    all_clubs = set()
    for r in all_results:
        c = r.get('club', '')
        if c:
            year = r['date'][:4]
            club_by_year[year].add(c)
            all_clubs.add(c)

    club_history = [{"year": y, "clubs": sorted(cs)} for y, cs in sorted(club_by_year.items())]

    return {
        "firstname": firstname,
        "lastname": lastname,
        "birthdate": best_birthdate,
        "gender": gender,
        "clubs": sorted(all_clubs),
        "club_history": club_history,
        "results": all_results,
    }


# ============================================================
# Step 3: Global club normalization
# ============================================================
def normalize_clubs_globally(athletes):
    club_counts = defaultdict(int)
    for a in athletes:
        for r in a['results']:
            c = r.get('club', '')
            if c:
                club_counts[c] += 1

    groups = defaultdict(list)
    for club in club_counts:
        key = club_canonical_key(club)
        groups[key].append(club)

    mapping = {}
    for key, variants in groups.items():
        if len(variants) > 1:
            best = max(variants, key=lambda v: club_counts[v])
            for v in variants:
                if v != best:
                    mapping[v] = best

    long_forms = {}
    for club in club_counts:
        short = re.sub(r'\s+[\u0410-\u042f\u0401]\.[\u0410-\u042f\u0401]?\.\s*$', '', club).strip()
        if short != club and len(short) > 3:
            existing = long_forms.get(short)
            if not existing or club_counts[club] > existing[1]:
                long_forms[short] = (club, club_counts[club])

    for short_name, (long_name, long_count) in long_forms.items():
        if short_name in club_counts and short_name not in mapping:
            target = mapping.get(long_name, long_name)
            mapping[short_name] = target

    for a in athletes:
        for r in a['results']:
            c = r.get('club', '')
            if c in mapping:
                r['club'] = mapping[c]
        cby = defaultdict(set)
        ac = set()
        for r in a['results']:
            c = r.get('club', '')
            if c:
                cby[r['date'][:4]].add(c)
                ac.add(c)
        a['clubs'] = sorted(ac)
        a['club_history'] = [{"year": y, "clubs": sorted(cs)} for y, cs in sorted(cby.items())]

    return athletes


def main():
    print("=== Step 1: Build from sources ===")
    all_records = build_from_sources()

    print("\n=== Step 2: Deduplicate ===")
    athletes = deduplicate(all_records)

    print("\n=== Step 3: Global club normalization ===")
    athletes = normalize_clubs_globally(athletes)

    athletes.sort(key=lambda a: (a['lastname'], a['firstname']))

    total_results = sum(len(a['results']) for a in athletes)
    print(f"\nFINAL: {len(athletes)} athletes, {total_results} results")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(athletes, f, ensure_ascii=False, indent=2)

    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"Saved to {OUTPUT_FILE} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
