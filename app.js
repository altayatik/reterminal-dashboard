// app.js — restored original icon behavior (no weather icon set)

const CFG = window.DASH_CONFIG ?? {
  name: "Altay",
  timezone: "America/Chicago",
  use24h: true
};

const LS_WEATHER = "dash_weather_embedded_v1";
const LS_MARKETS = "dash_markets_embedded_v1";

/* -------------------- Chicago time -------------------- */
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
    new Intl.DateTimeFormat("en-US", { timeZone: CFG.timezone, hour: "2-digit", hour12: false })
      .format(new Date())
  );

  return { weekday: m.weekday, year: m.year, month: m.month, day: m.day, hour: m.hour, minute: m.minute, hour24 };
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

/* -------------------- Original icons only -------------------- */
function iconChart() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>`;
}

function iconWeek() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>`;
}

function iconWeather(code) {
  // Restored original icon set (from prior commit) for consistent visuals.
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

/* -------------------- Weather helpers -------------------- */
const weatherCodes = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
};

function wxText(code) {
  return weatherCodes[code] || "Unknown";
}

/* -------------------- Render week forecast -------------------- */
function renderWeek(el, daily) {
  if (!daily?.time?.length) {
    el.innerHTML = "<div>No forecast</div>";
    return;
  }

  el.innerHTML = "";

  daily.time.forEach((dateStr, i) => {
    const dayEl = document.createElement("div");
    dayEl.className = "day";

    const name = new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
    const hi = Math.round(daily.temperature_2m_max[i]);
    const lo = Math.round(daily.temperature_2m_min[i]);

    const code = Array.isArray(daily.weather_code) ? daily.weather_code[i] : null;
    const icon = (code !== null && code !== undefined) ? iconWeather(code) : "";

    dayEl.innerHTML = `
      <div class="dayName">${name}</div>
      <div class="dayIcon">${icon}</div>
      <div class="dayTemps">
        <span class="hi">${hi}°</span>
        <span class="lo">${lo}°</span>
      </div>
    `;

    el.appendChild(dayEl);
  });
}

