import { initStageScale, initTheme, initTopClock, initBack, $, CFG } from "../shared/core.js";
import { iconWeek, iconClock, iconWeather } from "../shared/icons.js";
import { wxText } from "../shared/weather-utils.js";

const LS_CITY = "dash_weather_city";
const API_BASE = "https://dashboard-data-api.vercel.app/api/weather";

function renderWeek(el, daily) {
  if (!daily?.time?.length) {
    el.innerHTML = "<div class='tiny muted'>No forecast</div>";
    return;
  }

  el.innerHTML = "";
  daily.time.forEach((dateStr, i) => {
    const name = new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
    const hi = Math.round(daily.temperature_2m_max?.[i]);
    const lo = Math.round(daily.temperature_2m_min?.[i]);
    const code = Array.isArray(daily.weather_code) ? daily.weather_code[i] : null;

    const dayEl = document.createElement("div");
    dayEl.className = "day";
    dayEl.innerHTML = `
      <div class="dayName">${name}</div>
      <div class="dayIcon">${code != null ? iconWeather(code) : ""}</div>
      <div class="dayTemps">
        <span class="hi">${Number.isFinite(hi) ? hi : "--"}°</span>
        <span class="lo">${Number.isFinite(lo) ? lo : "--"}°</span>
      </div>
    `;
    el.appendChild(dayEl);
  });
}

function renderHourly(el, hourly, tz) {
  if (!hourly?.time?.length) {
    el.innerHTML = "<div class='tiny muted'>No hourly data</div>";
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

document.addEventListener("DOMContentLoaded", async () => {
  initStageScale();

  const el = {
    dateLine: $("dateLine"),
    clock: $("clock"),
    themeBtn: $("themeToggle"),

    backBtn: $("backBtn"),
    cityForm: $("cityForm"),
    cityInput: $("cityInput"),
    locLabel: $("locLabel"),

    wxIcon: $("wxIcon"),
    wxTemp: $("wxTemp"),
    wxDesc: $("wxDesc"),
    wxFeels: $("wxFeels"),
    wxHum: $("wxHum"),
    wxWind: $("wxWind"),
    wxPress: $("wxPress"),
    wxPrecip: $("wxPrecip"),

    hourly: $("hourly"),
    hourIcon: $("hourIcon"),
    weekIcon: $("weekIcon"),
    week: $("week"),
    updated: $("updated")
  };

  initTheme(el.themeBtn);
  initTopClock({ clockEl: el.clock, dateLineEl: el.dateLine, themeBtn: el.themeBtn });
  initBack(el.backBtn, "../");

  if (el.hourIcon) el.hourIcon.innerHTML = iconClock();
  if (el.weekIcon) el.weekIcon.innerHTML = iconWeek();

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
      if (!w?.current) throw new Error("No weather data returned");

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

      const now = new Intl.DateTimeFormat("en-US", {
        timeZone: CFG.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(new Date());

      el.updated.textContent = `Loaded ${now}`;
    } catch (err) {
      el.hourly.textContent = "Weather unavailable";
      el.locLabel.textContent = String(err?.message || err);
      el.updated.textContent = "—";
    }
  }

  await loadAndRender(savedCity);
});
