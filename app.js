/* ============================================
   НАСТАРТ Tracker — Application Logic
   ============================================ */

let athletesData = [];
let charts = {};
let currentAthlete = null;
let currentPoolFilter = 'all'; // 'all', 'LCM', 'SCM'

// --- Leaderboard & Progress state ---
let leaderboardCache = {};   // keyed by "gender|ageGroup|course|event"
let progressCache = {};      // keyed by "period|stroke"
let ratingCache = {};        // keyed by "gender|ageGroup" -> sorted athlete array

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
  const raw = {"M|SCM|50|Вольный стиль":[21.18,22.45,23.2,24.45,26.85,29.05,35.05,45.05,55.05],"M|SCM|100|Вольный стиль":[46.72,50,53.3,56.7,63.1,70.6,83.1,103.1,123.1],"M|SCM|200|Вольный стиль":[103.02,110.95,117.45,125.7,140.2,158.7,184.2,225,264.2],"M|SCM|400|Вольный стиль":[220.94,236,248.5,265,300,341,397,453,509],"M|SCM|800|Вольный стиль":[462.7,497,530,564,662,744,866,986,1106],"M|SCM|1500|Вольный стиль":[884.74,928.5,1026.5,1085,1227.5,1407.5,1650,1890,2130],"M|SCM|50|На спине":[23.29,25.89,27.35,29.35,32.05,35.55,41.55,51.55,61.55],"M|SCM|100|На спине":[52.54,57,60.4,64.4,72.6,81.1,93.6,116.1,136.1],"M|SCM|200|На спине":[112.45,124.75,131.45,139.2,156.2,176.2,204.2,250.2,290.2],"M|SCM|50|Брасс":[26.28,28.25,30,31.65,35.05,38.55,45.05,55.05,65.05],"M|SCM|100|Брасс":[57.34,63,66.9,71.4,80.1,88.1,104.1,123.1,143.1],"M|SCM|200|Брасс":[125.56,138.45,146.45,156.45,175.7,198.7,231.6,264.6,304.6],"M|SCM|50|Баттерфляй":[22.52,23.95,24.95,26.95,30.05,33.05,38.05,48.05,58.05],"M|SCM|100|Баттерфляй":[50.15,54,58,61.5,70.1,80.1,90.1,109.1,121.1],"M|SCM|200|Баттерфляй":[112.45,122.95,129.95,137.95,156.7,177.2,201.2,236.2,276.2],"M|SCM|100|Комплексное плавание":[52.57,56.5,61.5,65.5,73.6,83.6,94.6,113.6,133.6],"M|SCM|200|Комплексное плавание":[114.17,125.95,134.45,141.95,158.95,184.2,209.2,244.2,284.2],"M|SCM|400|Комплексное плавание":[246.68,268,283,302,343,391,446,502,558],"M|LCM|50|Вольный стиль":[21.91,23.2,23.95,25.2,27.6,29.8,35.8,45.8,55.8],"M|LCM|100|Вольный стиль":[48.25,51.5,54.9,58.3,64.6,72.1,84.6,104.6,124.6],"M|LCM|200|Вольный стиль":[106.5,113.95,120.65,128.95,143.2,161.7,187.2,227.2,267.2],"M|LCM|400|Вольный стиль":[227.71,242,254.5,271,306,347,403,459,515],"M|LCM|800|Вольный стиль":[472.6,505,538,577,674,756,878,998,1118],"M|LCM|1500|Вольный стиль":[906.19,951,1049,1109,1250,1430,1672,1912.5,2152.5],"M|LCM|50|На спине":[24.85,26.65,28.15,29.95,32.8,36.3,42.3,52.3,62.3],"M|LCM|100|На спине":[53.72,58.5,62,66,74.1,82.6,95.1,117.6,137.6],"M|LCM|200|На спине":[115.84,127.95,134.75,142.7,159.7,179.7,207.7,253.7,293.7],"M|LCM|50|Брасс":[27.14,29.15,30.9,32.65,36.05,39.55,46.05,56.05,66.05],"M|LCM|100|Брасс":[59.52,65,68.9,73.4,82.1,90.1,106.1,125.1,145.1],"M|LCM|200|Брасс":[129.7,142.45,150.45,160.45,179.7,202.7,235.6,268.6,308.6],"M|LCM|50|Баттерфляй":[23.27,24.75,25.75,27.75,30.85,33.85,38.85,48.85,58.85],"M|LCM|100|Баттерфляй":[51.83,55.5,59.5,63,71.6,81.6,91.6,110.6,122.6],"M|LCM|200|Баттерфляй":[116.02,126.95,133.95,141.95,160.7,181.2,205.2,240.2,280.2],"M|LCM|100|Комплексное плавание":[54.55,58.5,63.5,67.5,75.6,85.6,96.6,115.6,135.6],"M|LCM|200|Комплексное плавание":[118.35,129.95,138.45,145.95,162.95,188.2,213.2,248.2,288.2],"M|LCM|400|Комплексное плавание":[254.49,276,291,310,351,399,454,510,566],"F|SCM|50|Вольный стиль":[23.88,25.65,27.05,28.95,31.85,35.05,41.55,51.55,61.55],"F|SCM|100|Вольный стиль":[52.43,56.5,60.2,64.4,71.6,80.1,93.1,113.1,133.1],"F|SCM|200|Вольный стиль":[113.14,121.95,129.45,137.7,155.2,173.7,200.7,240.7,280.7],"F|SCM|400|Вольный стиль":[242.18,256,270.5,290,328,370,428,490,548],"F|SCM|800|Вольный стиль":[502.66,537,572,612,716,802,930,1060,1190],"F|SCM|1500|Вольный стиль":[960.68,1012,1105,1168,1320,1512,1770,2010,2250],"F|SCM|50|На спине":[26.72,28.95,30.55,32.55,36.05,39.55,46.05,56.05,66.05],"F|SCM|100|На спине":[57.46,63.5,67.4,71.4,80.6,90.1,104.1,128.1,148.1],"F|SCM|200|На спине":[123.14,138.75,145.95,153.7,173.2,196.2,228.2,268.2,308.2],"F|SCM|50|Брасс":[30.02,32.25,34.1,36.15,39.85,43.55,50.05,60.05,70.05],"F|SCM|100|Брасс":[65.18,71,75.3,80.4,90.1,100.1,116.1,140.1,160.1],"F|SCM|200|Брасс":[141.52,155.95,164.45,175.45,197.2,222.7,258.6,298.6,338.6],"F|SCM|50|Баттерфляй":[25.42,26.95,28.45,30.45,33.55,37.05,43.05,53.05,63.05],"F|SCM|100|Баттерфляй":[56.52,61,65,69.5,78.1,88.1,100.1,120.1,140.1],"F|SCM|200|Баттерфляй":[124.76,137.95,145.45,154.45,174.7,199.2,226.2,266.2,306.2],"F|SCM|100|Комплексное плавание":[58.51,63.5,68.5,72.5,82.6,93.6,106.6,126.6,146.6],"F|SCM|200|Комплексное плавание":[126.59,139.95,149.45,157.45,177.95,207.2,234.2,270.2,310.2],"F|SCM|400|Комплексное плавание":[272.68,296,312,333,378,430,492,554,616],"F|LCM|50|Вольный стиль":[24.63,26.45,27.85,29.75,32.6,35.8,42.3,52.3,62.3],"F|LCM|100|Вольный стиль":[54.01,58,61.7,65.9,73.1,81.6,94.6,114.6,134.6],"F|LCM|200|Вольный стиль":[116.72,125.45,132.95,141.2,158.7,177.2,204.2,244.2,284.2],"F|LCM|400|Вольный стиль":[249.45,262,276.5,296,334,376,434,496,554],"F|LCM|800|Вольный стиль":[517.38,549,584,624,728,814,942,1072,1202],"F|LCM|1500|Вольный стиль":[982.64,1034,1127,1192,1342,1534,1792,2032,2272],"F|LCM|50|На спине":[27.56,29.85,31.45,33.45,36.95,40.45,46.95,56.95,66.95],"F|LCM|100|На спине":[59.15,65,69,73,82.1,91.6,105.6,129.6,149.6],"F|LCM|200|На спине":[126.76,142.45,149.55,157.3,176.8,199.8,231.8,271.8,311.8],"F|LCM|50|Брасс":[31.22,33.45,35.3,37.35,41.05,44.75,51.25,61.25,71.25],"F|LCM|100|Брасс":[67.62,73,77.3,82.4,92.1,102.1,118.1,142.1,162.1],"F|LCM|200|Брасс":[146.04,159.95,168.45,179.45,201.2,226.7,262.6,302.6,342.6],"F|LCM|50|Баттерфляй":[25.99,27.75,29.25,31.25,34.35,37.85,43.85,53.85,63.85],"F|LCM|100|Баттерфляй":[58.37,62.5,66.5,71,79.6,89.6,101.6,121.6,141.6],"F|LCM|200|Баттерфляй":[128.64,141.95,149.45,158.45,178.7,203.2,230.2,270.2,310.2],"F|LCM|100|Комплексное плавание":[60.83,65.5,70.5,74.5,84.6,95.6,108.6,128.6,148.6],"F|LCM|200|Комплексное плавание":[130.65,143.95,153.45,161.45,181.95,211.2,238.2,274.2,314.2],"F|LCM|400|Комплексное плавание":[280.87,304,320,341,386,438,500,562,624]};
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

