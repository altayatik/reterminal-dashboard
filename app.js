import { initStageScale, initTheme, initTopClock, $, CFG, timeParts } from "./shared/core.js";
import { iconChart, iconWeather, iconClock } from "./shared/icons.js";
import { wxText } from "./shared/weather-utils.js";
import { HOME_CLOCKS, formatTime12h } from "./shared/world-clock-utils.js";

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

/* ---------------- World clock (main card) ---------------- */

function renderWorldClockStrip(container) {
  if (!container) return;

  container.innerHTML = HOME_CLOCKS.map(c => `
    <div class="wcTile">
      <div class="wcCity">${c.label}</div>
      <div class="wcTime" data-tz="${c.tz}">--:--</div>
    </div>
  `).join("");
}

function tickWorldClockStrip(container) {
  if (!container) return;
  const nodes = container.querySelectorAll("[data-tz]");
  for (const n of nodes) {
    const tz = n.getAttribute("data-tz");
    n.textContent = formatTime12h(tz);
  }
}

/* ---------------- Data from embedded scripts + cache ---------------- */

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

    localStorage.setItem(LS_WEATHER, JSON.stringify({
      current: { code, temp, hi, lo, text: wxText(code) }
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

    wcIcon: $("wcIcon"),
    wcStrip: $("wcList"),

    updated: $("updated")
  };

  initTheme(el.themeBtn);
  initTopClock({ clockEl: el.clock, dateLineEl: el.dateLine, themeBtn: el.themeBtn });

  const tp = timeParts();
  el.greeting.textContent = `${greetingForHour24(tp.hour24)}, ${CFG.name}!`;

  el.mktIcon.innerHTML = iconChart();
  el.wcIcon.innerHTML = iconClock();

  // World clock strip (horizontal tiles)
  renderWorldClockStrip(el.wcStrip);
  tickWorldClockStrip(el.wcStrip);

  const msToNextMinute = (60 - new Date().getSeconds()) * 1000 + 50;
  setTimeout(() => {
    tickWorldClockStrip(el.wcStrip);
    setInterval(() => tickWorldClockStrip(el.wcStrip), 60 * 1000);
  }, msToNextMinute);

  renderFromCache(el);
  renderFromEmbedded(el);

  el.updated.textContent = `Loaded ${tp.hour}:${tp.minute}`;

  makeCardLink($("weatherCard"), "./weather/");
  makeCardLink($("marketsCard"), "./market/");
  makeCardLink($("worldClockCard"), "./world-clock/");
});
