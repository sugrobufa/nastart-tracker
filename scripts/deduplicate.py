#!/usr/bin/env python3
"""
Deduplicate НАСТАРТ athletes and build golden records with club history.
"""

import json
import os
import re
from collections import defaultdict

LENEX_DATA = "/home/user/workspace/nastart_data.json"
PDF_DATA = "/home/user/workspace/pdf_parsed_results.json"
OUTPUT_FILE = "/home/user/workspace/nastart-tracker/data.json"

# ============================================================
# Club name normalization
# ============================================================
def normalize_club_name(name):
    """Normalize club name for display."""
    if not name:
        return ""
    s = name.strip().strip('"').strip("'").strip()
    
    # ШП variations -> "ШП №1"
    s = re.sub(r'(?i)школа\s+плавания\s*(?:№|#)\s*1', 'ШП №1', s)
    s = re.sub(r'ШП\s*№\s*1', 'ШП №1', s)
    
    # MURENA
    s = re.sub(r'(?i)MURENA\s+Lazarev\s+[Ss]wimming\s+[Cc]lub', 'MURENA Lazarev Swimming Club', s)
    
    # "Восточная лига" + trainer
    s = re.sub(r'^"?Восточная лига"?\s*', 'Восточная лига ', s)
    
    # МГ Сколково + trainer
    s = re.sub(r'^МГ\s+Сколково\s*', 'МГ Сколково ', s)
    
    # ПК Катюша
    s = re.sub(r'ПК\s*[«"]?Катюша[»"]?', 'ПК «Катюша»', s)
    
    # Normalize quotes: use «»
    s = s.replace('"', '«')
    if s.count('«') == 1 and '»' not in s:
        s += '»'
    
    # Normalize trainer initials at end of string
    # Pattern: "... Surname XX" or "... Surname X.X." or "... Surname X. X."
    # Goal: "... Surname X.X."
    m = re.search(r'([А-ЯЁ][а-яё]{1,20})\s+([А-ЯЁа-яё][А-ЯЁа-яё.\s,]{0,10})\s*$', s)
    if m:
        surname = m.group(1)
        raw_init = m.group(2)
        # Extract uppercase Cyrillic letters as initials
        letters = re.findall(r'[А-ЯЁ]', raw_init)
        if 1 <= len(letters) <= 3:
            initials = '.'.join(letters) + '.'
            prefix = s[:m.start()].rstrip()
            s = f"{prefix} {surname} {initials}" if prefix else f"{surname} {initials}"
    
    # Collapse spaces
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def normalize_pool_name(name):
    """Normalize pool name: unify quotes to «»."""
    if not name:
        return ''
    s = name.strip()
    # Remove all straight quotes first, then re-add as «»
    s = s.replace('«', '').replace('»', '').replace('"', '').strip()
    # Known pool names with proper formatting
    if 'ЗИЛ' in s:
        return 'Акватория «ЗИЛ»'
    if 'Янтарь' in s:
        return 'ДС «Янтарь»'
    return s


def club_canonical_key(name):
    """Aggressive key for grouping equivalent club names."""
    s = normalize_club_name(name).lower()
    s = re.sub(r'[^\w]', '', s)  # remove all non-alphanumeric
    return s


# ============================================================
# Step 1: Rebuild data from sources with club per result
# ============================================================
def build_from_sources():
    with open(LENEX_DATA, 'r') as f:
        lenex_athletes = json.load(f)
    
    MEET_MAP = {
        '"Настарт" I тур': 'НАСТАРТ I тур 2026',
        'Первенство "Настарт" IV тур': 'НАСТАРТ IV тур 2024',
    }
    
    all_records = []
    
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
    
    with open(PDF_DATA, 'r') as f:
        pdf_results = json.load(f)
    
    for pr in pdf_results:
        # Use course/pool from PDF auto-detection; fallback to LCM/Акватория ЗИЛ
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
    
    print(f"Total records from all sources: {len(all_records)}")
    return all_records


# ============================================================
# Step 2: Deduplicate
# ============================================================
def deduplicate(all_records):
    # Phase 1: Group by exact normalized (lastname, firstname)
    exact_groups = defaultdict(list)
    for rec in all_records:
        key = (rec['lastname'].strip().lower(), rec['firstname'].strip().lower())
        exact_groups[key].append(rec)
    
    print(f"Exact name groups: {len(exact_groups)}")
    
    # Phase 2: Merge patronymic duplicates
    # E.g., ("кашапова", "анастасия") + ("кашапова", "анастасия павловна") -> merged
    # Key: (lastname, first_word_of_firstname)
    short_groups = defaultdict(list)
    for (lname, fname), records in exact_groups.items():
        first_word = fname.split()[0]
        short_key = (lname, first_word)
        short_groups[short_key].append((fname, records))
    
    # Build final merged groups
    name_groups = {}
    patronymic_merges = 0
    for short_key, entries in short_groups.items():
        if len(entries) == 1:
            # No patronymic ambiguity
            fname, records = entries[0]
            name_groups[(short_key[0], fname)] = records
        else:
            # Multiple firstname variants for same lastname + first name
            # Check if they share birth year (±1) -> merge them
            # Collect all birth years across all entries
            all_years = set()
            for fname, records in entries:
                for r in records:
                    all_years.add(r['birth_year'])
            
            # If birth years are within ±2 range, merge all
            year_range = max(all_years) - min(all_years) if all_years else 0
            if year_range <= 2:
                # Merge all entries
                merged_records = []
                for fname, records in entries:
                    merged_records.extend(records)
                # Use the longest firstname as the canonical name
                best_fname = max([e[0] for e in entries], key=len)
                name_groups[(short_key[0], best_fname)] = merged_records
                patronymic_merges += len(entries) - 1
            else:
                # Different people with same first name but different ages
                for fname, records in entries:
                    name_groups[(short_key[0], fname)] = records
    
    print(f"Patronymic merges: {patronymic_merges}")
    print(f"Merged name groups: {len(name_groups)}")
    
    athletes = []
    total_merged = 0
    
    for (lname, fname), records in name_groups.items():
        records.sort(key=lambda r: r['birth_year'])
        
        # Cluster by birth year ±1
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
        
        if len(records) > len(clusters):
            total_merged += len(records) - len(clusters)
        
        for cluster in clusters:
            athletes.append(build_golden_record(cluster))
    
    print(f"Records merged: {total_merged}")
    print(f"Final athletes: {len(athletes)}")
    return athletes


