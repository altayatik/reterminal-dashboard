// weather-page.js

const CFG = window.DASH_CONFIG ?? {
  name: "Altay",
  timezone: "America/Chicago",
  use24h: true
};

const LS_THEME_OVERRIDE = "dash_theme_override";
const LS_CITY = "dash_weather_city";
const API_BASE = "https://dashboard-data-api.vercel.app/api/weather";

/* ---------------- Theme logic ---------------- */

function isNightHour(hour24) {
  return hour24 >= 21 || hour24 < 8;
}

function setInvert(on) {
  document.documentElement.classList.toggle("invert", on);
}

function getInvert() {
  return document.documentElement.classList.contains("invert");
}

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

function applyThemeForTime(t, themeBtn) {
  const atNightBoundary = (t.hour24 === 21 && t.minute === "00");
  const atDayBoundary   = (t.hour24 === 8  && t.minute === "00");
  if (atNightBoundary || atDayBoundary) {
    localStorage.removeItem(LS_THEME_OVERRIDE);
  }

  const override = localStorage.getItem(LS_THEME_OVERRIDE);
  const shouldInvert = override
    ? override === "invert"
    : isNightHour(t.hour24);

  setInvert(shouldInvert);

  if (themeBtn) {
    themeBtn.setAttribute("aria-pressed", shouldInvert ? "true" : "false");
    themeBtn.title = shouldInvert ? "Day mode" : "Night mode";
  }
}

/* ---------------- Desktop stage scaling ---------------- */
function updateStageScale(){
  const stage = document.querySelector(".stage");
  if (!stage) return;

  if (window.matchMedia("(max-width: 900px)").matches) {
    document.documentElement.style.setProperty("--stage-scale", "1");
    return;
  }

  const PAD = 40;
  const vw = window.innerWidth - PAD;
  const vh = window.innerHeight - PAD;

  const scale = Math.min(vw / 800, vh / 480);
  const capped = Math.min(scale, 2.0);

  document.documentElement.style.setProperty("--stage-scale", String(capped));
}

/* ---------------- Icons + text ---------------- */

function iconWeek() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>`;
}

function iconClock() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"></circle>
    <path d="M12 7v6l4 2"></path>
  </svg>`;
}

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
  95: "Thunderstorm"
};

function wxText(code) {
  return weatherCodes[code] || "Unknown";
}

function iconWeather(code) {
  const c = `fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round"`;

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

/* ---------------- Rendering ---------------- */

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

    dayEl.innerHTML = `
      <div class="dayName">${name}</div>
      <div class="dayIcon">${code != null ? iconWeather(code) : ""}</div>
      <div class="dayTemps">
        <span class="hi">${hi}°</span>
        <span class="lo">${lo}°</span>
      </div>
    `;
    el.appendChild(dayEl);
  });
}

function renderHourly(el, hourly, tz) {
  if (!hourly?.time?.length) {
    el.textContent = "No hourly data";
    return;
  }

  const n = Math.min(10, hourly.time.length);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const t = hourly.time[i];
    const temp = hourly.temperature_2m?.[i];
    const pop = hourly.precipitation_probability?.[i];
    const code = hourly.weather_code?.[i];
    const wind = hourly.wind_speed_10m?.[i];

    const hhmm = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || CFG.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(t));

    rows.push(`
      <div class="hourRow">
        <div class="hourTime">${hhmm}</div>
        <div class="hourIcon">${iconWeather(code)}</div>
        <div class="hourTemp">${temp != null ? Math.round(temp) + "°" : "--"}</div>
        <div class="hourPop">${pop != null ? Math.round(pop) + "%" : "--"}</div>
        <div class="hourWind">${wind != null ? Math.round(wind) + " mph" : "--"}</div>
      </div>
    `);
  }

  el.innerHTML = `
    <div class="hourHeader">
      <div>Time</div><div></div><div>Temp</div><div>Precip</div><div>Wind</div>
    </div>
    ${rows.join("")}
  `;
}

/* ---------------- Data loading ---------------- */

function loadWeatherScript(city) {
  return new Promise((resolve, reject) => {
    window.DASH_DATA = window.DASH_DATA || {};
    delete window.DASH_DATA.weather;

    const s = document.createElement("script");
    const qs = city ? `?city=${encodeURIComponent(city)}` : "";
    s.src = `${API_BASE}${qs}`;
    s.async = true;

    s.onload = () => resolve(window.DASH_DATA.weather);
    s.onerror = () => reject(new Error("Failed to load weather script"));
    document.head.appendChild(s);
  });
}

