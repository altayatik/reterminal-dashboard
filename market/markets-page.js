// markets-page.js

const CFG = window.DASH_CONFIG ?? {
  name: "Altay",
  timezone: "America/Chicago",
  use24h: true
};

const LS_THEME_OVERRIDE = "dash_theme_override";
const API_BASE = "https://dashboard-data-api.vercel.app/api/markets";

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

/* ---------------- Utils ---------------- */

function fmtPrice(p) {
  if (p == null) return "—";
  return `$${Number(p).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function fmtPct(x) {
  if (x == null || !Number.isFinite(x)) return "—";
  return (x >= 0 ? "+" : "") + x.toFixed(2) + "%";
}

function fiveDayChangePct(series) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const first = series[0]?.close;
  const last  = series[series.length - 1]?.close;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
  return ((last - first) / first) * 100;
}

function sparklineSVG(series) {
  if (!Array.isArray(series) || series.length < 2) return "";

  const w = 140, h = 28, pad = 2;
  const ys = series.map(p => p.close);

  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const rng = Math.max(1e-9, max - min);

  const pts = ys.map((y, i) => {
    const x = pad + (i * (w - pad * 2)) / (ys.length - 1);
    const yy = pad + (h - pad * 2) * (1 - (y - min) / rng);
    return `${x.toFixed(2)},${yy.toFixed(2)}`;
  }).join(" ");

  const first = ys[0];
  const baseY = pad + (h - pad * 2) * (1 - (first - min) / rng);

  return `
    <svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <line class="sparkBase" x1="0" y1="${baseY.toFixed(2)}" x2="${w}" y2="${baseY.toFixed(2)}"></line>
      <polyline class="sparkLine" points="${pts}"></polyline>
    </svg>
  `;
}

function iconChart() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>`;
}

function loadMarketsScript() {
  return new Promise((resolve, reject) => {
    window.DASH_DATA = window.DASH_DATA || {};
    delete window.DASH_DATA.markets;

    const s = document.createElement("script");
    s.src = API_BASE;
    s.async = true;

    s.onload = () => resolve(window.DASH_DATA.markets);
    s.onerror = () => reject(new Error("Failed to load markets script"));
    document.head.appendChild(s);
  });
}

function renderTickerBlock(sym, quoteObj, series) {
  const p = quoteObj?.price ?? null;
  const dayPct = quoteObj?.percent_change ?? null;
  const wkPct = fiveDayChangePct(series);

  const hi = Array.isArray(series) && series.length ? Math.max(...series.map(x => x.close)) : null;
  const lo = Array.isArray(series) && series.length ? Math.min(...series.map(x => x.close)) : null;
  const rangeTxt = (hi != null && lo != null) ? `${fmtPrice(lo)} – ${fmtPrice(hi)}` : "—";

  const rows = Array.isArray(series) && series.length
    ? series.map(x => {
        const d = x.date;
        const mmdd = d?.includes("-") ? `${d.slice(5,7)}/${d.slice(8,10)}` : d;
        return `<div class="mktRow"><span class="mktDate">${mmdd}</span><span class="mktClose">${fmtPrice(x.close)}</span></div>`;
      }).join("")
    : `<div class="tiny muted">No history</div>`;

  return `
    <div class="mktBlock">
      <div class="mktHead">
        <div class="mktSym">${sym}</div>
        <div class="mktNow">${fmtPrice(p)}</div>
      </div>

      <div class="mktSub">
        <div class="mktDelta">
          <span class="k">1D</span> <span class="v">${fmtPct(dayPct)}</span>
          <span class="k">5D</span> <span class="v">${fmtPct(wkPct)}</span>
        </div>
        <div class="tiny muted">${rangeTxt}</div>
      </div>

      <div class="mktSpark">${sparklineSVG(series)}</div>

      <div class="mktTable">
        <div class="mktRow mktRowHead"><span>Date</span><span>Close</span></div>
        ${rows}
      </div>
    </div>
  `;
}

/* ---------------- Boot ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  const el = {
    dateLine: document.getElementById("dateLine"),
    clock: document.getElementById("clock"),
    themeBtn: document.getElementById("themeToggle"),

    backBtn: document.getElementById("backBtn"),
    mktIcon: document.getElementById("mktIcon"),

    mktStatus: document.getElementById("mktStatus"),
    mktUpdated: document.getElementById("mktUpdated"),
    mktGrid: document.getElementById("mktGrid"),

    loaded: document.getElementById("loaded")
  };

  updateStageScale();
  window.addEventListener("resize", updateStageScale);

  const tick = () => {
    const t = chicagoParts();
    applyThemeForTime(t, el.themeBtn);
    el.clock.textContent = `${t.hour}:${t.minute}`;
    el.dateLine.textContent = `${t.month}/${t.day}/${t.year} · ${t.weekday} · ${t.hour}:${t.minute}`;
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

  // Back fallback to dashboard root
  el.backBtn?.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else window.location.href = "../";
  });

  if (el.mktIcon) el.mktIcon.innerHTML = iconChart();

  try {
    const m = await loadMarketsScript();
    if (!m) throw new Error("No markets data");

    el.mktStatus.textContent = (m.in_hours === true)
      ? "Market open (live quotes)"
      : "Market closed (cached snapshot)";

    el.mktUpdated.textContent = `Data timestamp: ${m.updated_local || "—"}`;

    const syms = ["SPY", "QQQ", "IAU", "SLV"];
    el.mktGrid.innerHTML = syms.map(sym =>
      renderTickerBlock(sym, m.symbols?.[sym] ?? null, m.history?.[sym] ?? [])
    ).join("");

    const t = chicagoParts();
    el.loaded.textContent = `Loaded ${t.hour}:${t.minute}`;
  } catch (err) {
    el.mktStatus.textContent = "Markets unavailable";
    el.mktGrid.innerHTML = `<div class="tiny muted">${String(err?.message || err)}</div>`;
  }
});
