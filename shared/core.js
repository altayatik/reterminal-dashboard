// shared/core.js

export const CFG = window.DASH_CONFIG ?? {
  name: "Altay",
  timezone: "America/Chicago",
  use24h: true
};

export const LS_THEME_OVERRIDE = "dash_theme_override";

export function $(id) { return document.getElementById(id); }

export function timeParts() {
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

  return { ...m, hour24 };
}

function isNightHour(hour24) {
  return hour24 >= 21 || hour24 < 8;
}

export function setInvert(on) {
  document.documentElement.classList.toggle("invert", on);
}
export function getInvert() {
  return document.documentElement.classList.contains("invert");
}

export function applyThemeForTime(t, themeBtn) {
  const atNightBoundary = (t.hour24 === 21 && t.minute === "00");
  const atDayBoundary   = (t.hour24 === 8  && t.minute === "00");
  if (atNightBoundary || atDayBoundary) localStorage.removeItem(LS_THEME_OVERRIDE);

  const override = localStorage.getItem(LS_THEME_OVERRIDE);
  const shouldInvert = override ? override === "invert" : isNightHour(t.hour24);

  setInvert(shouldInvert);

  if (themeBtn) {
    themeBtn.setAttribute("aria-pressed", shouldInvert ? "true" : "false");
    themeBtn.title = shouldInvert ? "Day mode" : "Night mode";
  }
}

export function initTheme(themeBtn) {
  if (!themeBtn) return;

  applyThemeForTime(timeParts(), themeBtn);

  themeBtn.addEventListener("click", () => {
    const next = getInvert() ? "normal" : "invert";
    localStorage.setItem(LS_THEME_OVERRIDE, next);
    applyThemeForTime(timeParts(), themeBtn);
  });
}

export function initTopClock({ clockEl, dateLineEl, themeBtn }) {
  const tick = () => {
    const t = timeParts();
    applyThemeForTime(t, themeBtn);

    if (clockEl) clockEl.textContent = `${t.hour}:${t.minute}`;
    if (dateLineEl) dateLineEl.textContent =
      `${t.month}/${t.day}/${t.year} · ${t.weekday} · ${t.hour}:${t.minute}`;
  };

  tick();

  const msToNextMinute = (60 - new Date().getSeconds()) * 1000 + 50;
  setTimeout(() => {
    tick();
    setInterval(tick, 60 * 1000);
  }, msToNextMinute);
}

export function initBack(btn, fallbackHref = "../") {
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else window.location.href = fallbackHref;
  });
}

/* ---------------------------------------------------------
   Stage scaling
   --------------------------------------------------------- */

// Detect embedded preview contexts (SenseCraft, iframes, etc.)
function isEmbeddedPreview() {
  return window.self !== window.top;
}

// Find the best "container box" to fit within.
// In SenseCraft, window size lies; but our stage lives inside a smaller visible box.
function getFitBox(stageEl) {
  // default: viewport
  let best = {
    w: document.documentElement.clientWidth || window.innerWidth,
    h: document.documentElement.clientHeight || window.innerHeight
  };

  // If embedded, walk up parents and pick the smallest "reasonable" visible box.
  if (!isEmbeddedPreview()) return best;

  let el = stageEl.parentElement;
  while (el && el !== document.body) {
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);

    // Ignore tiny / zero boxes and huge boxes
    if (w >= 420 && h >= 260 && w <= 2000 && h <= 2000) {
      // Prefer the smallest area box that still contains the stage area
      const area = w * h;
      const bestArea = best.w * best.h;
      if (area < bestArea) best = { w, h };
    }

    el = el.parentElement;
  }

  return best;
}

export function updateStageScale() {
  const stage = document.querySelector(".stage");
  if (!stage) return;

  // Mobile/tablet: reflow CSS, but NOT in embedded preview (we want pixel-stage)
  const isMobile = window.matchMedia("(max-width: 900px)").matches;
  const embedded = isEmbeddedPreview();

  if (isMobile && !embedded) {
    document.documentElement.style.setProperty("--stage-scale", "1");
    return;
  }

  // Fit-to-box scaling (desktop + embedded preview)
  const box = getFitBox(stage);

  // Use padding inside the box (SenseCraft has frame/padding)
  const PAD = embedded ? 70 : 40;

  const vw = Math.max(100, box.w - PAD);
  const vh = Math.max(100, box.h - PAD);

  const scale = Math.min(vw / 800, vh / 480);

  // In embedded preview: never upscale beyond 1
  const capped = embedded ? Math.min(scale, 1) : Math.min(scale, 2.0);

  document.documentElement.style.setProperty("--stage-scale", String(capped));
}

export function initStageScale() {
  updateStageScale();
  window.addEventListener("resize", updateStageScale);

  // Re-measure after layout settles (SenseCraft modals animate in)
  setTimeout(updateStageScale, 250);
  setTimeout(updateStageScale, 800);

  // Also re-measure when fonts load
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => updateStageScale()).catch(() => {});
  }
}