// --- Age Group Helpers ---
const AGE_GROUPS = [
  { id: '2015+', label: '2015 и мл.', test: (y) => y >= 2015 },
  { id: '2013-2014', label: '2013-2014', test: (y) => y >= 2013 && y <= 2014 },
  { id: '2011-2012', label: '2011-2012', test: (y) => y >= 2011 && y <= 2012 },
  { id: '2009-2010', label: '2009-2010', test: (y) => y >= 2009 && y <= 2010 },
  { id: '2008-', label: '2008 и ст.', test: (y) => y <= 2008 },
];

function getAthleteYear(a) {
  if (!a.birthdate) return null;
  return parseInt(a.birthdate.split('-')[0]);
}

function getAgeGroupId(year) {
  if (!year) return null;
  for (const g of AGE_GROUPS) {
    if (g.test(year)) return g.id;
  }
  return null;
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
    
    // Build caches and render dashboard
    buildLeaderboardCache();
    buildProgressCache();
    buildRatingCache();
    populateEventSelect();
    renderLeaderboard();
    renderProgress();
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

// ============================================
// LEADERBOARD LOGIC
// ============================================

function buildLeaderboardCache() {
  leaderboardCache = {};
  
  for (const athlete of athletesData) {
    const year = getAthleteYear(athlete);
    if (!year) continue;
    const ageGroup = getAgeGroupId(year);
    if (!ageGroup) continue;
    const gender = athlete.gender;
    if (!gender || gender === 'U') continue;
    
    // Find best time per event PER COURSE for this athlete
    const bestTimes = {}; // key: "course|distance|stroke" -> {time_sec, time, ...}
    for (const r of athlete.results) {
      if (!r.time_sec) continue;
      const course = r.course || 'LCM';
      const evKey = `${course}|${r.distance}|${r.stroke}`;
      if (!bestTimes[evKey] || r.time_sec < bestTimes[evKey].time_sec) {
        bestTimes[evKey] = {
          time_sec: r.time_sec,
          time: r.time,
          date: r.date,
          meet: r.meet,
          course: course,
          distance: r.distance,
          stroke: r.stroke,
        };
      }
    }
    
    for (const [evKey, best] of Object.entries(bestTimes)) {
      const eventLabel = `${best.distance}м ${best.stroke}`;
      
      // Cache keyed by course: "gender|ageGroup|course|event"
      const cacheKey = `${gender}|${ageGroup}|${best.course}|${eventLabel}`;
      if (!leaderboardCache[cacheKey]) leaderboardCache[cacheKey] = [];
      leaderboardCache[cacheKey].push({
        name: `${athlete.lastname} ${athlete.firstname}`,
        year: year,
        time_sec: best.time_sec,
        time: best.time,
        course: best.course,
        event: eventLabel,
        athleteIndex: athletesData.indexOf(athlete),
      });
    }
  }
  
  // Sort each cache entry by time
  for (const key of Object.keys(leaderboardCache)) {
    leaderboardCache[key].sort((a, b) => a.time_sec - b.time_sec);
  }
}

function getLeaderboard(gender, ageGroup, course, eventFilter) {
  if (eventFilter) {
    const key = `${gender}|${ageGroup}|${course}|${eventFilter}`;
    return (leaderboardCache[key] || []).slice(0, 15);
  }
  
  // "All events": for each athlete, show their best time across any event for this course
  const prefix = `${gender}|${ageGroup}|${course}|`;
  const athleteBest = {};
  for (const [key, entries] of Object.entries(leaderboardCache)) {
    if (!key.startsWith(prefix)) continue;
    for (const e of entries) {
      if (!athleteBest[e.athleteIndex] || e.time_sec < athleteBest[e.athleteIndex].time_sec) {
        athleteBest[e.athleteIndex] = e;
      }
    }
  }
  
  return Object.values(athleteBest)
    .sort((a, b) => a.time_sec - b.time_sec)
    .slice(0, 15);
}

function populateEventSelect() {
  const select = document.getElementById('leaderEventSelect');
  if (!select) return;
  
  // Get all unique events
  const events = new Set();
  for (const a of athletesData) {
    for (const r of a.results) {
      if (r.time_sec) events.add(`${r.distance}м ${r.stroke}`);
    }
  }
  
  const sorted = [...events].sort((a, b) => {
    const da = parseInt(a), db = parseInt(b);
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });
  
  select.innerHTML = '<option value="">Все дистанции</option>' +
    sorted.map(e => `<option value="${e}">${e.replace('Вольный стиль','Вольный').replace('На спине','Спина').replace('Баттерфляй','Баттер.').replace('Комплексное плавание','Комплекс')}</option>`).join('');
}

function renderLeaderboard() {
  const genderToggle = document.getElementById('leaderGenderToggle');
  const ageToggle = document.getElementById('leaderAgeToggle');
  const courseToggle = document.getElementById('leaderCourseToggle');
  const eventSelect = document.getElementById('leaderEventSelect');
  const tbody = document.getElementById('leaderboardBody');
  if (!tbody) return;
  
  const gender = genderToggle.querySelector('.toggle-btn.active')?.dataset.value || 'M';
  const ageGroup = ageToggle.querySelector('.toggle-btn.active')?.dataset.value || '2015+';
  const course = courseToggle?.querySelector('.toggle-btn.active')?.dataset.value || 'LCM';
  const eventFilter = eventSelect.value || '';
  
  const leaders = getLeaderboard(gender, ageGroup, course, eventFilter);
  
  if (!leaders.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="lb-empty">Нет данных для выбранной группы</td></tr>';
    return;
  }
  
  tbody.innerHTML = leaders.map((entry, i) => {
    const rankClass = i === 0 ? 'lb-rank--gold' : i === 1 ? 'lb-rank--silver' : i === 2 ? 'lb-rank--bronze' : '';
    const evShort = entry.event.replace('Вольный стиль','Вольный').replace('На спине','Спина').replace('Баттерфляй','Баттер.').replace('Комплексное плавание','Компл.');
    return `<tr class="lb-row" data-athlete-index="${entry.athleteIndex}">
      <td class="col-rank"><span class="lb-rank ${rankClass}">${i + 1}</span></td>
      <td class="col-name">
        <span class="lb-name">${entry.name}</span>
        <span class="lb-year">${entry.year} г.р.</span>
        <span class="lb-event-mobile">${evShort}</span>
      </td>
      <td class="col-event">${evShort}</td>
      <td class="col-time"><span class="lb-time">${formatTime(entry.time)}</span></td>
    </tr>`;
  }).join('');
  
  // Make rows clickable
  tbody.querySelectorAll('.lb-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.athleteIndex);
      if (!isNaN(idx) && athletesData[idx]) {
        selectAthlete(athletesData[idx]);
      }
    });
  });
}

