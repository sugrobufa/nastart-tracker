/* ============================================
   НАСТАРТ Tracker — Application Logic
   ============================================ */

let athletesData = [];
let charts = {};
let currentAthlete = null;
let currentPoolFilter = 'all'; // 'all', 'LCM', 'SCM'

// --- ЕВСК Rank Standards ---
// Key: "gender|course|distance|stroke" -> [МСМК, МС, КМС, I, II, III, I(ю), II(ю), III(ю)] in seconds
const RANK_STANDARDS = {};
const RANK_ORDER = ['МСМК','МС','КМС','I','II','III','I(ю)','II(ю)','III(ю)'];
const RANK_LABELS = {
  'МСМК': 'МСМК', 'МС': 'МС', 'КМС': 'КМС',
  'I': 'I разряд', 'II': 'II разряд', 'III': 'III разряд',
  'I(ю)': 'I юн.', 'II(ю)': 'II юн.', 'III(ю)': 'III юн.'
};
const RANK_IS_YOUTH = { 'I(ю)': true, 'II(ю)': true, 'III(ю)': true };

// Load standards from embedded data
(function loadStandards() {
  const raw = {"M|SCM|50|Вольный стиль":[21.18,22.45,23.2,24.45,26.85,29.05,35.05,45.05,55.05],"M|SCM|100|Вольный стиль":[46.72,50,53.3,56.7,63.1,70.6,83.1,103.1,123.1],"M|SCM|200|Вольный стиль":[103.02,110.95,117.45,125.7,140.2,158.7,184.2,225,264.2],"M|SCM|400|Вольный стиль":[220.94,236,248.5,265,300,341,397,453,509],"M|SCM|800|Вольный стиль":[462.7,497,530,564,662,744,866,986,1106],"M|SCM|1500|Вольный стиль":[884.74,928.5,1026.5,1085,1227.5,1407.5,1650,1890,2130],"M|SCM|50|На спине":[23.29,25.89,27.35,29.35,32.05,35.55,41.55,51.55,61.55],"M|SCM|100|На спине":[52.54,57,60.4,64.4,72.6,81.1,93.6,116.1,136.1],"M|SCM|200|На спине":[112.45,124.75,131.45,139.2,156.2,176.2,204.2,250.2,290.2],"M|SCM|50|Брасс":[26.28,28.25,30,31.65,35.05,38.55,45.05,55.05,65.05],"M|SCM|100|Брасс":[57.34,63,66.9,71.4,80.1,88.1,104.1,123.1,143.1],"M|SCM|200|Брасс":[125.56,138.45,146.45,156.45,175.7,198.7,231.6,264.6,304.6],"M|SCM|50|Баттерфляй":[22.52,23.95,24.95,26.95,30.05,33.05,38.05,48.05,58.05],"M|SCM|100|Баттерфляй":[50.15,54,58,61.5,70.1,80.1,90.1,109.1,121.1],"M|SCM|200|Баттерфляй":[112.45,122.95,129.95,137.95,156.7,177.2,201.2,236.2,276.2],"M|SCM|100|Комплексное плавание":[52.57,56.5,61.5,65.5,73.6,83.6,94.6,113.6,133.6],"M|SCM|200|Комплексное плавание":[114.17,125.95,134.45,141.95,158.95,184.2,209.2,244.2,284.2],"M|SCM|400|Комплексное плавание":[246.68,268,283,302,343,391,446,502,558],"M|LCM|50|Вольный стиль":[21.91,23.2,23.95,25.2,27.6,29.8,35.8,45.8,55.8],"M|LCM|100|Вольный стиль":[48.25,51.5,54.9,58.3,64.6,72.1,84.6,104.6,124.6],"M|LCM|200|Вольный стиль":[106.5,113.95,120.65,128.95,143.2,161.7,187.2,227.2,267.2],"M|LCM|400|Вольный стиль":[227.71,242,254.5,271,306,347,403,459,515],"M|LCM|800|Вольный стиль":[472.6,505,538,577,674,756,878,998,1118],"M|LCM|1500|Вольный стиль":[906.19,951,1049,1109,1250,1430,1672,1912.5,2152.5],"M|LCM|50|На спине":[24.85,26.65,28.15,29.95,32.8,36.3,42.3,52.3,62.3],"M|LCM|100|На спине":[53.72,58.5,62,66,74.1,82.6,95.1,117.6,137.6],"M|LCM|200|На спине":[117.3,127.75,135.45,142.45,158.2,179.2,207.2,253.2,293.2],"M|LCM|50|Брасс":[27.22,29,30.5,32.4,35.8,39.3,45.8,55.8,65.8],"M|LCM|100|Брасс":[59.91,64.5,68.5,73,81.6,89.6,105.6,124.6,144.6],"M|LCM|200|Брасс":[129.97,141.45,149.45,159.45,178.7,201.7,238.7,267.2,307.2],"M|LCM|50|Баттерфляй":[23.27,24.7,25.7,27.7,30.8,33.8,38.8,48.8,58.8],"M|LCM|100|Баттерфляй":[51.62,55.5,59.5,63,71.6,81.6,91.6,110.6,130.6],"M|LCM|200|Баттерфляй":[116.23,125.95,133.95,140.95,159.7,180.2,204.2,239.2,279.2],"M|LCM|200|Комплексное плавание":[118.59,129.75,137.25,145.75,164,188,213,248,288],"M|LCM|400|Комплексное плавание":[253.76,274,288,307,348,397,452,508,564],"F|SCM|50|Вольный стиль":[24.13,25.75,26.55,27.85,30.55,32.55,39.55,49.55,59.05],"F|SCM|100|Вольный стиль":[52.68,56,60,63.84,71.4,79.1,93.1,113.1,132.1],"F|SCM|200|Вольный стиль":[115.02,123.45,131.75,140.45,156.2,174.2,205.2,245.2,283.2],"F|SCM|400|Вольный стиль":[243.32,260,270,292,334,378,449,520,591],"F|SCM|800|Вольный стиль":[503.99,540,570,611,702,795,960,1110,1260],"F|SCM|1500|Вольный стиль":[972.06,1032.5,1101.5,1204.5,1354.5,1557.5,1805,2050,2300],"F|SCM|50|На спине":[26.57,28.65,29.85,31.55,36.55,40.55,47.05,57.05,67.05],"F|SCM|100|На спине":[57.36,63.6,68.5,73,81.1,91.1,105.1,128.1,148.1],"F|SCM|200|На спине":[125.15,137.95,145.95,154.95,174.2,196.2,230.2,275.2,315.2],"F|SCM|50|Брасс":[30.04,32.45,34.25,35.95,40.05,44.05,51.55,61.55,71.55],"F|SCM|100|Брасс":[65.05,72,76,81,89.6,101.6,126.1,136.1,157.1],"F|SCM|200|Брасс":[141.34,154.45,163.45,173.95,194.2,219.6,256.6,291.6,333.2],"F|SCM|50|Баттерфляй":[25.62,27.3,28.45,30.95,33.55,36.55,43.55,53.55,63.55],"F|SCM|100|Баттерфляй":[57.16,61.5,65,69.5,79.1,90.1,102.1,121.1,141.1],"F|SCM|200|Баттерфляй":[127.15,136.95,144.45,154.45,175.2,198.2,225.2,261.2,301.2],"F|SCM|100|Комплексное плавание":[59.56,64.5,69.5,74.5,83.6,94.6,106.6,125.6,165.6],"F|SCM|200|Комплексное плавание":[128.11,140.95,149.45,158.95,179.2,205.2,234.2,270.2,310.2],"F|SCM|400|Комплексное плавание":[275.03,298,315.5,337,381,434,495,566,637],"F|LCM|50|Вольный стиль":[24.82,26.5,27.3,28.6,31.3,33.3,40.3,50.3,59.8],"F|LCM|100|Вольный стиль":[53.99,57.5,61.5,65.34,72.9,80.6,94.6,114.6,133.6],"F|LCM|200|Вольный стиль":[116.9,126.45,134.76,143.45,158.2,177.2,208.2,248.2,286.2],"F|LCM|400|Вольный стиль":[248.04,266,281,299,340,384,455,526,597],"F|LCM|800|Вольный стиль":[511.12,548,582,623,714,807,972,1122,1272],"F|LCM|1500|Вольный стиль":[980.88,1055,1124,1227,1377,1580,1827.5,2072.5,2322.5],"F|LCM|50|На спине":[28.05,29,30.7,32.3,37.3,41.3,47.8,57.8,67.8],"F|LCM|100|На спине":[59.8,66,70,74.5,82.6,92.6,106.6,129.6,149.6],"F|LCM|200|На спине":[129.77,140.95,148.95,157.95,177.2,199.2,233.2,278.2,318],"F|LCM|50|Брасс":[30.77,33.2,35,36.7,40.8,44.8,52.3,62.3,72.3],"F|LCM|100|Брасс":[66.88,73.5,77.5,82.5,91.1,103.1,127.6,137.6,158.6],"F|LCM|200|Брасс":[145.24,157.45,166.4,176.95,197.2,222.2,259.2,294.2,336.2],"F|LCM|50|Баттерфляй":[26.03,28.05,29.2,31.7,34.3,37.3,44.3,54.3,64.3],"F|LCM|100|Баттерфляй":[58.06,63,66.5,71,80.6,91.6,103.6,122.6,142.6],"F|LCM|200|Баттерфляй":[128.9,139.95,147.45,157.45,178.2,201.2,228.2,264.2,304.2],"F|LCM|200|Комплексное плавание":[132.12,144.75,153.25,162.75,183,209,238,274,314],"F|LCM|400|Комплексное плавание":[280.8,303,320.5,342,387,440,501,572,643]};
  Object.assign(RANK_STANDARDS, raw);
})();