def build_golden_record(records):
    # Best birthdate: prefer full date over year-only placeholder
    best_birthdate = records[0]['birthdate']
    for r in records:
        bd = r['birthdate']
        if not bd.endswith('-01-01') and best_birthdate.endswith('-01-01'):
            best_birthdate = bd
    
    # Gender: prefer non-U
    gender = 'U'
    for r in records:
        if r['gender'] != 'U':
            gender = r['gender']
            break
    
    # Name: prefer properly capitalized form, strip patronymic (keep only first word of firstname)
    lastname = records[0]['lastname']
    firstname = records[0]['firstname']
    for r in records:
        if r['lastname'] != r['lastname'].upper():
            lastname = r['lastname']
        # Prefer longest firstname that is properly capitalized (to get best quality name)
        candidate = r['firstname']
        if candidate != candidate.upper() and len(candidate) > len(firstname):
            firstname = candidate
        elif candidate != candidate.upper() and firstname == firstname.upper():
            firstname = candidate
    # Strip patronymic: keep only the first word (e.g. "Устинья Дмитриевна" -> "Устинья")
    firstname = firstname.split()[0] if firstname.strip() else firstname
    
    # Collect results with club, deduplicating
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
    
    # Build club history by year
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
    """Merge club name variations using canonical keys and short/long trainer names."""
    
    club_counts = defaultdict(int)
    for a in athletes:
        for r in a['results']:
            c = r.get('club', '')
            if c:
                club_counts[c] += 1
    
    # Phase 1: Group by canonical key (removes punctuation/case)
    groups = defaultdict(list)
    for club in club_counts:
        key = club_canonical_key(club)
        groups[key].append(club)
    
    mapping = {}
    merged_count = 0
    for key, variants in groups.items():
        if len(variants) > 1:
            best = max(variants, key=lambda v: club_counts[v])
            for v in variants:
                if v != best:
                    mapping[v] = best
                    merged_count += 1
    
    # Phase 2: Merge short trainer names with full ones
    # E.g., 'ШП №1 Степанова' -> 'ШП №1 Степанова П.С.'
    # Build index of clubs that end with initials
    long_forms = {}  # short_prefix -> (full_name, count)
    for club in club_counts:
        short = re.sub(r'\s+[\u0410-\u042f\u0401]\.[\u0410-\u042f\u0401]?\.\s*$', '', club).strip()
        if short != club and len(short) > 3:
            # This club has initials -> register it as a long form
            existing = long_forms.get(short)
            if not existing or club_counts[club] > existing[1]:
                long_forms[short] = (club, club_counts[club])
    
    short_merges = 0
    for short_name, (long_name, long_count) in long_forms.items():
        if short_name in club_counts and short_name not in mapping:
            # Merge short form into long form
            target = mapping.get(long_name, long_name)  # follow existing mapping
            mapping[short_name] = target
            short_merges += 1
    
    merged_count += short_merges
    print(f"Club normalizations: {merged_count} (incl. {short_merges} short->long trainer merges)")
    for old, new in sorted(mapping.items()):
        if club_counts[old] >= 2:
            print(f"  '{old}' ({club_counts[old]}) -> '{new}' ({club_counts[new]})")
    
    # Apply
    for a in athletes:
        for r in a['results']:
            c = r.get('club', '')
            if c in mapping:
                r['club'] = mapping[c]
        
        # Rebuild clubs and club_history
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
    multi_club = sum(1 for a in athletes if len(a.get('clubs', [])) > 1)
    multi_year = sum(1 for a in athletes if len(a.get('club_history', [])) > 1)
    
    print(f"\n{'='*60}")
    print(f"FINAL: {len(athletes)} athletes, {total_results} results")
    print(f"Athletes with multiple clubs: {multi_club}")
    print(f"Athletes with multi-year history: {multi_year}")
    
    # Examples
    print(f"\n=== EXAMPLES ===")
    shown = 0
    for a in athletes:
        if len(a.get('club_history', [])) >= 3 and len(a['clubs']) >= 2 and shown < 5:
            print(f"\n{a['lastname']} {a['firstname']} ({a['birthdate']}):")
            for ch in a['club_history']:
                print(f"  {ch['year']}: {', '.join(ch['clubs'])}")
            shown += 1
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(athletes, f, ensure_ascii=False, indent=2)
    
    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"\nSaved to {OUTPUT_FILE} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
