// shared/world-clock-utils.js

export const HOME_CLOCKS = [
  { label: "Los Angeles", tz: "America/Los_Angeles" },
  { label: "Denver", tz: "America/Denver" },
  { label: "New York", tz: "America/New_York" }
];

// Fixed grid on the world-clock detail page (6 cities)
export const DETAIL_CLOCKS = [
  { label: "Los Angeles", tz: "America/Los_Angeles" },
  { label: "New York", tz: "America/New_York" },
  { label: "London", tz: "Europe/London" },
  { label: "Istanbul", tz: "Europe/Istanbul" },
  { label: "Dubai", tz: "Asia/Dubai" },
  { label: "Mumbai", tz: "Asia/Kolkata" }
];

// Default custom card (shows until user searches)
export const DEFAULT_CUSTOM_CLOCK = { label: "Chicago", tz: "America/Chicago" };

export function formatTime12h(timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date());
}

export async function resolveCityToTimezone(query) {
  const q = String(query || "").trim();
  if (!q) throw new Error("Enter a city name.");

  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("City lookup failed.");

  const data = await res.json();
  const r = data?.results?.[0];
  if (!r) throw new Error("City not found.");

  const labelParts = [r.name, r.admin1, r.country].filter(Boolean);
  const label = labelParts.join(", ");
  const tz = r.timezone;

  if (!tz) throw new Error("No timezone available for that result.");

  return { label, tz };
}
