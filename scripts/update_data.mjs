import fs from "node:fs/promises";

const KEY = process.env.TWELVEDATA_API_KEY;
if (!KEY) {
  throw new Error("Missing TWELVEDATA_API_KEY (set GitHub secret or env var)");
}

const LAT = 41.8781;
const LON = -87.6298;
const TZ  = "America/Chicago";

async function fetchJSON(url) {
  const res = await fetch(url);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}: ${text.slice(0,200)}`);
  return data;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function quote(symbol) {
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(KEY)}`;
  const data = await fetchJSON(url);

  if (data?.status === "error") throw new Error(`TwelveData error: ${data.message || "unknown"}`);
  if (data?.code && data?.message) throw new Error(`TwelveData error: ${data.message}`);

  return data;
}

async function buildMarkets() {
  const [spy, iau] = await Promise.all([quote("SPY"), quote("IAU")]);

  const spyPrice = num(spy.close ?? spy.price);
  const iauPrice = num(iau.close ?? iau.price);

  if (spyPrice == null || iauPrice == null) {
    throw new Error(`Bad market data. SPY=${JSON.stringify(spy).slice(0,200)} IAU=${JSON.stringify(iau).slice(0,200)}`);
  }

  return {
    updated_iso: new Date().toISOString(),
    symbols: {
      SPY: { price: spyPrice, change: num(spy.change), percent_change: num(spy.percent_change) },
      IAU: { price: iauPrice, change: num(iau.change), percent_change: num(iau.percent_change) }
    }
  };
}

async function buildWeather() {
  const params = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    timezone: TZ,
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit"
  });

  const data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  if (!data?.current || !data?.daily) {
    throw new Error(`Bad weather data: ${JSON.stringify(data).slice(0,200)}`);
  }

  return {
    updated_iso: new Date().toISOString(),
    current: data.current,
    daily: data.daily
  };
}

await fs.mkdir("data", { recursive: true });

const [markets, weather] = await Promise.all([buildMarkets(), buildWeather()]);

await fs.writeFile("data/markets.json", JSON.stringify(markets, null, 2) + "\n", "utf8");
await fs.writeFile("data/weather.json", JSON.stringify(weather, null, 2) + "\n", "utf8");

console.log("Updated data/markets.json and data/weather.json");
