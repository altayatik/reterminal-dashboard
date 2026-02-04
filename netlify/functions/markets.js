// netlify/functions/markets.js

export async function handler() {
  try {
    const key = process.env.TWELVEDATA_API_KEY;
    if (!key) {
      return { statusCode: 500, body: "Missing TWELVEDATA_API_KEY" };
    }

    async function quote(symbol) {
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || data?.status === "error") {
        throw new Error(data?.message || `Quote failed for ${symbol}`);
      }
      return data;
    }

    function num(v) {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }

    const [spy, iau] = await Promise.all([quote("SPY"), quote("IAU")]);

    // TwelveData quote commonly uses "close" (see their example response). :contentReference[oaicite:1]{index=1}
    const payload = {
      updated_iso: new Date().toISOString(),
      symbols: {
        SPY: {
          price: num(spy.close ?? spy.price),
          change: num(spy.change),
          percent_change: num(spy.percent_change),
        },
        IAU: {
          price: num(iau.close ?? iau.price),
          change: num(iau.change),
          percent_change: num(iau.percent_change),
        }
      }
    };

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300" // 5 min
      },
      body: JSON.stringify(payload)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err?.message || err) })
    };
  }
}