// ============================================
// PROGRESS RANKING LOGIC
// ============================================

function buildProgressCache() {
  progressCache = {};
  
  // For each athlete, for each event, calculate real improvement.
  // KEY FIX: Skip the very first race in each event (children's first races are often
  // extremely slow and create false huge "improvements"). Require at least 2 results
  // on distinct dates AFTER the first race.
  for (const athlete of athletesData) {
    if (!athlete.gender || athlete.gender === 'U') continue;
    
    // Group results by event
    const eventResults = {};
    for (const r of athlete.results) {
      if (!r.time_sec) continue;
      const evKey = `${r.distance}м ${r.stroke}`;
      if (!eventResults[evKey]) eventResults[evKey] = [];
      eventResults[evKey].push(r);
    }
    
    for (const [evKey, results] of Object.entries(eventResults)) {
      // Sort by date
      const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date));
      
      // Get distinct competition dates
      const distinctDates = [...new Set(sorted.map(r => r.date))];
      
      // Need at least 3 distinct dates total (so after dropping the first date, 
      // we still have 2+ dates to compare old vs new)
      if (distinctDates.length < 3) continue;
      
      // Drop results from the very first competition date (first-race effect)
      const firstDate = distinctDates[0];
      const usable = sorted.filter(r => r.date !== firstDate);
      if (usable.length < 2) continue;
      
      const latest = usable[usable.length - 1];
      const latestDate = new Date(latest.date);
      
      for (const period of ['quarter', 'year']) {
        const daysBack = period === 'quarter' ? 90 : 365;
        const cutoff = new Date(latestDate);
        cutoff.setDate(cutoff.getDate() - daysBack);
        
        // Find best time in the older period (before cutoff)
        let bestOlder = null;
        for (const r of usable) {
          const d = new Date(r.date);
          if (d < cutoff && r.time_sec > 0) {
            if (!bestOlder || r.time_sec < bestOlder.time_sec) {
              bestOlder = r;
            }
          }
        }
        
        // Fallback: find a result at least daysBack/2 old
        if (!bestOlder) {
          const halfCutoff = new Date(latestDate);
          halfCutoff.setDate(halfCutoff.getDate() - Math.floor(daysBack / 2));
          for (const r of usable) {
            const d = new Date(r.date);
            if (d <= halfCutoff && r !== latest && r.time_sec > 0) {
              if (!bestOlder || r.time_sec < bestOlder.time_sec) {
                bestOlder = r;
              }
            }
          }
        }
        
        if (!bestOlder) continue;
        
        // Find best time in recent results (after cutoff)
        let bestRecent = null;
        for (const r of usable) {
          const d = new Date(r.date);
          if (d >= cutoff && r.time_sec > 0) {
            if (!bestRecent || r.time_sec < bestRecent.time_sec) {
              bestRecent = r;
            }
          }
        }
        
        if (!bestRecent) continue;
        
        const improvement = bestOlder.time_sec - bestRecent.time_sec;
        if (improvement <= 0) continue;
        
        // Cap max improvement at 50% to filter remaining outliers
        const improvementPct = improvement / bestOlder.time_sec;
        if (improvementPct > 0.50) continue;
        
        const stroke = results[0].stroke;
        const cacheKey = `${period}|${stroke}`;
        const cacheKeyAll = `${period}|`;
        
        const entry = {
          name: `${athlete.lastname} ${athlete.firstname}`,
          year: getAthleteYear(athlete),
          event: evKey,
          improvement: improvement,
          oldTime: bestOlder.time,
          newTime: bestRecent.time,
          oldTimeSec: bestOlder.time_sec,
          newTimeSec: bestRecent.time_sec,
          oldCourse: bestOlder.course || 'LCM',
          newCourse: bestRecent.course || 'LCM',
          athleteIndex: athletesData.indexOf(athlete),
        };
        
        if (!progressCache[cacheKey]) progressCache[cacheKey] = [];
        progressCache[cacheKey].push(entry);
        if (!progressCache[cacheKeyAll]) progressCache[cacheKeyAll] = [];
        progressCache[cacheKeyAll].push(entry);
      }
    }
  }
  
  // Deduplicate: keep only best improvement per athlete per cache key
  for (const key of Object.keys(progressCache)) {
    const byAthlete = {};
    for (const e of progressCache[key]) {
      if (!byAthlete[e.athleteIndex] || e.improvement > byAthlete[e.athleteIndex].improvement) {
        byAthlete[e.athleteIndex] = e;
      }
    }
    progressCache[key] = Object.values(byAthlete).sort((a, b) => b.improvement - a.improvement);
  }
}