// Determine rank for a single result
function getRankForResult(gender, course, distance, stroke, timeSec) {
  if (!timeSec || !gender || gender === 'U') return null;
  const g = gender === 'M' ? 'M' : 'F';
  const c = course === 'SCM' ? 'SCM' : 'LCM';
  const key = `${g}|${c}|${distance}|${stroke}`;
  const norms = RANK_STANDARDS[key];
  if (!norms) return null;
  // Find best rank where time <= norm
  for (let i = 0; i < norms.length; i++) {
    if (timeSec <= norms[i]) return RANK_ORDER[i];
  }
  return null;
}

// Get best rank across all results for an athlete
function getBestRank(athlete) {
  let bestIdx = RANK_ORDER.length; // worst possible
  let bestRankInfo = null;
  for (const r of athlete.results) {
    if (!r.time_sec) continue;
    const rank = getRankForResult(athlete.gender, r.course || 'LCM', r.distance, r.stroke, r.time_sec);
    if (!rank) continue;
    const idx = RANK_ORDER.indexOf(rank);
    if (idx < bestIdx) {
      bestIdx = idx;
      bestRankInfo = {
        rank,
        index: idx,
        isYouth: !!RANK_IS_YOUTH[rank],
        label: RANK_LABELS[rank],
        event: `${r.distance}м ${r.stroke}`,
        time: r.time,
        course: r.course || 'LCM',
        meet: r.meet,
        date: r.date,
      };
    }
  }
  return bestRankInfo;
}

