// app.js — SenseCraft-proof: NO fetch(), reads window.DASH_DATA populated by Vercel API scripts

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

/* -------------------- Icons (unchanged) -------------------- */
function iconChart() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
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

/* -------------------- Weather helpers -------------------- */
const weatherCodes = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Very cloudy",
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
  82: "Heavy rain",
};

function wxText(code) {
  return weatherCodes[code] || "Unknown";
}

/* -------------------- Render week forecast -------------------- */
function renderWeek(el, daily) {
  if (!daily?.time?.length) return;

  el.innerHTML = "";

  daily.time.forEach((dateStr, i) => {
    const dayEl = document.createElement("div");
    dayEl.className = "day";

    const name = new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
    const hi = Math.round(daily.temperature_2m_max[i]);
    const lo = Math.round(daily.temperature_2m_min[i]);

    dayEl.innerHTML = `
      <div class="dayName">${name}</div>
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

      // Show age warning if old
      if (updated_iso) {
        const ageHours = (Date.now() - new Date(updated_iso).getTime()) / 3600000;
        if (ageHours > 24) {
          el.wxDesc.textContent += " (old)";
        }
      }
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

/* -------------------- Load from embedded scripts (Vercel API) -------------------- */
function loadFromEmbedded(el) {
  const w = window.DASH_DATA?.weather;
  const m = window.DASH_DATA?.markets;

  // ── Weather ───────────────────────────────────────────────────────────
  if (w?.current) {
    const curTemp = Math.round(w.current.temperature_2m);
    const code = w.current.weather_code;
    const hi = Math.round(w.daily.temperature_2m_max[0]);
    const lo = Math.round(w.daily.temperature_2m_min[0]);

    el.wxTemp.textContent = `${curTemp}°`;
    el.wxDesc.textContent = wxText(code);
    el.wxHi.textContent = `${hi}°`;
    el.wxLo.textContent = `${lo}°`;
    renderWeek(el.week, w.daily);

    // More aggressive localStorage: save timestamp too
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

    // Show weather update time (small text)
    if (w.updated_iso && el.wxDesc) {
      const updTime = new Date(w.updated_iso).toLocaleTimeString("en-US", {
        hour12: false,
        timeZone: "America/Chicago"
      }).slice(0,5);
      const updSpan = document.createElement("span");
      updSpan.textContent = ` · ${updTime}`;
      updSpan.style.fontSize = "11px";
      updSpan.style.color = "#555";
      el.wxDesc.appendChild(updSpan);

      // Age warning if >24h
      const ageHours = (Date.now() - new Date(w.updated_iso).getTime()) / 3600000;
      if (ageHours > 24) {
        el.wxDesc.textContent += " (old)";
      }
    }
  }

  // ── Markets ───────────────────────────────────────────────────────────
  if (m?.symbols) {
    el.spy.textContent = fmtPrice(m.symbols.SPY?.price);
    el.iau.textContent = fmtPrice(m.symbols.IAU?.price);

    let updateDisplay = m.updated_local || 
      (m.updated_iso ? new Date(m.updated_iso).toLocaleTimeString("en-US", {
        hour12: false,
        timeZone: "America/Chicago"
      }).slice(0,5) : "--:--");

    let status = "";
    if (m.in_hours !== undefined) {
      status = m.in_hours ? " · Market open" : " · Market closed";
    }

    el.mktUpdated.textContent = `Updated ${updateDisplay}${status}`;

    localStorage.setItem(LS_MARKETS, JSON.stringify({
      ...m,
      updated_hm: `Updated ${updateDisplay}${status}`
    }));
  } else {
    // Fallback when no market data at all
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

  // Show cached data right away (important for slow e-ink boot)
  tryRenderCached(el);

  // Live clock
  scheduleMinuteClock(el);

  // Load fresh data from scripts
  try {
    loadFromEmbedded(el);
  } catch (err) {
    console.error("Failed to load embedded data:", err);
  }

  // Error fallback: if scripts failed to load data after 8 seconds
  setTimeout(() => {
    if (!window.DASH_DATA?.markets?.symbols?.SPY?.price) {
      el.spy.textContent = "—";
      el.iau.textContent = "—";
      el.mktUpdated.textContent = "API unreachable";
    }
    if (!window.DASH_DATA?.weather?.current) {
      el.wxTemp.textContent = "—";
      el.wxDesc.textContent = "Weather unavailable";
    }
  }, 8000);

  const t = chicagoParts();
  el.updated.textContent = `Loaded ${t.hour}:${t.minute}`;
});