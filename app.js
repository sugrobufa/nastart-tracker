/* ============================================
   НАСТАРТ Tracker — Application Logic
   ============================================ */

let athletesData = [];
let charts = {};
let currentAthlete = null;
let currentPoolFilter = 'all'; // 'all', 'LCM', 'SCM'

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
  
  if (!validResults.length) {
    // No medals yet
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
        <p class="glory-empty-sub">Первые медали появятся здесь после попадания в тройку призёров</p>
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