// Get all ranks for an athlete (for detailed display)
function getAllRanks(athlete) {
  const ranks = [];
  for (const r of athlete.results) {
    if (!r.time_sec) continue;
    const rank = getRankForResult(athlete.gender, r.course || 'LCM', r.distance, r.stroke, r.time_sec);
    if (!rank) continue;
    ranks.push({
      rank,
      index: RANK_ORDER.indexOf(rank),
      isYouth: !!RANK_IS_YOUTH[rank],
      label: RANK_LABELS[rank],
      event: `${r.distance}м ${shortStroke(r.stroke)}`,
      time: r.time,
      course: r.course || 'LCM',
    });
  }
  return ranks;
}

// --- Theme Toggle ---
(function(){
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  r.setAttribute('data-theme', d);
  
  function updateIcon() {
    if (!t) return;
    t.innerHTML = d === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
  updateIcon();
  
  t && t.addEventListener('click', () => {
    d = d === 'dark' ? 'light' : 'dark';
    r.setAttribute('data-theme', d);
    updateIcon();
    if (currentAthlete) renderCharts(currentAthlete);
  });
})();

// --- Load Data ---
async function loadData() {
  try {
    const res = await fetch('data.json');
    athletesData = await res.json();
    document.getElementById('totalAthletes').textContent = athletesData.length;
    const allMeets = new Set();
    athletesData.forEach(a => a.results.forEach(r => allMeets.add(r.meet)));
    const meetsEl = document.getElementById('totalMeets');
    if (meetsEl) meetsEl.textContent = allMeets.size;
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

// --- Search ---
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearBtn');
const suggestionsEl = document.getElementById('suggestions');
let activeSuggestion = -1;

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  clearBtn.style.display = q ? 'flex' : 'none';
  
  if (q.length < 2) {
    hideSuggestions();
    return;
  }
  
  const matches = athletesData.filter(a => 
    a.lastname.toLowerCase().startsWith(q) ||
    (a.lastname + ' ' + a.firstname).toLowerCase().startsWith(q)
  ).slice(0, 15);
  
  showSuggestions(matches, q);
});

searchInput.addEventListener('keydown', (e) => {
  const items = suggestionsEl.querySelectorAll('.suggestion-item');
  if (!items.length) return;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeSuggestion = Math.min(activeSuggestion + 1, items.length - 1);
    updateActiveSuggestion(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeSuggestion = Math.max(activeSuggestion - 1, 0);
    updateActiveSuggestion(items);
  } else if (e.key === 'Enter' && activeSuggestion >= 0) {
    e.preventDefault();
    items[activeSuggestion].click();
  } else if (e.key === 'Escape') {
    hideSuggestions();
  }
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.style.display = 'none';
  hideSuggestions();
  hideResults();
  searchInput.focus();
});

function showSuggestions(matches, query) {
  if (!matches.length) {
    suggestionsEl.innerHTML = '<div class="suggestion-item" style="justify-content:center;cursor:default;color:var(--color-text-muted)">Спортсмен не найден</div>';
    suggestionsEl.classList.add('active');
    return;
  }
  
  activeSuggestion = -1;
  suggestionsEl.innerHTML = matches.map((a, i) => {
    const fullname = `${a.lastname} ${a.firstname}`;
    const highlighted = highlightMatch(fullname, query);
    const year = a.birthdate ? a.birthdate.split('-')[0] : '';
    const club = a.clubs[0] || '';
    const resultCount = a.results.length;
    return `<div class="suggestion-item" data-index="${athletesData.indexOf(a)}">
      <div>
        <div class="suggestion-name">${highlighted}</div>
        <div class="suggestion-meta">${year}${club ? ' · ' + truncate(club, 30) : ''}</div>
      </div>
      <div class="suggestion-meta">${resultCount} рез.</div>
    </div>`;
  }).join('');
  
  suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.index);
      if (isNaN(idx)) return;
      selectAthlete(athletesData[idx]);
      hideSuggestions();
    });
  });
  
  suggestionsEl.classList.add('active');
}

