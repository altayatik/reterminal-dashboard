// app.js

const CFG = window.DASH_CONFIG ?? {
  name: "Altay",
  lat: 41.8781,
  lon: -87.6298,
  timezone: "America/Chicago",
  use24h: true
};

const LS_WEATHER = "dash_weather_v1";
const LS_MARKETS = "dash_markets_v1";

function pad(n){ return String(n).padStart(2,"0"); }

function formatTime(d){
  const h = d.getHours(), m = d.getMinutes();
  if (CFG.use24h) return `${pad(h)}:${pad(m)}`;
  const hh = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hh}:${pad(m)} ${ampm}`;
}

function greetingForHour(h){
  if(h>=5 && h<12) return "Good morning";
  if(h>=12 && h<17) return "Good afternoon";
  if(h>=17 && h<21) return "Good evening";
  return "Good night";
}

function dateLine(d){
  const mm=pad(d.getMonth()+1), dd=pad(d.getDate()), yyyy=d.getFullYear();
  const day=d.toLocaleDateString(undefined,{weekday:"long"});
  return `${mm}/${dd}/${yyyy} · ${day} · ${formatTime(d)}`;
}

/* --- Icons (no emojis) --- */
function iconChart(){
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M7 15l3-4 3 3 5-7"></path>
  </svg>`;
}
function iconWeek(){
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="2"></rect>
    <path d="M8 2v4M16 2v4M3 9h18"></path>
  </svg>`;
}

function wxText(code){
  const m={
    0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",
    45:"Fog",48:"Fog",
    51:"Drizzle",53:"Drizzle",55:"Heavy drizzle",
    61:"Rain",63:"Rain",65:"Heavy rain",
    71:"Snow",73:"Snow",75:"Heavy snow",
    80:"Showers",81:"Showers",82:"Showers",
    95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm"
  };
  return m[code]||"—";
}

function wxIcon(code){
  const c = `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const kind =
    (code===0||code===1)?"sun":
    (code===2||code===3)?"cloud":
    (code===45||code===48)?"fog":
    (code>=51&&code<=67)?"rain":
    (code>=71&&code<=77)?"snow":
    (code>=80&&code<=82)?"rain":
    (code>=95)?"storm":"cloud";

  if(kind==="sun")return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <circle cx="12" cy="12" r="4" ${c}></circle>
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" ${c}></path>
  </svg>`;
  if(kind==="fog")return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M4 10h16M6 14h12M4 18h16" ${c}></path>
    <path d="M7 10a5 5 0 0 1 10 0" ${c}></path>
  </svg>`;
  if(kind==="rain")return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7" ${c}></path>
    <path d="M8 20l1-2M12 20l1-2M16 20l1-2" ${c}></path>
  </svg>`;
  if(kind==="snow")return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 17a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 17H7" ${c}></path>
    <path d="M9 20h.01M12 20h.01M15 20h.01" ${c}></path>
  </svg>`;
  if(kind==="storm")return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7" ${c}></path>
    <path d="M13 13l-2 4h3l-2 4" ${c}></path>
  </svg>`;
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7" ${c}></path>
  </svg>`;
}

/* --- Render helpers --- */
function renderWeek(weekEl, daily){
  weekEl.innerHTML = "";
  for(let i=0;i<7;i++){
    const box=document.createElement("div");
    box.className="day";

    const name=document.createElement("div");
    name.className="dayName";
    name.textContent = new Date(daily.time[i]).toLocaleDateString(undefined,{weekday:"short"});

    const ic=document.createElement("div");
    ic.innerHTML = wxIcon(daily.weather_code[i]);

    const temps=document.createElement("div");
    temps.className="dayTemps";
    temps.innerHTML =
      `<span>${Math.round(daily.temperature_2m_max[i])}°</span>
       <span class="lo">${Math.round(daily.temperature_2m_min[i])}°</span>`;

    box.append(name, ic, temps);
    weekEl.appendChild(box);
  }
}

function fmtPrice(v){
  return (typeof v === "number" && Number.isFinite(v)) ? `$${v.toFixed(2)}` : "--";
}