function getProgress(period, stroke) {
  const key = `${period}|${stroke}`;
  return (progressCache[key] || []).slice(0, 15);
}

function renderProgress() {
  const periodToggle = document.getElementById('progressPeriodToggle');
  const strokeToggle = document.getElementById('progressStrokeToggle');
  const tbody = document.getElementById('progressBody');
  if (!tbody) return;
  
  const period = periodToggle.querySelector('.toggle-btn.active')?.dataset.value || 'year';
  const stroke = strokeToggle.querySelector('.toggle-btn.active')?.dataset.value || '';
  
  const entries = getProgress(period, stroke);
  
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="lb-empty">Нет данных о прогрессе</td></tr>';
    return;
  }
  
  tbody.innerHTML = entries.map((entry, i) => {
    const rankClass = i === 0 ? 'lb-rank--gold' : i === 1 ? 'lb-rank--silver' : i === 2 ? 'lb-rank--bronze' : '';
    const evShort = entry.event.replace('Вольный стиль','Вольный').replace('На спине','Спина').replace('Баттерфляй','Баттер.').replace('Комплексное плавание','Компл.');
    const improveSec = entry.improvement.toFixed(2);
    return `<tr class="lb-row" data-athlete-index="${entry.athleteIndex}">
      <td class="col-rank"><span class="lb-rank ${rankClass}">${i + 1}</span></td>
      <td class="col-name">
        <span class="lb-name">${entry.name}</span>
        <span class="lb-year">${entry.year ? entry.year + ' г.р.' : ''}</span>
        <span class="lb-event-mobile">${evShort}</span>
      </td>
      <td class="col-event">${evShort}</td>
      <td class="col-progress"><span class="progress-badge">-${improveSec}с</span></td>
    </tr>`;
  }).join('');
  
  // Make rows clickable
  tbody.querySelectorAll('.lb-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.athleteIndex);
      if (!isNaN(idx) && athletesData[idx]) {
        selectAthlete(athletesData[idx]);
      }
    });
  });
}