function hideSuggestions() {
  suggestionsEl.classList.remove('active');
  activeSuggestion = -1;
}

function updateActiveSuggestion(items) {
  items.forEach((item, i) => {
    item.classList.toggle('active', i === activeSuggestion);
  });
  if (activeSuggestion >= 0) {
    items[activeSuggestion].scrollIntoView({ block: 'nearest' });
  }
}

function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + query.length) + '</mark>' + text.slice(idx + query.length);
}

function truncate(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

// --- Select Athlete ---
function selectAthlete(athlete) {
  currentAthlete = athlete;
  currentPoolFilter = 'all';
  searchInput.value = `${athlete.lastname} ${athlete.firstname}`;
  clearBtn.style.display = 'flex';
  
  document.getElementById('athleteName').textContent = `${athlete.lastname} ${athlete.firstname}`;
  document.getElementById('athleteAvatar').textContent = athlete.lastname.charAt(0).toUpperCase();
  
  // Inline rank next to name
  const nameEl = document.getElementById('athleteName');
  const inlineRank = getBestRank(athlete);
  const existingInline = nameEl.parentElement.querySelector('.rank-inline');
  if (existingInline) existingInline.remove();
  if (inlineRank) {
    const rankCls = inlineRank.isYouth ? 'rank-inline--youth' : 'rank-inline--adult';
    let rankColorCls = 'rank-inline--iii';
    if (['МСМК','МС'].includes(inlineRank.rank)) rankColorCls = 'rank-inline--ms';
    else if (inlineRank.rank === 'КМС') rankColorCls = 'rank-inline--kms';
    else if (['I','I(ю)'].includes(inlineRank.rank)) rankColorCls = 'rank-inline--i';
    else if (['II','II(ю)'].includes(inlineRank.rank)) rankColorCls = 'rank-inline--ii';
    const span = document.createElement('span');
    span.className = `rank-inline ${rankCls} ${rankColorCls}`;
    span.textContent = inlineRank.label;
    nameEl.parentElement.appendChild(span);
  }
  
  const birthYear = athlete.birthdate ? athlete.birthdate.split('-')[0] : '—';
  document.getElementById('athleteBirth').querySelector('span').textContent = `${birthYear} г.р.`;
  document.getElementById('athleteGender').querySelector('span').textContent = athlete.gender === 'M' ? 'Мальчик' : 'Девочка';
  const currentClub = athlete.clubs[0] || '—';
  document.getElementById('athleteClub').querySelector('span').textContent = currentClub;
  
  renderClubHistory(athlete);
  
  // KPIs
  const meets = new Set(athlete.results.map(r => r.meet + r.date));
  const validResults = athlete.results.filter(r => r.time_sec);
  const strokes = new Set(validResults.map(r => r.stroke));
  const places = validResults.filter(r => r.place > 0).map(r => r.place);
  const bestPlace = places.length ? Math.min(...places) : null;
  
  document.getElementById('kpiMeets').textContent = meets.size;
  document.getElementById('kpiEvents').textContent = validResults.length;
  document.getElementById('kpiBestPlace').textContent = bestPlace ? bestPlace : '—';
  document.getElementById('kpiStrokes').textContent = strokes.size;
  
  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';
  
  renderPoolToggle(athlete);
  renderDistanceFilter(athlete);
  renderCharts(athlete);
  renderTable(athlete);
  renderGloryWall(athlete);
  
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Club History ---
function renderClubHistory(athlete) {
  const section = document.getElementById('clubHistorySection');
  const timeline = document.getElementById('clubHistoryTimeline');
  
  const history = athlete.club_history || [];
  const hasMultipleClubs = athlete.clubs && athlete.clubs.length > 1;
  const allClubSets = history.map(h => (h.clubs || []).sort().join('|'));
  const uniqueClubSets = new Set(allClubSets);
  const hasChangedClubs = uniqueClubSets.size > 1;
  const hasMultiClubYear = history.some(h => (h.clubs || []).length > 1);
  
  if (!hasMultipleClubs && !hasChangedClubs && !hasMultiClubYear) {
    section.style.display = 'none';
    return;
  }
  
  const sorted = [...history].sort((a, b) => a.year.localeCompare(b.year));
  
  timeline.innerHTML = sorted.map((entry, i) => {
    const clubs = entry.clubs || [];
    const isLast = i === sorted.length - 1;
    return `<div class="club-year ${isLast ? 'club-year--current' : ''}">
      <div class="club-year-marker">
        <div class="club-year-dot"></div>
        ${!isLast ? '<div class="club-year-line"></div>' : ''}
      </div>
      <div class="club-year-content">
        <div class="club-year-label">${entry.year}</div>
        <div class="club-year-items">
          ${clubs.map(c => `<span class="club-year-chip">${c}</span>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');
  
  section.style.display = 'block';
}

function hideResults() {
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('emptyState').style.display = 'block';
  currentAthlete = null;
}

// --- Pool Toggle (25m / 50m) ---
function renderPoolToggle(athlete) {
  const container = document.getElementById('poolToggle');
  if (!container) return;
  
  const validResults = athlete.results.filter(r => r.time_sec);
  const hasSCM = validResults.some(r => r.course === 'SCM');
  const hasLCM = validResults.some(r => r.course !== 'SCM');
  
  // Only show toggle if athlete has both pool types
  if (!hasSCM || !hasLCM) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  
  const scmCount = validResults.filter(r => r.course === 'SCM').length;
  const lcmCount = validResults.filter(r => r.course !== 'SCM').length;
  
  container.style.display = 'flex';
  container.innerHTML = `
    <button class="pool-btn ${currentPoolFilter === 'all' ? 'active' : ''}" data-pool="all">
      Все бассейны
    </button>
    <button class="pool-btn ${currentPoolFilter === 'LCM' ? 'active' : ''}" data-pool="LCM">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      50м <span class="pool-count">${lcmCount}</span>
    </button>
    <button class="pool-btn ${currentPoolFilter === 'SCM' ? 'active' : ''}" data-pool="SCM">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      25м <span class="pool-count">${scmCount}</span>
    </button>
  `;
  
  container.querySelectorAll('.pool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPoolFilter = btn.dataset.pool;
      container.querySelectorAll('.pool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Re-render distance filter and chart with pool filter
      renderDistanceFilter(athlete);
      renderProgressChart(athlete, getActiveDistanceFilter());
    });
  });
}

function getActiveDistanceFilter() {
  const active = document.querySelector('#distanceFilter button.active');
  return active ? active.dataset.filter : 'all';
}

// --- Distance Filter ---
function renderDistanceFilter(athlete) {
  const container = document.getElementById('distanceFilter');
  let results = athlete.results.filter(r => r.time_sec);
  
  // Apply pool filter
  if (currentPoolFilter !== 'all') {
    results = results.filter(r => (r.course || 'LCM') === currentPoolFilter);
  }
  
  const events = new Set();
  results.forEach(r => {
    events.add(`${r.distance}м ${r.stroke}`);
  });
  
  const eventsList = [...events].sort();
  container.innerHTML = '<button class="active" data-filter="all">Все</button>' +
    eventsList.map(e => `<button data-filter="${e}">${e}</button>`).join('');
  
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProgressChart(athlete, btn.dataset.filter);
    });
  });
}

