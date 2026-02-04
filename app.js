// app.js (fixed)

const CFG = window.DASH_CONFIG ?? {
  name: "Altay",
  lat: 41.8781,
  lon: -87.6298,
  timezone: "America/Chicago",
  use24h: true
};

function pad(n) { return String(n).padStart(2, "0"); }

function formatTime(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  if (CFG.use24h) return `${pad(h)}:${pad(m)}`;
  const hh = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hh}:${pad(m)} ${ampm}`;
}

function greetingForHour(h) {
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

function dateLine(d) {
  // MM/DD/YYYY · Day · HH:MM
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const yyyy = d.getFullYear();
  const day = d.toLocaleDateString(undefined, { weekday: "long" });
  return `${mm}/${dd}/${yyyy} · ${day} · ${formatTime(d)}`;
}

/* ---------- Line icons (no emojis) ---------- */

function iconChart() {
  return `
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 19V5"></path>
    <path d="M4 19h16"></path>
    <path d="M7 15l3-4 3 3 5-7"></path>
  </svg>`;
}

function iconWeek() {
  return `
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="2"></rect>
    <path d="M8 2v4M16 2v4M3 9h18"></path>
  </svg>`;
}

function wxText(code) {
  const m = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Fog",
    51: "Drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Rain", 63: "Rain", 65: "Heavy rain",
    71: "Snow", 73: "Snow", 75: "Heavy snow",
    80: "Showers", 81: "Showers", 82: "Showers",
    95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm"
  };
  return m[code] ?? "—";
}

function wxIcon(code) {
  const common = `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const kind =
    (code === 0 || code === 1) ? "sun" :
    (code === 2 || code === 3) ? "cloud" :
    (code === 45 || code === 48) ? "fog" :
    (code >= 51 && code <= 67) ? "rain" :
    (code >= 71 && code <= 77) ? "snow" :
    (code >= 80 && code <= 82) ? "rain" :
    (code >= 95) ? "storm" : "cloud";

  if (kind === "sun") return `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="4" ${common}></circle>
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" ${common}></path>
    </svg>`;

  if (kind === "fog") return `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 10h16M6 14h12M4 18h16" ${common}></path>
      <path d="M7 10a5 5 0 0 1 10 0" ${common}></path>
    </svg>`;

  if (kind === "rain") return `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7" ${common}></path>
      <path d="M8 20l1-2M12 20l1-2M16 20l1-2" ${common}></path>
    </svg>`;

  if (kind === "snow") return `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M7 17a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 17H7" ${common}></path>
      <path d="M9 20h.01M12 20h.01M15 20h.01" ${common}></path>
    </svg>`;

  if (kind === "storm") return `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7" ${common}></path>
      <path d="M13 13l-2 4h3l-2 4" ${common}></path>
    </svg>`;

  return `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7" ${common}></path>
    </svg>`;
}

/* ---------- Data loaders ---------- */

async function loadWeather(el) {
  const params = new URLSearchParams({
    latitude: String(CFG.lat),
    longitude: String(CFG.lon),
    timezone: CFG.timezone,
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit"
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error("Weather fetch failed");
  const d = await r.json();

  const cur = d.current;
  el.wxIcon.innerHTML = wxIcon(cur.weather_code);
  el.wxTemp.textContent = `${Math.round(cur.temperature_2m)}°`;
  el.wxDesc.textContent = wxText(cur.weather_code);

  el.wxHi.textContent = `${Math.round(d.daily.temperature_2m_max[0])}°`;
  el.wxLo.textContent = `${Math.round(d.daily.temperature_2m_min[0])}°`;

  renderWeek(el.week, d.daily);
}

function renderWeek(weekEl, daily) {
  weekEl.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const box = document.createElement("div");
    box.className = "day";

    const name = document.createElement("div");
    name.className = "dayName";
    name.textContent = new Date(daily.time[i]).toLocaleDateString(undefined, { weekday: "short" });

    const ic = document.createElement("div");
    ic.innerHTML = wxIcon(daily.weather_code[i]);

    const temps = document.createElement("div");
    temps.className = "dayTemps";
    temps.innerHTML =
      `<span>${Math.round(daily.temperature_2m_max[i])}°</span>
       <span class="lo">${Math.round(daily.temperature_2m_min[i])}°</span>`;

    box.append(name, ic, temps);
    weekEl.appendChild(box);
  }
}

function fmtPrice(v) {
  return (typeof v === "number" && Number.isFinite(v)) ? `$${v.toFixed(2)}` : "--";
}

async function loadMarkets(el) {
  // NOTE: this will only work on Netlify (or via "netlify dev" locally).
  const r = await fetch("/.netlify/functions/markets", { cache: "no-store" });
  if (!r.ok) throw new Error("Markets fetch failed");
  const d = await r.json();

  el.spy.textContent = fmtPrice(d?.symbols?.SPY?.price);
  el.iau.textContent = fmtPrice(d?.symbols?.IAU?.price);

  const t = d?.updated_iso ? new Date(d.updated_iso) : null;
  el.mktUpdated.textContent = t ? `Updated ${formatTime(t)}` : `Updated --`;
}

/* ---------- Top / refresh ---------- */

function updateTop(el) {
  const now = new Date();
  el.greeting.textContent = `${greetingForHour(now.getHours())}, ${CFG.name}!`;
  el.dateLine.textContent = dateLine(now);
  el.clock.textContent = formatTime(now);
}

function scheduleMinuteClock(el) {
  updateTop(el);
  const msToNextMinute = (60 - new Date().getSeconds()) * 1000 + 50;
  setTimeout(() => {
    updateTop(el);
    setInterval(() => updateTop(el), 60 * 1000);
  }, msToNextMinute);
}

/* ---------- Boot ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const el = {
    greeting: document.getElementById("greeting"),
    dateLine: document.getElementById("dateLine"),
    clock: document.getElementById("clock"),

    wxIcon: document.getElementById("wxIcon"),
    wxTemp: document.getElementById("wxTemp"),
    wxDesc: document.getElementById("wxDesc"),
    wxHi: document.getElementById("wxHi"),
    wxLo: document.getElementById("wxLo"),

    week: document.getElementById("week"),

    spy: document.getElementById("spy"),
    iau: document.getElementById("iau"),
    mktUpdated: document.getElementById("mktUpdated"),

    updated: document.getElementById("updated"),

    mktIcon: document.getElementById("mktIcon"),
    weekIcon: document.getElementById("weekIcon")
  };

  // Set header icons
  if (el.mktIcon) el.mktIcon.innerHTML = iconChart();
  if (el.weekIcon) el.weekIcon.innerHTML = iconWeek();

  scheduleMinuteClock(el);

  // Weather should work anywhere
  loadWeather(el).catch(() => { /* keep placeholders */ });

  // Markets only work on Netlify or netlify dev
  loadMarkets(el).catch(() => { /* keep placeholders */ });

  // Refresh data (e-ink friendly)
  setInterval(() => loadWeather(el).catch(() => {}), 30 * 60 * 1000);
  setInterval(() => loadMarkets(el).catch(() => {}), 30 * 60 * 1000);

  if (el.updated) el.updated.textContent = `Loaded ${formatTime(new Date())}`;
});
