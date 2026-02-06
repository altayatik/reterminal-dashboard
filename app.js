import {
  initStageScale,
  initTheme,
  initTopClock,
  $,
  CFG,
  timeParts
} from "./shared/core.js";

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
  return `$${Number(p).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/* ---------------- E-ink fit (fix preview zoom/crop) ---------------- */

function applyEinkFit() {
  const fit = document.querySelector(".einkFit");
  if (!fit) return;

  // Use real runtime viewport (iframe-safe)
  const vw = window.innerWidth || document.documentElement.clientWidth || 800;
  const vh = window.innerHeight || document.documentElement.clientHeight || 480;

  // Scale DOWN only; never enlarge above 1
  const scale = Math.min(1, vw / 800, vh / 480);

  document.documentElement.style.setProperty("--eink-scale", String(scale));
}

/* ---------------- World clock (main card) ---------------- */

function renderWorldClockStrip(container) {
  if (!container) return;

  container.innerHTML = HOME_CLOCKS.map((c) => `
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

    if (el.wxIcon) el.wxIcon.innerHTML = iconWeather(code);
    if (el.wxTemp) el.wxTemp.textContent = `${temp}°`;
    if (el.wxDesc) el.wxDesc.textContent = wxText(code);
    if (el.wxHi) el.wxHi.textContent = `${hi}°`;
    if (el.wxLo) el.wxLo.textContent = `${lo}°`;

    localStorage.setItem(
      LS_WEATHER,
      JSON.stringify({
        current: { code, temp, hi, lo, text: wxText(code) }
      })
    );
  }

  if (m?.symbols?.SPY?.price != null) {
    if (el.spy) el.spy.textContent = fmtPrice(m.symbols.SPY.price);
    if (el.iau) el.iau.textContent = fmtPrice(m.symbols.IAU?.price);

    const updated =
      m.updated_local ||
      (m.updated_iso ? new Date(m.updated_iso).toLocaleString() : "—");

    const status =
      m.in_hours === true
        ? " · Market open"
        : m.in_hours === false
          ? " · Market closed"
          : "";

    const txt = `Updated ${updated}${status}`;
    if (el.mktUpdated) el.mktUpdated.textContent = txt;

    localStorage.setItem(
      LS_MARKETS,
      JSON.stringify({
        ...m,
        updated_text: txt
      })
    );
  }
}

function renderFromCache(el) {
  try {
    const w = JSON.parse(localStorage.getItem(LS_WEATHER));
    if (w?.current) {
      if (el.wxTemp) el.wxTemp.textContent = `${w.current.temp}°`;
      if (el.wxDesc) el.wxDesc.textContent = w.current.text;
      if (el.wxHi) el.wxHi.textContent = `${w.current.hi}°`;
      if (el.wxLo) el.wxLo.textContent = `${w.current.lo}°`;
      if (el.wxIcon) el.wxIcon.innerHTML = iconWeather(w.current.code);
    }
  } catch {}

  try {
    const m = JSON.parse(localStorage.getItem(LS_MARKETS));
    if (m?.symbols) {
      if (el.spy) el.spy.textContent = fmtPrice(m.symbols.SPY?.price);
      if (el.iau) el.iau.textContent = fmtPrice(m.symbols.IAU?.price);
      if (el.mktUpdated) el.mktUpdated.textContent = m.updated_text || "Cached";
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
  const isEink = document.body.classList.contains("eink");

  if (!isEink) {
    initStageScale();
  } else {
    // Deterministic fit inside SenseCraft preview / iframes
    applyEinkFit();
    window.addEventListener("resize", applyEinkFit, { passive: true });

    // Some hosts update size after initial paint; do a couple of delayed fits
    setTimeout(applyEinkFit, 0);
    setTimeout(applyEinkFit, 150);
    setTimeout(applyEinkFit, 500);
  }

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
  if (el.greeting) {
    el.greeting.textContent = `${greetingForHour24(tp.hour24)}, ${CFG.name}!`;
  }

  if (el.mktIcon) el.mktIcon.innerHTML = iconChart();
  if (el.wcIcon) el.wcIcon.innerHTML = iconClock();

  renderWorldClockStrip(el.wcStrip);
  tickWorldClockStrip(el.wcStrip);

  const msToNextMinute = (60 - new Date().getSeconds()) * 1000 + 50;
  setTimeout(() => {
    tickWorldClockStrip(el.wcStrip);
    setInterval(() => tickWorldClockStrip(el.wcStrip), 60 * 1000);
  }, msToNextMinute);

  renderFromCache(el);
  renderFromEmbedded(el);

  if (el.updated) {
    el.updated.textContent = `Loaded ${tp.hour}:${tp.minute}`;
  }

  const base = isEink ? "../" : "./";

  makeCardLink($("weatherCard"), `${base}weather/`);
  makeCardLink($("marketsCard"), `${base}market/`);
  makeCardLink($("worldClockCard"), `${base}world-clock/`);
});