// --- Charts ---
function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    primary: style.getPropertyValue('--color-primary').trim(),
    accent: style.getPropertyValue('--color-accent').trim(),
    text: style.getPropertyValue('--color-text').trim(),
    textMuted: style.getPropertyValue('--color-text-muted').trim(),
    textFaint: style.getPropertyValue('--color-text-faint').trim(),
    divider: style.getPropertyValue('--color-divider').trim(),
    surface: style.getPropertyValue('--color-surface').trim(),
    success: style.getPropertyValue('--color-success').trim(),
    error: style.getPropertyValue('--color-error').trim(),
    warning: style.getPropertyValue('--color-warning').trim(),
    gold: style.getPropertyValue('--color-gold').trim(),
  };
}

const STROKE_COLORS = {
  'Вольный стиль': '#0077b6',
  'На спине': '#00b4d8',
  'Брасс': '#48cae4',
  'Баттерфляй': '#90e0ef',
  'Комплексное плавание': '#023e8a',
};

function renderCharts(athlete) {
  renderProgressChart(athlete, 'all');
  renderPlaceChart(athlete);
  renderStrokeChart(athlete);
}

function renderProgressChart(athlete, filter) {
  const colors = getChartColors();
  const canvas = document.getElementById('progressChart');
  
  if (charts.progress) charts.progress.destroy();
  
  let results = athlete.results.filter(r => r.time_sec);
  
  // Apply pool filter
  if (currentPoolFilter !== 'all') {
    results = results.filter(r => (r.course || 'LCM') === currentPoolFilter);
  }
  
  // Group by event type
  const eventGroups = {};
  results.forEach(r => {
    const key = `${r.distance}м ${r.stroke}`;
    if (filter !== 'all' && key !== filter) return;
    if (!eventGroups[key]) eventGroups[key] = [];
    eventGroups[key].push(r);
  });
  
  const datasets = [];
  const colorKeys = Object.keys(STROKE_COLORS);
  let colorIdx = 0;
  
  Object.entries(eventGroups).forEach(([key, evResults]) => {
    evResults.sort((a, b) => a.date.localeCompare(b.date));
    const color = STROKE_COLORS[evResults[0].stroke] || colorKeys[colorIdx % colorKeys.length];
    colorIdx++;
    
    datasets.push({
      label: key,
      data: evResults.map(r => ({
        x: formatDate(r.date),
        y: r.time_sec,
        meet: r.meet,
        place: r.place,
        time: r.time,
        course: r.course || 'LCM',
        pool: r.pool || '',
      })),
      borderColor: color,
      backgroundColor: color + '30',
      pointBackgroundColor: evResults.map(r => r.course === 'SCM' ? color + '80' : color),
      pointBorderColor: evResults.map(r => r.course === 'SCM' ? '#f59e0b' : colors.surface),
      pointBorderWidth: evResults.map(r => r.course === 'SCM' ? 3 : 2),
      pointStyle: evResults.map(r => r.course === 'SCM' ? 'triangle' : 'circle'),
      pointRadius: 6,
      pointHoverRadius: 8,
      tension: 0.3,
      fill: false,
    });
  });
  
  // Pool legend
  const allRes = athlete.results.filter(r => r.time_sec);
  const hasAnySCM = allRes.some(r => r.course === 'SCM');
  const poolLegend = document.getElementById('poolLegend');
  if (poolLegend) poolLegend.style.display = (hasAnySCM && currentPoolFilter === 'all') ? 'flex' : 'none';
  
  // Chart subtitle
  const subtitle = currentPoolFilter === 'SCM' ? 'Бассейн 25м' : currentPoolFilter === 'LCM' ? 'Бассейн 50м' : '';
  
  charts.progress = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      plugins: {
        legend: {
          display: datasets.length > 1,
          position: 'top',
          labels: {
            color: colors.text,
            font: { family: "'Inter', sans-serif", size: 12 },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
          }
        },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.textMuted,
          borderColor: colors.divider,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: { family: "'Inter', sans-serif", weight: '600' },
          bodyFont: { family: "'Inter', sans-serif" },
          callbacks: {
            title: (items) => items[0]?.raw?.meet || '',
            label: (item) => {
              const d = item.raw;
              const poolLabel = d.course === 'SCM' ? '▲ 25м бассейн' : '50м бассейн';
              return [
                `Время: ${formatSeconds(d.y)}`,
                d.place > 0 ? `Место: ${d.place}` : '',
                poolLabel + (d.pool ? ` (${d.pool})` : ''),
              ].filter(Boolean);
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          grid: { color: colors.divider + '40' },
          ticks: {
            color: colors.textMuted,
            font: { family: "'Inter', sans-serif", size: 11 },
          }
        },
        y: {
          reverse: false,
          grid: { color: colors.divider + '40' },
          ticks: {
            color: colors.textMuted,
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (val) => formatSeconds(val),
          },
          title: {
            display: true,
            text: 'Время (ниже = быстрее)',
            color: colors.textMuted,
            font: { family: "'Inter', sans-serif", size: 11 },
          }
        }
      }
    }
  });
}

