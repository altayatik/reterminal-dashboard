import fs from "node:fs/promises";

const KEY = process.env.TWELVEDATA_API_KEY;
if (!KEY) {
  console.error("Missing TWELVEDATA_API_KEY");
  process.exit(1);
}

// >>> Set your Chicago location here <<<
const LAT = 41.8781;
const LON = -87.6298;
const TZ  = "America/Chicago";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function quote(symbol) {
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(KEY)}`;
  const data = await fetchJSON(url);
  if (data?.status === "error") throw new Error(data?.message || `Quote error for ${symbol}`);
  return data;
}

async function buildMarkets() {
  const [spy, iau] = await Promise.all([quote("SPY"), quote("IAU")]);
  return {
    updated_iso: new Date().toISOString(),
    symbols: {
      SPY: { price: num(spy.close ?? spy.price), change: num(spy.change), percent_change: num(spy.percent_change) },
      IAU: { price: num(iau.close ?? iau.price), change: num(iau.change), percent_change: num(iau.percent_change) }
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
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const data = await fetchJSON(url);

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

console.log("Wrote data/markets.json and data/weather.json");