// ============================================
// RATING CACHE (for per-athlete position)
// ============================================

function buildRatingCache() {
  ratingCache = {};
  
  // For each gender+ageGroup+course+event, rank athletes by best time
  // Cache key format is now "gender|ageGroup|course|event"
  
  for (const [key, entries] of Object.entries(leaderboardCache)) {
    const parts = key.split('|');
    if (parts.length < 4) continue;
    ratingCache[key] = entries.map((e, i) => ({
      ...e,
      position: i + 1,
      total: entries.length,
    }));
  }
}

function getAthleteRating(athlete) {
  const year = getAthleteYear(athlete);
  if (!year) return null;
  const ageGroup = getAgeGroupId(year);
  if (!ageGroup || !athlete.gender || athlete.gender === 'U') return null;
  
  const athleteIdx = athletesData.indexOf(athlete);
  
  // Find best rating position across all events and courses
  // ratingCache keys: "gender|ageGroup|course|event"
  let bestPosition = null;
  let bestTotal = 0;
  let bestEvent = '';
  let bestCourse = 'LCM';
  
  for (const [key, entries] of Object.entries(ratingCache)) {
    if (!key.startsWith(`${athlete.gender}|${ageGroup}|`)) continue;
    const found = entries.find(e => e.athleteIndex === athleteIdx);
    if (found && (!bestPosition || found.position < bestPosition)) {
      bestPosition = found.position;
      bestTotal = found.total;
      const parts = key.split('|');
      bestCourse = parts[2];
      bestEvent = parts.slice(3).join('|');
    }
  }
  
  if (!bestPosition) return null;
  
  return {
    position: bestPosition,
    total: bestTotal,
    event: bestEvent,
    course: bestCourse,
    ageGroup: AGE_GROUPS.find(g => g.id === ageGroup)?.label || ageGroup,
  };
}