/* ---------------- Boot ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  const el = {
    dateLine: document.getElementById("dateLine"),
    clock: document.getElementById("clock"),
    themeBtn: document.getElementById("themeToggle"),

    backBtn: document.getElementById("backBtn"),
    cityForm: document.getElementById("cityForm"),
    cityInput: document.getElementById("cityInput"),
    locLabel: document.getElementById("locLabel"),

    wxIcon: document.getElementById("wxIcon"),
    wxTemp: document.getElementById("wxTemp"),
    wxDesc: document.getElementById("wxDesc"),
    wxFeels: document.getElementById("wxFeels"),
    wxHum: document.getElementById("wxHum"),
    wxWind: document.getElementById("wxWind"),
    wxPress: document.getElementById("wxPress"),
    wxPrecip: document.getElementById("wxPrecip"),

    hourly: document.getElementById("hourly"),
    hourIcon: document.getElementById("hourIcon"),
    weekIcon: document.getElementById("weekIcon"),
    week: document.getElementById("week"),
    updated: document.getElementById("updated")
  };

  updateStageScale();
  window.addEventListener("resize", updateStageScale);

  // ✅ consistent icons (no emoji)
  if (el.hourIcon) el.hourIcon.innerHTML = iconClock();
  if (el.weekIcon) el.weekIcon.innerHTML = iconWeek();

  const tick = () => {
    const tt = chicagoParts();
    applyThemeForTime(tt, el.themeBtn);
    el.clock.textContent = `${tt.hour}:${tt.minute}`;
    el.dateLine.textContent = `${tt.month}/${tt.day}/${tt.year} · ${tt.weekday} · ${tt.hour}:${tt.minute}`;
  };
  tick();
  setInterval(tick, 60 * 1000);

  if (el.themeBtn) {
    el.themeBtn.addEventListener("click", () => {
      const next = getInvert() ? "normal" : "invert";
      localStorage.setItem(LS_THEME_OVERRIDE, next);
      applyThemeForTime(chicagoParts(), el.themeBtn);
    });
  }

  el.backBtn?.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else window.location.href = "../";
  });

  const savedCity = localStorage.getItem(LS_CITY) || "";
  if (savedCity) el.cityInput.value = savedCity;

  el.cityForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const city = (el.cityInput.value || "").trim();
    if (city) localStorage.setItem(LS_CITY, city);
    else localStorage.removeItem(LS_CITY);
    await loadAndRender(city);
  });

  async function loadAndRender(city) {
    el.hourly.textContent = "Loading…";
    try {
      const w = await loadWeatherScript(city);
      if (!w?.current) throw new Error("No weather data");

      const code = w.current.weather_code;
      const temp = Math.round(w.current.temperature_2m);
      const feels = Math.round(w.current.apparent_temperature ?? temp);

      el.wxIcon.innerHTML = iconWeather(code);
      el.wxTemp.textContent = `${temp}°`;
      el.wxDesc.textContent = wxText(code);
      el.wxFeels.textContent = `${feels}°`;

      const hum = w.current.relative_humidity_2m;
      el.wxHum.textContent = hum != null ? `${Math.round(hum)}%` : "--%";

      const windSpd = w.current.wind_speed_10m;
      const windDir = w.current.wind_direction_10m;
      el.wxWind.textContent =
        windSpd != null
          ? `${Math.round(windSpd)} mph${windDir != null ? ` @ ${Math.round(windDir)}°` : ""}`
          : "--";

      const press = w.current.pressure_msl;
      el.wxPress.textContent = press != null ? `${Math.round(press)} hPa` : "--";

      const precip = w.current.precipitation;
      el.wxPrecip.textContent = precip != null ? `${precip} in` : "--";

      el.locLabel.textContent = w.location?.label || "--";

      if (w.daily) renderWeek(el.week, w.daily);
      renderHourly(el.hourly, w.hourly, w.location?.timezone);

      const tt = chicagoParts();
      el.updated.textContent = `Loaded ${tt.hour}:${tt.minute}`;
    } catch (err) {
      el.hourly.textContent = "Weather unavailable";
      el.locLabel.textContent = String(err?.message || err);
    }
  }

  await loadAndRender(savedCity);
});
