import fs from "node:fs/promises";

const KEY = process.env.TWELVEDATA_API_KEY;
if (!KEY) throw new Error("Missing TWELVEDATA_API_KEY");

const LAT = 41.8781;
const LON = -87.6298;
const TZ  = "America/Chicago";

async function j(url) {
  const r = await fetch(url);
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0,200)}`);
  try { return JSON.parse(t); } catch { throw new Error(`Bad JSON: ${t.slice(0,200)}`); }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function quote(sym) {
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(KEY)}`;
  const d = await j(url);
  if (d?.status === "error" || (d?.code && d?.message)) throw new Error(`TwelveData ${sym}: ${d.message}`);
  const p = num(d.close ?? d.price);
  if (p == null) throw new Error(`Bad price for ${sym}: ${JSON.stringify(d).slice(0,200)}`);
  return { price: p, change: num(d.change), percent_change: num(d.percent_change) };
}

async function weather() {
  const qs = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    timezone: TZ,
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit"
  });
  const d = await j(`https://api.open-meteo.com/v1/forecast?${qs.toString()}`);
  if (!d?.current || !d?.daily) throw new Error(`Bad weather: ${JSON.stringify(d).slice(0,200)}`);
  return { current: d.current, daily: d.daily };
}

await fs.mkdir("data", { recursive: true });

const [spy, iau, w] = await Promise.all([
  quote("SPY:US"),
  quote("IAU:US"),
  weather()
]);

const now = new Date().toISOString();

const marketsObj = {
  updated_iso: now,
  symbols: {
    SPY: spy,
    IAU: iau
  }
};

const weatherObj = {
  updated_iso: now,
  current: w.current,
  daily: w.daily
};

// Keep JSON too (optional but nice)
await fs.writeFile("data/markets.json", JSON.stringify(marketsObj, null, 2) + "\n", "utf8");
await fs.writeFile("data/weather.json", JSON.stringify(weatherObj, null, 2) + "\n", "utf8");

// SenseCraft-safe embedded JS
const banner = `// AUTO-GENERATED. DO NOT EDIT.\n`;
await fs.writeFile("data/markets.js", banner + `window.DASH_DATA = window.DASH_DATA || {}; window.DASH_DATA.markets = ${JSON.stringify(marketsObj)};\n`, "utf8");
await fs.writeFile("data/weather.js", banner + `window.DASH_DATA = window.DASH_DATA || {}; window.DASH_DATA.weather = ${JSON.stringify(weatherObj)};\n`, "utf8");

console.log("OK wrote data/*.json and data/*.js");
