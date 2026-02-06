import { initStageScale, initTheme, initTopClock, $, CFG, timeParts } from "./shared/core.js";
import { iconChart, iconWeek, iconWeather } from "./shared/icons.js";
import { wxText } from "./shared/weather-utils.js";

const LS_WEATHER = "dash_weather_embedded_v1";
const LS_MARKETS = "dash_markets_embedded_v1";

function greetingForHour24(h) {
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

function fmtPrice(p) {
  if (p == null || !Number.isFinite(Number(p))) return "--";
  return `$${Number(p).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function renderWeek(el, daily) {
  if (!daily?.time?.length) {
    el.innerHTML = "<div>No forecast</div>";
    return;
  }

  el.innerHTML = "";
  daily.time.forEach((dateStr, i) => {
    const name = new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
    const hi = Math.round(daily.temperature_2m_max[i]);
    const lo = Math.round(daily.temperature_2m_min[i]);
    const code = Array.isArray(daily.weather_code) ? daily.weather_code[i] : null;

    const dayEl = document.createElement("div");
    dayEl.className = "day";
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

function renderFromCache(el) {
  try {
    const w = JSON.parse(localStorage.getItem(LS_WEATHER));
    if (w?.current) {
      el.wxTemp.textContent = `${w.current.temp}°`;
      el.wxDesc.textContent = w.current.text;
      el.wxHi.textContent = `${w.current.hi}°`;
      el.wxLo.textContent = `${w.current.lo}°`;
      el.wxIcon.innerHTML = iconWeather(w.current.code);
    }
    if (w?.daily) renderWeek(el.week, w.daily);
  } catch {}

  try {
    const m = JSON.parse(localStorage.getItem(LS_MARKETS));
    if (m?.symbols) {
      el.spy.textContent = fmtPrice(m.symbols.SPY?.price);
      el.iau.textContent = fmtPrice(m.symbols.IAU?.price);
      el.mktUpdated.textContent = m.updated_text || "Cached";
    }
  } catch {}
}

function renderFromEmbedded(el) {
  const w = window.DASH_DATA?.weather;
  const m = window.DASH_DATA?.markets;

  if (w?.current) {
    const code = w.current.weather_code;
    const temp = Math.round(w.current.temperature_2m);
    const hi = Math.round(w.daily?.temperature_2m_max?.[0] ?? temp);
    const lo = Math.round(w.daily?.temperature_2m_min?.[0] ?? temp);

    el.wxIcon.innerHTML = iconWeather(code);
    el.wxTemp.textContent = `${temp}°`;
    el.wxDesc.textContent = wxText(code);
    el.wxHi.textContent = `${hi}°`;
    el.wxLo.textContent = `${lo}°`;

    if (w.daily) renderWeek(el.week, w.daily);

    localStorage.setItem(LS_WEATHER, JSON.stringify({
      current: { code, temp, hi, lo, text: wxText(code) },
      daily: w.daily
    }));
  }

  if (m?.symbols?.SPY?.price != null) {
    el.spy.textContent = fmtPrice(m.symbols.SPY.price);
    el.iau.textContent = fmtPrice(m.symbols.IAU?.price);

    const updated = m.updated_local || (m.updated_iso ? new Date(m.updated_iso).toLocaleString() : "—");
    const status = (m.in_hours === true) ? " · Market open" : (m.in_hours === false ? " · Market closed" : "");
    const txt = `Updated ${updated}${status}`;

    el.mktUpdated.textContent = txt;

    localStorage.setItem(LS_MARKETS, JSON.stringify({
      ...m,
      updated_text: txt
    }));
  }
}

function makeCardLink(node, href) {
  if (!node) return;
  const go = () => (window.location.href = href);
  node.addEventListener("click", go);
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initStageScale();

  const el = {
    greeting: $("greeting"),
    dateLine: $("dateLine"),
    clock: $("clock"),
    themeBtn: $("themeToggle"),

    wxIcon: $("wxIcon"),
    wxTemp: $("wxTemp"),
    wxDesc: $("wxDesc"),
    wxHi: $("wxHi"),
    wxLo: $("wxLo"),

    mktIcon: $("mktIcon"),
    spy: $("spy"),
    iau: $("iau"),
    mktUpdated: $("mktUpdated"),

    weekIcon: $("weekIcon"),
    week: $("week"),

    updated: $("updated")
  };

  initTheme(el.themeBtn);
  initTopClock({ clockEl: el.clock, dateLineEl: el.dateLine, themeBtn: el.themeBtn });

  const tp = timeParts();
  el.greeting.textContent = `${greetingForHour24(tp.hour24)}, ${CFG.name}!`;

  // shared icons
  el.mktIcon.innerHTML = iconChart();
  el.weekIcon.innerHTML = iconWeek();

  // fast paint: cached → embedded scripts override
  renderFromCache(el);
  renderFromEmbedded(el);

  // footer loaded time
  el.updated.textContent = `Loaded ${tp.hour}:${tp.minute}`;

  // routing
  makeCardLink($("weatherCard"), "./weather/");
  makeCardLink($("marketsCard"), "./market/");
});