function renderPlaceChart(athlete) {
  const colors = getChartColors();
  const canvas = document.getElementById('placeChart');
  
  if (charts.place) charts.place.destroy();
  
  const places = athlete.results.filter(r => r.place > 0).map(r => r.place);
  const bins = { '1': 0, '2': 0, '3': 0, '4-10': 0, '10+': 0 };
  
  places.forEach(p => {
    if (p === 1) bins['1']++;
    else if (p === 2) bins['2']++;
    else if (p === 3) bins['3']++;
    else if (p <= 10) bins['4-10']++;
    else bins['10+']++;
  });
  
  const labels = [];
  const data = [];
  const bgColors = ['#ffd700', '#c0c0c0', '#cd7f32', colors.primary, colors.textFaint];
  const usedColors = [];
  
  Object.entries(bins).forEach(([label, count], i) => {
    if (count > 0) {
      labels.push(label === '1' ? '1 место' : label === '2' ? '2 место' : label === '3' ? '3 место' : label);
      data.push(count);
      usedColors.push(bgColors[i]);
    }
  });
  
  charts.place = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: usedColors,
        borderColor: colors.surface,
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: colors.text,
            font: { family: "'Inter', sans-serif", size: 12 },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
          }
        },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.textMuted,
          borderColor: colors.divider,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          bodyFont: { family: "'Inter', sans-serif" },
          callbacks: {
            label: (item) => ` ${item.label}: ${item.raw} раз`
          }
        }
      }
    }
  });
}