/* -------------------- Price formatter -------------------- */
function fmtPrice(p) {
  if (p == null) return "--";
  return `$${Number(p).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* -------------------- Show cached data immediately -------------------- */
function tryRenderCached(el) {
  try {
    const cachedWeather = JSON.parse(localStorage.getItem(LS_WEATHER));
    if (cachedWeather?.current) {
      const { code, temp, hi, lo, text, updated_iso } = cachedWeather.current;
      el.wxTemp.textContent = `${temp}°`;
      el.wxDesc.textContent = text;
      el.wxHi.textContent = `${hi}°`;
      el.wxLo.textContent = `${lo}°`;

      // Weather icon
      if (el.wxIcon) el.wxIcon.innerHTML = iconWeather(code);
      // Age warning
      if (updated_iso) {
        const ageHours = (Date.now() - new Date(updated_iso).getTime()) / 3600000;
        if (ageHours > 24) {
          el.wxDesc.textContent += " (old)";
        }
      }
    }

    // Render cached week forecast (so icons/tiles show immediately).
    if (cachedWeather?.daily && el.week) {
      renderWeek(el.week, cachedWeather.daily);
    }
  } catch {}

  try {
    const cachedMarkets = JSON.parse(localStorage.getItem(LS_MARKETS));
    if (cachedMarkets?.symbols) {
      el.spy.textContent = fmtPrice(cachedMarkets.symbols.SPY?.price);
      el.iau.textContent = fmtPrice(cachedMarkets.symbols.IAU?.price);
      el.mktUpdated.textContent = cachedMarkets.updated_hm || "Cached";
    }
  } catch {}
}

/* -------------------- Load from embedded scripts -------------------- */
function loadFromEmbedded(el) {
  const w = window.DASH_DATA?.weather;
  const m = window.DASH_DATA?.markets;

  // ── Weather ───────────────────────────────────────────────────────────
  if (w?.current) {
    const curTemp = Math.round(w.current.temperature_2m);
    const code = w.current.weather_code;
    const hi = Math.round(w.daily?.temperature_2m_max?.[0] ?? 0);
    const lo = Math.round(w.daily?.temperature_2m_min?.[0] ?? 0);

    el.wxTemp.textContent = `${curTemp}°`;
    el.wxDesc.textContent = wxText(code);
    el.wxHi.textContent = `${hi}°`;
    el.wxLo.textContent = `${lo}°`;

    // Weather icon
    if (el.wxIcon) el.wxIcon.innerHTML = iconWeather(code);

    // Render week forecast
    if (w.daily) {
      renderWeek(el.week, w.daily);
    } else {
      el.week.innerHTML = "<div>No forecast</div>";
    }

    // Save to localStorage with timestamp
    const weatherSave = {
      current: {
        code,
        temp: curTemp,
        hi,
        lo,
        text: wxText(code),
        updated_iso: w.updated_iso || new Date().toISOString()
      },
      daily: w.daily
    };
    localStorage.setItem(LS_WEATHER, JSON.stringify(weatherSave));

    // Add weather update time
    if (w.updated_iso) {
      const updTime = new Date(w.updated_iso).toLocaleTimeString("en-US", {
        hour12: false,
        timeZone: "America/Chicago"
      }).slice(0,5);
      const updSpan = document.createElement("span");
      updSpan.textContent = ` · ${updTime}`;
      updSpan.style.fontSize = "11px";
      updSpan.style.color = "#555";
      el.wxDesc.appendChild(updSpan);

      // Age warning
      const ageHours = (Date.now() - new Date(w.updated_iso).getTime()) / 3600000;
      if (ageHours > 24) {
        const ageSpan = document.createElement("span");
        ageSpan.textContent = " (old)";
        ageSpan.style.fontSize = "11px";
        el.wxDesc.appendChild(ageSpan);
      }
    }
  }

  // ── Markets ───────────────────────────────────────────────────────────
  if (m?.symbols?.SPY?.price) {
    el.spy.textContent = fmtPrice(m.symbols.SPY?.price);
    el.iau.textContent = fmtPrice(m.symbols.IAU?.price);

    let updateDisplay = m.updated_local ||
      (m.updated_iso ? new Date(m.updated_iso).toLocaleTimeString("en-US", {
        hour12: false,
        timeZone: "America/Chicago"
      }).slice(0,5) : "--:--");

    let status = m.in_hours !== undefined ? (m.in_hours ? " · Market open" : " · Market closed") : "";

    el.mktUpdated.textContent = `Updated ${updateDisplay}${status}`;

    localStorage.setItem(LS_MARKETS, JSON.stringify({
      ...m,
      updated_hm: `Updated ${updateDisplay}${status}`
    }));
  } else {
    el.spy.textContent = "—";
    el.iau.textContent = "—";
    el.mktUpdated.textContent = "No market data yet";
  }

  const t = chicagoParts();
  el.updated.textContent = `Loaded ${t.hour}:${t.minute}`;
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

  if (el.mktIcon) el.mktIcon.innerHTML = iconChart();
  if (el.weekIcon) el.weekIcon.innerHTML = iconWeek();

  tryRenderCached(el);
  scheduleMinuteClock(el);

  try {
    loadFromEmbedded(el);
  } catch (err) {
    console.error("Embedded data load failed:", err);
  }

  setTimeout(() => {
    if (!window.DASH_DATA?.markets?.symbols?.SPY?.price) {
      el.spy.textContent = "—";
      el.iau.textContent = "—";
      el.mktUpdated.textContent = "API unreachable";
    }
    if (!window.DASH_DATA?.weather?.current) {
      el.wxTemp.textContent = "—";
      el.wxDesc.textContent = "Weather unavailable";
      el.week.innerHTML = "<div>No forecast</div>";
    }
  }, 8000);

  const t = chicagoParts();
  el.updated.textContent = `Loaded ${t.hour}:${t.minute}`;
});