// Calculate monthly change: compare current position vs position a month ago
function getAthleteRatingChange(athlete) {
  const year = getAthleteYear(athlete);
  if (!year) return 0;
  const ageGroup = getAgeGroupId(year);
  if (!ageGroup || !athlete.gender || athlete.gender === 'U') return 0;
  
  const athleteIdx = athletesData.indexOf(athlete);
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthAgoStr = monthAgo.toISOString().split('T')[0];
  
  // Find the event where athlete has best current position
  let currentBestPos = Infinity;
  let currentBestEvent = null;
  
  for (const [key, entries] of Object.entries(ratingCache)) {
    if (!key.startsWith(`${athlete.gender}|${ageGroup}|`)) continue;
    const found = entries.find(e => e.athleteIndex === athleteIdx);
    if (found && found.position < currentBestPos) {
      currentBestPos = found.position;
      currentBestEvent = key;
    }
  }
  
  if (!currentBestEvent || currentBestPos === Infinity) return 0;
  
  // Simulate: recalculate rankings excluding results from after a month ago
  // For simplicity, check if athlete had any results in the last month that improved their time
  // Key format: "gender|ageGroup|course|event"
  const keyParts = currentBestEvent.split('|');
  const event = keyParts.slice(3).join('|');
  const eventParts = event.match(/^(\d+)м (.+)$/);
  if (!eventParts) return 0;
  const distance = eventParts[1];
  const stroke = eventParts[2];
  
  // Check if athlete had improvement in last month
  const athleteResults = athlete.results.filter(r => 
    r.time_sec && r.distance === distance && r.stroke === stroke
  ).sort((a, b) => a.date.localeCompare(b.date));
  
  if (athleteResults.length < 2) return 0;
  
  const recentResults = athleteResults.filter(r => r.date >= monthAgoStr);
  const olderResults = athleteResults.filter(r => r.date < monthAgoStr);
  
  if (!recentResults.length || !olderResults.length) return 0;
  
  const bestRecent = Math.min(...recentResults.map(r => r.time_sec));
  const bestOlder = Math.min(...olderResults.map(r => r.time_sec));
  
  if (bestRecent < bestOlder) return 1;  // improved → position went up
  if (bestRecent > bestOlder) return -1; // worsened → position went down
  return 0;
}

