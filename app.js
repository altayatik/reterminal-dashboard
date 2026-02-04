function pad(n) { return String(n).padStart(2, "0"); }

function updateClock() {
  const d = new Date();
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  document.getElementById("clock").textContent = t;
}

function log(msg) {
  const el = document.getElementById("log");
  const row = document.createElement("div");
  row.textContent = msg;
  el.appendChild(row);
  el.scrollTop = el.scrollHeight;
}

updateClock();
setInterval(updateClock, 1000);

// Starter example hook: click Status card to toggle text
const statusEl = document.getElementById("statusText");
statusEl.addEventListener("click", () => {
  statusEl.textContent = statusEl.textContent === "OK" ? "BUSY" : "OK";
  log(`Status changed to: ${statusEl.textContent}`);
});
log("App loaded.");