/* --- Cache-first paint --- */
function tryRenderCached(el){
  // Weather cache
  try{
    const w = JSON.parse(localStorage.getItem(LS_WEATHER) || "null");
    if (w?.current && w?.daily){
      el.wxIcon.innerHTML = wxIcon(w.current.code);
      el.wxTemp.textContent = `${w.current.temp}°`;
      el.wxDesc.textContent = w.current.text;
      el.wxHi.textContent = `${w.current.hi}°`;
      el.wxLo.textContent = `${w.current.lo}°`;
      renderWeek(el.week, w.daily);
    }
  }catch{}

  // Markets cache
  try{
    const m = JSON.parse(localStorage.getItem(LS_MARKETS) || "null");
    if (m?.symbols){
      el.spy.textContent = fmtPrice(m.symbols.SPY?.price);
      el.iau.textContent = fmtPrice(m.symbols.IAU?.price);
      if (m.updated_iso) el.mktUpdated.textContent = `Updated ${formatTime(new Date(m.updated_iso))}`;
    }
  }catch{}
}

/* --- Network loaders --- */
async function loadWeather(el){
  const params = new URLSearchParams({
    latitude: String(CFG.lat),
    longitude: String(CFG.lon),
    timezone: CFG.timezone,
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit"
  });

  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!r.ok) throw new Error("weather failed");
  const d = await r.json();

  const code = d.current.weather_code;
  const curTemp = Math.round(d.current.temperature_2m);
  const hi = Math.round(d.daily.temperature_2m_max[0]);
  const lo = Math.round(d.daily.temperature_2m_min[0]);

  el.wxIcon.innerHTML = wxIcon(code);
  el.wxTemp.textContent = `${curTemp}°`;
  el.wxDesc.textContent = wxText(code);
  el.wxHi.textContent = `${hi}°`;
  el.wxLo.textContent = `${lo}°`;

  renderWeek(el.week, d.daily);

  // store cache (small + fast)
  localStorage.setItem(LS_WEATHER, JSON.stringify({
    current: { code, temp: curTemp, hi, lo, text: wxText(code) },
    daily: d.daily
  }));
}

async function loadMarkets(el){
  const r = await fetch("/.netlify/functions/markets", { cache: "no-store" });
  if (!r.ok) throw new Error("markets failed");
  const d = await r.json();

  el.spy.textContent = fmtPrice(d?.symbols?.SPY?.price);
  el.iau.textContent = fmtPrice(d?.symbols?.IAU?.price);

  if (d?.updated_iso) el.mktUpdated.textContent = `Updated ${formatTime(new Date(d.updated_iso))}`;

  localStorage.setItem(LS_MARKETS, JSON.stringify(d));
}

/* --- Top updates --- */
function updateTop(el){
  const now = new Date();
  el.greeting.textContent = `${greetingForHour(now.getHours())}, ${CFG.name}!`;
  el.dateLine.textContent = dateLine(now);
  el.clock.textContent = formatTime(now);
}

function scheduleMinuteClock(el){
  updateTop(el);
  const ms = (60 - new Date().getSeconds())*1000 + 50;
  setTimeout(() => {
    updateTop(el);
    setInterval(() => updateTop(el), 60*1000);
  }, ms);
}

/* --- Boot --- */
document.addEventListener("DOMContentLoaded", () => {
  const el = {
    greeting: document.getElementById("greeting"),
    dateLine: document.getElementById("dateLine"),
    clock: document.getElementById("clock"),
    updated: document.getElementById("updated"),

    wxIcon: document.getElementById("wxIcon"),
    wxTemp: document.getElementById("wxTemp"),
    wxDesc: document.getElementById("wxDesc"),
    wxHi: document.getElementById("wxHi"),
    wxLo: document.getElementById("wxLo"),
    week: document.getElementById("week"),

    spy: document.getElementById("spy"),
    iau: document.getElementById("iau"),
    mktUpdated: document.getElementById("mktUpdated"),

    mktIcon: document.getElementById("mktIcon"),
    weekIcon: document.getElementById("weekIcon")
  };

  // Header icons
  if (el.mktIcon) el.mktIcon.innerHTML = iconChart();
  if (el.weekIcon) el.weekIcon.innerHTML = iconWeek();

  // 1) instant paint from cache (prevents “empty” look)
  tryRenderCached(el);

  // 2) clock
  scheduleMinuteClock(el);

  // 3) background refresh (parallel)
  Promise.allSettled([loadWeather(el), loadMarkets(el)]).finally(() => {
    if (el.updated) el.updated.textContent = `Loaded ${formatTime(new Date())}`;
  });

  // 4) periodic refresh (e-ink friendly)
  setInterval(() => loadWeather(el).catch(()=>{}), 30*60*1000);
  setInterval(() => loadMarkets(el).catch(()=>{}), 30*60*1000);
});