// ============================================
// TOGGLE/UI WIRING FOR DASHBOARD
// ============================================

function setupDashboardToggles() {
  // Leaderboard gender toggle
  setupToggle('leaderGenderToggle', renderLeaderboard);
  // Leaderboard age group toggle
  setupToggle('leaderAgeToggle', renderLeaderboard);
  // Leaderboard course toggle (short/long pool)
  setupToggle('leaderCourseToggle', renderLeaderboard);
  // Leaderboard event select
  const eventSelect = document.getElementById('leaderEventSelect');
  if (eventSelect) {
    eventSelect.addEventListener('change', renderLeaderboard);
  }
  // Progress period toggle
  setupToggle('progressPeriodToggle', renderProgress);
  // Progress stroke toggle
  setupToggle('progressStrokeToggle', renderProgress);
}

function setupToggle(containerId, callback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callback();
    });
  });
}

// --- Search ---
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearBtn');
const suggestionsEl = document.getElementById('suggestions');
let activeSuggestion = -1;

// Prevent parent frame (e.g. Perplexity embed) from intercepting search input events
['click', 'focus', 'touchstart', 'touchend', 'mousedown', 'pointerdown'].forEach(evt => {
  searchInput.addEventListener(evt, (e) => {
    e.stopPropagation();
  });
});

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
  
  // Rating position
  renderAthleteRating(athlete);
  
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
  document.getElementById('homeDashboard').style.display = 'none';
  
  renderPoolToggle(athlete);
  renderDistanceFilter(athlete);
  renderCharts(athlete);
  renderTable(athlete);
  renderGloryWall(athlete);
  
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Athlete Rating Display ---
function renderAthleteRating(athlete) {
  const ratingEl = document.getElementById('athleteRating');
  if (!ratingEl) return;
  
  const rating = getAthleteRating(athlete);
  if (!rating) {
    ratingEl.style.display = 'none';
    return;
  }
  
  const change = getAthleteRatingChange(athlete);
  let changeHtml = '';
  if (change > 0) {
    changeHtml = '<span class="rating-arrow rating-arrow--up">&#9650;</span>';
  } else if (change < 0) {
    changeHtml = '<span class="rating-arrow rating-arrow--down">&#9660;</span>';
  }
  
  const evShort = rating.event.replace('Вольный стиль','Вольный').replace('На спине','Спина').replace('Баттерфляй','Баттер.').replace('Комплексное плавание','Компл.');
  ratingEl.querySelector('span').innerHTML = `#${rating.position} ${changeHtml} <span class="rating-detail">${rating.ageGroup}, ${evShort}</span>`;
  ratingEl.style.display = 'inline-flex';
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
  document.getElementById('homeDashboard').style.display = 'block';
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
              const poolLabel = d.course === 'SCM' ? '25м бассейн (к)' : '50м бассейн';
              const timeMark = d.course === 'SCM' ? ' (к)' : '';
              return [
                `Время: ${formatSeconds(d.y)}${timeMark}`,
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
          <span class="rank-time">${formatTime(bestRank.time)}${bestRank.course === 'SCM' ? '<span class="short-pool-mark">(к)</span>' : ''}</span>
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
          const medalPoolMark = m.course === 'SCM' ? '<span class="short-pool-mark">(к)</span>' : '';
          return `<div class="medal-card ${medalClass}">
            <div class="medal-emoji">${medalEmoji}</div>
            <div class="medal-details">
              <div class="medal-place">${placeLabel}</div>
              <div class="medal-event">${m.event} ${poolBadge}</div>
              <div class="medal-time">${m.time}${medalPoolMark}</div>
              <div class="medal-meet">${m.meet} · ${m.date}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// --- Table ---
let tableFilterYear = '';
let tableFilterEvent = '';

function populateTableFilters(athlete) {
  const results = athlete.results.filter(r => r.time_sec);
  
  // Year filter: extract unique years from dates
  const years = [...new Set(results.map(r => r.date.split('-')[0]))].sort();
  const dateSelect = document.getElementById('filterDate');
  dateSelect.innerHTML = '<option value="">Все годы</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join('');
  dateSelect.value = tableFilterYear;
  
  // Event filter: group by distance + stroke
  const events = [...new Set(results.map(r => `${r.distance}м ${r.stroke}`))].sort((a, b) => {
    const da = parseInt(a), db = parseInt(b);
    return da !== db ? da - db : a.localeCompare(b);
  });
  const eventSelect = document.getElementById('filterEvent');
  eventSelect.innerHTML = '<option value="">Все дистанции</option>' +
    events.map(e => `<option value="${e}">${e}</option>`).join('');
  eventSelect.value = tableFilterEvent;
  
  // Event listeners (remove old, add new)
  dateSelect.onchange = () => {
    tableFilterYear = dateSelect.value;
    renderTableRows(athlete);
  };
  eventSelect.onchange = () => {
    tableFilterEvent = eventSelect.value;
    renderTableRows(athlete);
  };
}

function renderTable(athlete) {
  tableFilterYear = '';
  tableFilterEvent = '';
  populateTableFilters(athlete);
  renderTableRows(athlete);
}

function renderTableRows(athlete) {
  const tbody = document.getElementById('resultsBody');
  let results = athlete.results.filter(r => r.time_sec).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare !== 0 ? dateCompare : a.stroke.localeCompare(b.stroke);
  });
  
  // Apply filters
  if (tableFilterYear) {
    results = results.filter(r => r.date.startsWith(tableFilterYear));
  }
  if (tableFilterEvent) {
    results = results.filter(r => `${r.distance}м ${r.stroke}` === tableFilterEvent);
  }
  
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
    const shortPoolMark = r.course === 'SCM' ? '<span class="short-pool-mark">(к)</span>' : '';
    
    const eventStr = `${r.distance}м ${shortStroke(r.stroke)}`;
    return `<tr>
      <td>${formatDate(r.date)}</td>
      <td class="col-meet">${truncate(cleanMeetName(r.meet), 25)}</td>
      <td class="col-ev">${eventStr}</td>
      <td class="time-cell">${formatTime(r.time)}${shortPoolMark}${improvementHtml}</td>
      <td class="col-course"><span class="course-badge ${courseCls}">${courseLabel}</span></td>
      <td class="col-place"><span class="place-badge ${placeClass}">${placeText}</span></td>
      ${clubTd}
    </tr>`;
  }).join('');
  
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--color-text-muted)">Нет результатов для выбранных фильтров</td></tr>';
  }
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
setupDashboardToggles();
