// shared/icons.js
// Single source of truth for all SVG icons (stroke-based, e-ink friendly).

const base = `fill="none" stroke="currentColor" stroke-width="2"
stroke-linecap="round" stroke-linejoin="round"`;

export function iconWeek() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <rect ${base} x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line ${base} x1="16" y1="2" x2="16" y2="6"></line>
    <line ${base} x1="8" y1="2" x2="8" y2="6"></line>
    <line ${base} x1="3" y1="10" x2="21" y2="10"></line>
  </svg>`;
}

export function iconClock() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle ${base} cx="12" cy="12" r="9"></circle>
    <path ${base} d="M12 7v6l4 2"></path>
  </svg>`;
}

export function iconChart() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <polyline ${base} points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline ${base} points="17 6 23 6 23 12"></polyline>
  </svg>`;
}

export function iconWeather(code) {
  const kind =
    (code === 0 || code === 1) ? "sun" :
    (code === 2 || code === 3) ? "cloud" :
    (code === 45 || code === 48) ? "fog" :
    (code >= 51 && code <= 67) ? "rain" :
    (code >= 71 && code <= 77) ? "snow" :
    (code >= 80 && code <= 82) ? "rain" :
    (code >= 95) ? "storm" : "cloud";

  if (kind === "sun") return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle ${base} cx="12" cy="12" r="4"></circle>
    <path ${base} d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path>
  </svg>`;

  if (kind === "fog") return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path ${base} d="M4 10h16M6 14h12M4 18h16"></path>
    <path ${base} d="M7 10a5 5 0 0 1 10 0"></path>
  </svg>`;

  if (kind === "rain") return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path ${base} d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7"></path>
    <path ${base} d="M8 20l1-2M12 20l1-2M16 20l1-2"></path>
  </svg>`;

  if (kind === "snow") return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path ${base} d="M7 17a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 17H7"></path>
    <path ${base} d="M9 20h.01M12 20h.01M15 20h.01"></path>
  </svg>`;

  if (kind === "storm") return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path ${base} d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7"></path>
    <path ${base} d="M13 13l-2 4h3l-2 4"></path>
  </svg>`;

  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path ${base} d="M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 1 1 18 18H7"></path>
  </svg>`;
}
