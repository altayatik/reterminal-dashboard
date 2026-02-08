import {
  initStageScale,
  initTheme,
  initTopClock,
  $,
  timeParts
} from "../shared/core.js";

import { iconRoad } from "../shared/icons.js";

function fmtHHMM24(d) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    .format(d);
}

function fmtUpdated(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return fmtHHMM24(d);
}

function fmtMinutes(sec) {
  if (!Number.isFinite(sec)) return "--";
  const m = Math.round(sec / 60);
  return `${m} min`;
}

function fmtDistanceMiles(meters) {
  if (!Number.isFinite(meters)) return "--";
  const mi = meters / 1609.344;
  return `${mi.toFixed(mi >= 10 ? 0 : 1)} mi`;
}

function statusFromRatio(ratio) {
  if (ratio == null || !Number.isFinite(ratio)) return "--";
  if (ratio < 1.20) return "Light";
  if (ratio < 1.50) return "Medium";
  if (ratio < 2.00) return "Heavy";
  return "Severe";
}

function getApiBase() {
  return window.DASH_CONFIG?.dataApiBase || "https://dashboard-data-api.vercel.app";
}

async function fetchCommute(from, to) {
  const base = getApiBase();
  const url = new URL(`${base.replace(/\/$/, "")}/api/commute`);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);

  const r = await fetch(url.toString(), {
    headers: { "accept": "application/json" }
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Non-JSON response from /api/commute");
  }
}

function setFooterTrafficAndLoaded(updatedIso) {
  const footer = $("footerLine");
  if (!footer) return;

  const tp = timeParts();
  const loaded = `Loaded ${tp.hour}:${tp.minute}`;

  let traffic = "Traffic --:--";
  if (updatedIso) {
    const d = new Date(updatedIso);
    if (!Number.isNaN(d.getTime())) traffic = `Traffic ${fmtHHMM24(d)}`;
  }

  footer.textContent = `${traffic} · ${loaded}`;
}

function clearFields() {
  const ids = ["status", "travelTime", "delayTime", "noTrafficTime", "distance", "updated"];
  for (const id of ids) {
    const el = $(id);
    if (el) el.textContent = "--";
  }
}

function renderCommute(data) {
  const statusLine = $("statusLine");

  const route = data?.route || {};
  const travelSec = Number(route.travel_time_sec);
  const delaySec = Number(route.traffic_delay_sec);
  const distM = Number(route.distance_m);
  const ratio = Number(route.ratio);

  const noTrafficSec = Number.isFinite(travelSec) && Number.isFinite(delaySec)
    ? Math.max(0, travelSec - delaySec)
    : NaN;

  const fromLabel = data?.from?.label || "";
  const toLabel = data?.to?.label || "";
  const updatedIso = data?.updated_iso || "";

  if (statusLine) {
    const left = fromLabel ? fromLabel.split(",")[0] : "From";
    const right = toLabel ? toLabel.split(",")[0] : "To";
    statusLine.textContent = `${left} → ${right}`;
  }

  const st = statusFromRatio(ratio);

  $("status").textContent = st;
  $("travelTime").textContent = fmtMinutes(travelSec);
  $("delayTime").textContent = Number.isFinite(delaySec) ? `+${fmtMinutes(delaySec)}` : "--";
  $("noTrafficTime").textContent = fmtMinutes(noTrafficSec);
  $("distance").textContent = fmtDistanceMiles(distM);
  $("updated").textContent = updatedIso ? fmtUpdated(updatedIso) : "--";

  setFooterTrafficAndLoaded(updatedIso);
}

function setError(msg) {
  const statusLine = $("statusLine");
  if (statusLine) statusLine.textContent = msg;
  clearFields();
  setFooterTrafficAndLoaded(null);
}

function syncInputsFromUrl() {
  const qs = new URLSearchParams(window.location.search);
  const from = qs.get("from") || "";
  const to = qs.get("to") || "";
  $("fromInput").value = from;
  $("toInput").value = to;
  return { from, to };
}

function updateUrl(from, to) {
  const url = new URL(window.location.href);
  if (from) url.searchParams.set("from", from); else url.searchParams.delete("from");
  if (to) url.searchParams.set("to", to); else url.searchParams.delete("to");
  window.history.replaceState({}, "", url.toString());
}

document.addEventListener("DOMContentLoaded", async () => {
  const isEink = document.body.classList.contains("eink");
  if (!isEink) initStageScale();

  initTheme($("themeToggle"));
  initTopClock({ clockEl: $("clock"), dateLineEl: $("dateLine"), themeBtn: $("themeToggle") });

  if ($("trafficIcon")) $("trafficIcon").innerHTML = iconRoad();

  $("backBtn").addEventListener("click", () => {
    window.location.href = "../";
  });

  $("routeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = $("fromInput").value.trim();
    const t = $("toInput").value.trim();
    updateUrl(f, t);

    if (!f || !t) {
      setError("Enter both departure and destination.");
      return;
    }

    $("statusLine").textContent = "Loading…";
    clearFields();

    try {
      const data = await fetchCommute(f, t);
      renderCommute(data);
    } catch (err) {
      setError(`Error: ${err?.message || "Failed to load route"}`);
    }
  });

  const { from, to } = syncInputsFromUrl();

  // Footer default
  setFooterTrafficAndLoaded(null);

  // Auto-load if URL has both fields
  if (from && to) {
    $("statusLine").textContent = "Loading…";
    clearFields();
    try {
      const data = await fetchCommute(from, to);
      renderCommute(data);
    } catch (err) {
      setError(`Error: ${err?.message || "Failed to load route"}`);
    }
  }
});