function renderStrokeChart(athlete) {
  const colors = getChartColors();
  const canvas = document.getElementById('strokeChart');
  
  if (charts.stroke) charts.stroke.destroy();
  
  const strokeCounts = {};
  athlete.results.filter(r => r.time_sec).forEach(r => {
    strokeCounts[r.stroke] = (strokeCounts[r.stroke] || 0) + 1;
  });
  
  const labels = Object.keys(strokeCounts);
  const data = Object.values(strokeCounts);
  const bgColors = labels.map(s => STROKE_COLORS[s] || colors.primary);
  
  charts.stroke = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.map(l => shortStroke(l)),
      datasets: [{
        data,
        backgroundColor: bgColors.map(c => c + 'cc'),
        borderColor: bgColors,
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.textMuted,
          borderColor: colors.divider,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          bodyFont: { family: "'Inter', sans-serif" },
          callbacks: {
            title: (items) => labels[items[0].dataIndex],
            label: (item) => ` ${item.raw} старт(ов)`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: colors.divider + '40' },
          ticks: {
            color: colors.textMuted,
            font: { family: "'Inter', sans-serif", size: 11 },
            stepSize: 1,
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: colors.text,
            font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
          }
        }
      }
    }
  });
}

// --- Glory Wall (Аллея славы) ---
function renderGloryWall(athlete) {
  const section = document.getElementById('glorySection');
  if (!section) return;
  
  const validResults = athlete.results.filter(r => r.time_sec && r.place >= 1 && r.place <= 3);
  const bestRank = getBestRank(athlete);
  
  if (!validResults.length && !bestRank) {
    // No medals and no rank
    section.style.display = 'block';
    section.innerHTML = `
      <div class="glory-empty">
        <div class="glory-empty-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="var(--color-border)" stroke-width="2" stroke-dasharray="6 3"/>
            <path d="M24 14v10l6 4" stroke="var(--color-text-faint)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="glory-empty-text">Победы ждут тебя впереди</p>
        <p class="glory-empty-sub">Первые медали и разряды появятся здесь</p>
      </div>
    `;
    return;
  }
  
  // Group medals by event
  const medals = validResults.sort((a, b) => a.date.localeCompare(b.date)).map(r => ({
    place: r.place,
    event: `${r.distance}м ${shortStroke(r.stroke)}`,
    meet: cleanMeetName(r.meet),
    date: formatDate(r.date),
    time: formatTime(r.time),
    course: r.course || 'LCM',
  }));
  
  const gold = medals.filter(m => m.place === 1).length;
  const silver = medals.filter(m => m.place === 2).length;
  const bronze = medals.filter(m => m.place === 3).length;
  
  // Rank badge HTML
  let rankBadgeHtml = '';
  if (bestRank) {
    const rankCls = bestRank.isYouth ? 'rank-badge--youth' : 'rank-badge--adult';
    const rankLevel = bestRank.rank.replace('(ю)', '').trim();
    // Determine specific rank class for color
    let rankColorCls = 'rank-badge--iii';
    if (['МСМК','МС'].includes(bestRank.rank)) rankColorCls = 'rank-badge--ms';
    else if (bestRank.rank === 'КМС') rankColorCls = 'rank-badge--kms';
    else if (['I','I(ю)'].includes(bestRank.rank)) rankColorCls = 'rank-badge--i';
    else if (['II','II(ю)'].includes(bestRank.rank)) rankColorCls = 'rank-badge--ii';
    else rankColorCls = 'rank-badge--iii';
    
    const poolLabel = bestRank.course === 'SCM' ? '25м' : '50м';
    rankBadgeHtml = `
      <div class="rank-showcase">
        <div class="rank-badge ${rankCls} ${rankColorCls}">
          <div class="rank-badge-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" fill="currentColor"/>
            </svg>
          </div>
          <div class="rank-badge-text">${bestRank.label}</div>
        </div>
        <div class="rank-details">
          <span class="rank-event">${bestRank.event.split(' ')[0] + ' ' + shortStroke(bestRank.event.split(' ').slice(1).join(' '))}</span>
          <span class="rank-sep">·</span>
          <span class="rank-time">${formatTime(bestRank.time)}</span>
          <span class="rank-sep">·</span>
          <span class="rank-pool">${poolLabel}</span>
        </div>
      </div>
    `;
  }
  
  // If only rank, no medals
  if (!validResults.length && bestRank) {
    section.style.display = 'block';
    section.innerHTML = `
      <div class="glory-wall">
        <div class="glory-header">
          <h3 class="glory-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2L9 8.5 2 9.5l5 5-1 7 6-3.5 6 3.5-1-7 5-5-7-1z" fill="var(--color-gold)" stroke="var(--color-gold)"/>
            </svg>
            Аллея славы
          </h3>
        </div>
        ${rankBadgeHtml}
        <div class="glory-empty" style="margin-top:16px">
          <p class="glory-empty-text">Медали впереди</p>
          <p class="glory-empty-sub">Попади в тройку призёров — и награды появятся здесь</p>
        </div>
      </div>
    `;
    return;
  }
  
  section.style.display = 'block';
  section.innerHTML = `
    <div class="glory-wall">
      <div class="glory-header">
        <h3 class="glory-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2L9 8.5 2 9.5l5 5-1 7 6-3.5 6 3.5-1-7 5-5-7-1z" fill="var(--color-gold)" stroke="var(--color-gold)"/>
          </svg>
          Аллея славы
        </h3>
        <div class="glory-summary">
          ${gold ? `<span class="glory-count glory-gold"><span class="medal-icon medal-gold">🥇</span>${gold}</span>` : ''}
          ${silver ? `<span class="glory-count glory-silver"><span class="medal-icon medal-silver">🥈</span>${silver}</span>` : ''}
          ${bronze ? `<span class="glory-count glory-bronze"><span class="medal-icon medal-bronze">🥉</span>${bronze}</span>` : ''}
        </div>
      </div>
      ${rankBadgeHtml}
      <div class="glory-medals">
        ${medals.map(m => {
          const placeLabel = m.place === 1 ? '1 место' : m.place === 2 ? '2 место' : '3 место';
          const medalClass = m.place === 1 ? 'medal-card--gold' : m.place === 2 ? 'medal-card--silver' : 'medal-card--bronze';
          const medalEmoji = m.place === 1 ? '🥇' : m.place === 2 ? '🥈' : '🥉';
          const poolBadge = m.course === 'SCM' ? '<span class="medal-pool medal-pool--scm">25м</span>' : '';
          return `<div class="medal-card ${medalClass}">
            <div class="medal-emoji">${medalEmoji}</div>
            <div class="medal-details">
              <div class="medal-place">${placeLabel}</div>
              <div class="medal-event">${m.event} ${poolBadge}</div>
              <div class="medal-time">${m.time}</div>
              <div class="medal-meet">${m.meet} · ${m.date}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// --- Table ---
function renderTable(athlete) {
  const tbody = document.getElementById('resultsBody');
  const results = athlete.results.filter(r => r.time_sec).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare !== 0 ? dateCompare : a.stroke.localeCompare(b.stroke);
  });
  
  const prevTimes = {};
  
  tbody.innerHTML = results.map(r => {
    const eventKey = `${r.distance}м ${r.stroke}`;
    const prev = prevTimes[eventKey];
    prevTimes[eventKey] = r.time_sec;
    
    let improvementHtml = '';
    if (prev !== undefined) {
      const diff = r.time_sec - prev;
      if (Math.abs(diff) >= 0.01) {
        const sign = diff < 0 ? '-' : '+';
        const cls = diff < 0 ? 'improvement-positive' : 'improvement-negative';
        improvementHtml = `<span class="improvement ${cls}">${sign}${Math.abs(diff).toFixed(2)}с</span>`;
      }
    }
    
    const placeClass = r.place === 1 ? 'place-1' : r.place === 2 ? 'place-2' : r.place === 3 ? 'place-3' : 'place-other';
    const placeText = r.place > 0 ? r.place : '—';
    
    const clubTd = r.club ? `<td class="club-cell">${truncate(r.club, 25)}</td>` : '<td class="club-cell">—</td>';
    
    const courseLabel = r.course === 'SCM' ? '25м' : '50м';
    const courseCls = r.course === 'SCM' ? 'course-scm' : 'course-lcm';
    
    return `<tr>
      <td>${formatDate(r.date)}</td>
      <td>${truncate(cleanMeetName(r.meet), 25)}</td>
      <td>${r.distance}м</td>
      <td>${shortStroke(r.stroke)}</td>
      <td class="time-cell">${formatTime(r.time)}${improvementHtml}</td>
      <td><span class="course-badge ${courseCls}">${courseLabel}</span></td>
      <td><span class="place-badge ${placeClass}">${placeText}</span></td>
      ${clubTd}
    </tr>`;
  }).join('');
}

// --- Helpers ---
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const match = timeStr.match(/(\d+):(\d+):(\d+\.\d+)/);
  if (!match) return timeStr;
  const [_, h, m, s] = match;
  if (parseInt(h) > 0) return `${h}:${m}:${s}`;
  if (parseInt(m) > 0) return `${m}:${s}`;
  return s;
}

function formatSeconds(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(2);
  if (m > 0) return `${m}:${s.padStart(5, '0')}`;
  return s;
}

function shortStroke(stroke) {
  const map = {
    'Вольный стиль': 'Вольный',
    'На спине': 'Спина',
    'Брасс': 'Брасс',
    'Баттерфляй': 'Баттер.',
    'Комплексное плавание': 'Комплекс',
  };
  return map[stroke] || stroke;
}

function cleanMeetName(name) {
  return name.replace(/"/g, '').replace(/Первенство\s*/i, '');
}

// Close suggestions on click outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) {
    hideSuggestions();
  }
});

// --- Init ---
loadData();
