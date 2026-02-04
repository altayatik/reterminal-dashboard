const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  try {
    const qs = event.queryStringParameters || {};
    const lat = qs.lat, lon = qs.lon, tz = qs.tz;
    if (!lat || !lon || !tz) return { statusCode: 400, headers: CORS, body: "Missing lat/lon/tz" };

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      timezone: String(tz),
      current: "temperature_2m,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min",
      temperature_unit: "fahrenheit"
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!res.ok) return { statusCode: 502, headers: CORS, body: "Upstream weather error" };

    const data = await res.json();

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=600"
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: String(e?.message || e) };
  }
}
