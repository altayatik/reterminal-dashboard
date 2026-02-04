// app.js — SenseCraft-friendly (static JSON), Chicago-locked time, cache-first paint
// Expects these DOM ids in index.html:
// greeting, dateLine, clock, wxIcon, wxTemp, wxDesc, wxHi, wxLo, week,
// spy, iau, mktUpdated, updated, mktIcon, weekIcon

const CFG = window.DASH_CONFIG ?? {
  name: "Altay",
  lat: 41.8781,
  lon: -87.6298,
  timezone: "America/Chicago",
  use24h: true
};

const LS_WEATHER = "dash_weather_static_v1";
const LS_MARKETS = "dash_markets_static_v1";

const WEATHER_URL = "./data/weather.json";
const MARKETS_URL = "./data/markets.json";

/* -------------------- Chicago-locked time -------------------- */

function chicagoParts() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CFG.timezone,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: !CFG.use24h
  });

  const parts = fmt.formatToParts(new Date());
  const m = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = p.value;

  const hour24 = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CFG.timezone,
      hour: "2-digit",
      hour12: false
    }).format(new Date())
  );

  return {
    weekday: m.weekday,
    year: m.year,
    month: m.month,
    day: m.day,
    hour: m.hour,
    minute: m.minute,
    hour24
  };
}

function greetingForHour24(h) {
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

function updateTop(el) {
  const t = chicagoParts();
  el.greeting.textContent = `${greetingForHour24(t.hour24)}, ${CFG.name}!`;
  el.clock.textContent = `${t.hour}:${t.minute}`;
  el.dateLine.textContent = `${t.month}/${t.day}/${t.year} · ${t.weekday} · ${t.hour}:${t.minute}`;
}

function scheduleMinuteClock(el) {
  updateTop(el);
  const msToNextMinute = (60 - new Date().getSeconds()) * 1000 + 50;
  setTimeout(() => {
    updateTop(el);
    setInterval(() => updateTop(el), 60 * 1000);
  }, msToNextMinute);
}

/* -------------------- Icons (no emojis) -------------------- */

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
  const c = `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
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
    <circle cx="12" cy="12" r="4" ${c}></circle>
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" ${c}></path>
  </svg>`;

  if (kind === "fog") return `
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M4 10h16M6 14h12M4 18h16" ${c}></path>
    <path d="M7 10a5 5 0 0 1 10 0" ${c}></path>
  </svg>`;

  if (kind === "rain") return `
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7" ${c}></path>
    <path d="M8 20l1-2M12 20l1-2M16 20l1-2" ${c}></path>
  </svg>`;

  if (kind === "snow") return `
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 17a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 17H7" ${c}></path>
    <path d="M9 20h.01M12 20h.01M15 20h.01" ${c}></path>
  </svg>`;

  if (kind === "storm") return `
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7" ${c}></path>
    <path d="M13 13l-2 4h3l-2 4" ${c}></path>
  </svg>`;

  return `
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7" ${c}></path>
  </svg>`;
}

/* -------------------- Rendering helpers -------------------- */

function fmtPrice(v) {
  return (typeof v === "number" && Number.isFinite(v)) ? `$${v.toFixed(2)}` : "--";
}

function renderWeek(weekEl, daily) {
  weekEl.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const box = document.createElement("div");
    box.className = "day";

    const name = document.createElement("div");
    name.className = "dayName";
    // The daily.time[i] is ISO date string "YYYY-MM-DD"
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

function setStatus(el, label) {
  const t = chicagoParts();
  el.updated.textContent = `${label} ${t.hour}:${t.minute}`;
}

/* -------------------- Cache-first paint -------------------- */

function tryRenderCached(el) {
  // Weather cache
  try {
    const w = JSON.parse(localStorage.getItem(LS_WEATHER) || "null");
    if (w?.current && w?.daily) {
      el.wxIcon.innerHTML = wxIcon(w.current.code);
      el.wxTemp.textContent = `${w.current.temp}°`;
      el.wxDesc.textContent = w.current.text;
      el.wxHi.textContent = `${w.current.hi}°`;
      el.wxLo.textContent = `${w.current.lo}°`;
      renderWeek(el.week, w.daily);
    }
  } catch {}

  // Markets cache
  try {
    const m = JSON.parse(localStorage.getItem(LS_MARKETS) || "null");
    if (m?.symbols) {
      el.spy.textContent = fmtPrice(m.symbols.SPY?.price);
      el.iau.textContent = fmtPrice(m.symbols.IAU?.price);
      if (m.updated_hm) el.mktUpdated.textContent = `Updated ${m.updated_hm}`;
    }
  } catch {}
}

/* -------------------- Static JSON loaders -------------------- */

async function loadWeatherFromStatic(el) {
  const r = await fetch(WEATHER_URL, { cache: "no-store" });
  if (!r.ok) throw new Error("weather.json missing");
  const d = await r.json();

  if (!d?.current || !d?.daily) throw new Error("weather.json empty");

  const code = d.current.weather_code;
  const curTemp = Math.round(d.current.temperature_2m);
  const hi = Math.round(d.daily.temperature_2m_max[0]);
  const lo = Math.round(d.daily.temperature_2m_min[0]);

  el.wxIcon.innerHTML = wxIcon(code);
  el.wxTemp.textContent = `${curTemp}°`;
  el.wxDesc.textContent = wxText(code);
  el.wxHi.textContent = `${hi}°`;
  el.wxLo.textContent = `${lo}°`;

  renderWeek(el.week, d.daily);

  localStorage.setItem(LS_WEATHER, JSON.stringify({
    current: { code, temp: curTemp, hi, lo, text: wxText(code) },
    daily: d.daily
  }));
}

async function loadMarketsFromStatic(el) {
  const r = await fetch(MARKETS_URL, { cache: "no-store" });
  if (!r.ok) throw new Error("markets.json missing");
  const d = await r.json();

  el.spy.textContent = fmtPrice(d?.symbols?.SPY?.price);
  el.iau.textContent = fmtPrice(d?.symbols?.IAU?.price);

  const t = chicagoParts();
  const hm = `${t.hour}:${t.minute}`;
  el.mktUpdated.textContent = `Updated ${hm}`;

  localStorage.setItem(LS_MARKETS, JSON.stringify({
    ...d,
    updated_hm: hm
  }));
}

/* -------------------- Boot -------------------- */

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

  // Header icons
  if (el.mktIcon) el.mktIcon.innerHTML = iconChart();
  if (el.weekIcon) el.weekIcon.innerHTML = iconWeek();

  // Instant paint from cache
  tryRenderCached(el);

  // Chicago time always
  scheduleMinuteClock(el);

  // Static JSON load (fast + SenseCraft safe)
  Promise.allSettled([
    loadWeatherFromStatic(el),
    loadMarketsFromStatic(el)
  ]).finally(() => setStatus(el, "Loaded"));

  // Optional: refresh periodically (won't help unless GitHub Actions has updated JSON + Netlify redeployed)
  // Keep it gentle for e-ink.
  setInterval(() => loadWeatherFromStatic(el).catch(() => {}), 60 * 60 * 1000);
  setInterval(() => loadMarketsFromStatic(el).catch(() => {}), 60 * 60 * 1000);
});
