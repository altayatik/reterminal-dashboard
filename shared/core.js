// shared/core.js
// Single source for: theme, clock/date line, stage scaling, back button, tiny DOM helper.

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

/**
 * Detect an "embedded e-ink preview" environment (SenseCraft modal/iframe).
 * Heuristic: small viewport near 800×480 ratio OR explicitly forced via ?eink=1
 */
function isEinkPreview() {
  const params = new URLSearchParams(location.search);
  if (params.get("eink") === "1") return true;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Many previews give slightly smaller than 800x480 due to chrome/padding.
  // Trigger when it's "close enough" and not a typical phone/tablet shape.
  const ratio = w / h;
  const target = 800 / 480; // 1.666...
  const closeRatio = Math.abs(ratio - target) < 0.18;

  const withinSizeBand =
    (w >= 620 && w <= 920) &&
    (h >= 380 && h <= 620);

  // Also common in iframes: reduced viewport + no scroll
  const embedded = window.self !== window.top;

  return closeRatio && withinSizeBand && (embedded || h <= 560);
}

function applyEinkMode(on) {
  document.documentElement.classList.toggle("eink", on);
  // In eink mode we want pixel-perfect stage at 800x480 with no transform.
  if (on) {
    document.documentElement.style.setProperty("--stage-scale", "1");
  }
}

export function updateStageScale() {
  const stage = document.querySelector(".stage");
  if (!stage) return;

  // Mobile/tablet: CSS handles reflow; disable pixel-stage scaling
  if (window.matchMedia("(max-width: 900px)").matches && !isEinkPreview()) {
    applyEinkMode(false);
    document.documentElement.style.setProperty("--stage-scale", "1");
    return;
  }

  // E-ink preview: force exact stage, no scaling
  if (isEinkPreview()) {
    applyEinkMode(true);
    return;
  }

  applyEinkMode(false);

  const PAD = 40;
  const vw = window.innerWidth - PAD;
  const vh = window.innerHeight - PAD;

  const scale = Math.min(vw / 800, vh / 480);
  const capped = Math.min(scale, 2.0);

  document.documentElement.style.setProperty("--stage-scale", String(capped));
}

export function initStageScale() {
  updateStageScale();
  window.addEventListener("resize", updateStageScale);
}
