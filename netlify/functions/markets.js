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
    const key = process.env.TWELVEDATA_API_KEY;
    if (!key) return { statusCode: 500, headers: CORS, body: "Missing API key" };

    async function quote(symbol) {
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data?.status === "error") throw new Error(data?.message || `Quote failed for ${symbol}`);
      return data;
    }

    const [spy, iau] = await Promise.all([quote("SPY"), quote("IAU")]);

    const payload = {
      updated_iso: new Date().toISOString(),
      symbols: {
        // TwelveData commonly provides "close"; keep fallback to "price"
        SPY: { price: Number(spy.close ?? spy.price) || null },
        IAU: { price: Number(iau.close ?? iau.price) || null }
      }
    };

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300"
      },
      body: JSON.stringify(payload),
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
}
