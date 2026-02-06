import { initStageScale, initTheme, initTopClock, initBack, $, CFG, timeParts } from "../shared/core.js";
import { iconClock } from "../shared/icons.js";
import {
  DETAIL_CLOCKS,
  DEFAULT_CUSTOM_CLOCK,
  formatTime12h,
  resolveCityToTimezone
} from "../shared/world-clock-utils.js";

const LS_WC_CUSTOM = "dash_world_clock_custom_single_v1";

function loadCustomClock() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_WC_CUSTOM));
    if (v?.tz && v?.label) return v;
    return DEFAULT_CUSTOM_CLOCK;
  } catch {
    return DEFAULT_CUSTOM_CLOCK;
  }
}

function saveCustomClock(clock) {
  localStorage.setItem(LS_WC_CUSTOM, JSON.stringify(clock));
}

function renderCustom(hostEl, c) {
  hostEl.innerHTML = `
    <div class="mktBlock">
      <div class="mktHead">
        <div class="mktSym">${c.label}</div>
        <div class="mktNow wcBig" data-tz="${c.tz}">--:--</div>
      </div>
      <div class="tiny muted">${c.tz}</div>
    </div>
  `;
}

function renderFixedGrid(gridEl) {
  gridEl.innerHTML = DETAIL_CLOCKS.map(c => `
    <div class="mktBlock">
      <div class="mktHead">
        <div class="mktSym">${c.label}</div>
        <div class="mktNow wcBig" data-tz="${c.tz}">--:--</div>
      </div>
      <div class="tiny muted">${c.tz}</div>
    </div>
  `).join("");
}

function tickAll() {
  const nodes = document.querySelectorAll("[data-tz]");
  for (const n of nodes) {
    const tz = n.getAttribute("data-tz");
    n.textContent = formatTime12h(tz);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initStageScale();

  const el = {
    dateLine: $("dateLine"),
    clock: $("clock"),
    themeBtn: $("themeToggle"),

    backBtn: $("backBtn"),
    wcIcon: $("wcIcon"),
    wcIcon2: $("wcIcon2"),

    cityForm: $("cityForm"),
    cityInput: $("cityInput"),
    searchStatus: $("searchStatus"),

    wcCustomHost: $("wcCustomHost"),
    wcGrid: $("wcGrid"),
    loaded: $("loaded")
  };

  initTheme(el.themeBtn);
  initTopClock({ clockEl: el.clock, dateLineEl: el.dateLine, themeBtn: el.themeBtn });
  initBack(el.backBtn, "../");

  // icons
  el.wcIcon.innerHTML = iconClock();
  if (el.wcIcon2) el.wcIcon2.innerHTML = iconClock();

  const tp = timeParts();
  el.loaded.textContent = `Loaded ${tp.hour}:${tp.minute}`;

  // Fixed 6 clocks
  renderFixedGrid(el.wcGrid);

  // Custom clock (Chicago by default; search replaces it)
  let customClock = loadCustomClock();
  renderCustom(el.wcCustomHost, customClock);

  // Initial tick
  tickAll();

  // Minute-aligned ticking
  const msToNextMinute = (60 - new Date().getSeconds()) * 1000 + 50;
  setTimeout(() => {
    tickAll();
    setInterval(tickAll, 60 * 1000);
  }, msToNextMinute);

  el.cityForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = (el.cityInput.value || "").trim();
    if (!q) return;

    el.searchStatus.textContent = "Searching…";

    try {
      const res = await resolveCityToTimezone(q); // {label, tz}

      // Replace custom clock (does not add to fixed list)
      customClock = res;
      saveCustomClock(customClock);

      renderCustom(el.wcCustomHost, customClock);
      tickAll();

      el.searchStatus.textContent = `Showing: ${res.label}`;
      el.cityInput.value = "";
    } catch (err) {
      el.searchStatus.textContent = String(err?.message || err);
    }
  });
});
