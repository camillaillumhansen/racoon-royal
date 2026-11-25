// Racoon Royal - lodtrækning om koncertbilletter i Royal Arena
// Ingen afhængigheder - kører med ren Node (18+).

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tilmeldinger.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "skiftmig";
// Valgfri deadline, fx "2026-12-02T23:59:00+01:00"
const DEADLINE = process.env.DEADLINE ? new Date(process.env.DEADLINE) : null;

const CONCERTS = {
  phoebe: { navn: "Phoebe Bridgers", dato: "Fredag 11. december 2026 kl. 20.00" },
  gilli: { navn: "Gilli", dato: "Fredag 18. december 2026 kl. 20.00" },
};

// ---------- Data ----------
fs.mkdirSync(DATA_DIR, { recursive: true });

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { entries: [], winners: { phoebe: [], gilli: [] } };
  }
}
function save(db) {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

// ---------- Hjælpere ----------
function send(res, status, body, type = "text/html; charset=utf-8", extra = {}) {
  res.writeHead(status, { "Content-Type": type, ...extra });
  res.end(body);
}
function json(res, status, obj) {
  send(res, status, JSON.stringify(obj), "application/json; charset=utf-8");
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e5) req.destroy();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function isAdmin(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) return false;
  const [, pass] = Buffer.from(h.slice(6), "base64").toString().split(":");
  const a = Buffer.from(pass || "");
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function askLogin(res) {
  send(res, 401, "Log ind for at se tilmeldinger", "text/plain; charset=utf-8", {
    "WWW-Authenticate": 'Basic realm="Racoon Royal admin"',
  });
}
function isOpen() {
  return !DEADLINE || new Date() < DEADLINE;
}

// ---------- Admin-side ----------
function adminPage(db) {
  const count = (k) => db.entries.filter((e) => e.valg.includes(k)).length;
  const rows = db.entries
    .map(
      (e) => `<tr>
        <td>${esc(e.navn)}</td><td>${esc(e.firma)}</td><td>${esc(e.email)}</td><td>${esc(e.telefon)}</td>
        <td>${e.valg.map((k) => esc(CONCERTS[k].navn)).join(" + ")}</td><td>${esc(e.plusone)}</td>
        <td>${new Date(e.tid).toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" })}</td>
      </tr>`
    )
    .join("");
  const winnerBlock = (k) => {
    const w = db.winners[k] || [];
    return `<div class="card">
      <h2>${esc(CONCERTS[k].navn)}</h2>
      <p class="muted">${esc(CONCERTS[k].dato)} · ${count(k)} lodder</p>
      ${
        w.length
          ? `<ol>${w.map((x) => `<li><b>${esc(x.navn)}</b> - ${esc(x.firma)} · tager ${esc((x.plusone || "").toLowerCase())} med<br><span class="muted">${esc(x.email)} ${esc(x.telefon)}</span></li>`).join("")}</ol>`
          : `<p class="muted">Ingen vindere trukket endnu.</p>`
      }
      <form method="post" action="/admin/draw" onsubmit="return confirm('Træk 2 vindere til ${esc(CONCERTS[k].navn)}? Tidligere vindere overskrives.')">
        <input type="hidden" name="koncert" value="${k}">
        <button>🎲 Træk 2 vindere</button>
      </form>
    </div>`;
  };
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Racoon Royal - admin</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0d0d0f;color:#eee;margin:0;padding:32px}
  h1{color:#d9b45a;margin:0 0 4px} .muted{color:#999;font-size:14px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:24px 0}
  .card{background:#18181c;border:1px solid #2a2a30;border-radius:14px;padding:20px}
  .card h2{margin:0 0 4px;font-size:20px} ol{padding-left:20px} li{margin:8px 0}
  button,.btn{background:#d9b45a;color:#111;border:0;border-radius:999px;padding:10px 18px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}
  table{width:100%;border-collapse:collapse;font-size:14px;margin-top:12px}
  th,td{text-align:left;padding:8px;border-bottom:1px solid #2a2a30} th{color:#d9b45a}
</style></head><body>
<h1>Racoon Royal</h1>
<p class="muted">${db.entries.length} tilmeldinger i alt · ${isOpen() ? "Åben for tilmelding" : "Lukket for tilmelding"}</p>
<div class="grid">${winnerBlock("phoebe")}${winnerBlock("gilli")}</div>
<a class="btn" href="/admin/csv">⬇ Download alle som CSV (Excel)</a>
<table><thead><tr><th>Navn</th><th>Fra</th><th>Email</th><th>Telefon</th><th>Koncert</th><th>Tager med</th><th>Tilmeldt</th></tr></thead>
<tbody>${rows || `<tr><td colspan="7" class="muted">Ingen tilmeldinger endnu</td></tr>`}</tbody></table>
</body></html>`;
}

function csv(db) {
  const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const head = ["Navn", "Fra", "Email", "Telefon", "Phoebe Bridgers (11/12)", "Gilli (18/12)", "Tager med", "Tilmeldt"];
  const lines = db.entries.map((e) =>
    [e.navn, e.firma, e.email, e.telefon, e.valg.includes("phoebe") ? "Ja" : "", e.valg.includes("gilli") ? "Ja" : "", e.plusone, e.tid].map(q).join(";")
  );
  return "﻿" + [head.map(q).join(";"), ...lines].join("\r\n");
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");

  try {
    // Forside
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return send(res, 200, fs.readFileSync(path.join(__dirname, "public", "index.html")));
    }
    if (req.method === "GET" && /^\/(phoebe|gilli)\.jpg$/.test(url.pathname)) {
      return send(res, 200, fs.readFileSync(path.join(__dirname, "public", url.pathname.slice(1))), "image/jpeg", {
        "Cache-Control": "public, max-age=86400",
      });
    }
    if (req.method === "GET" && url.pathname === "/api/status") {
      return json(res, 200, { open: isOpen() });
    }

    // Tilmelding
    if (req.method === "POST" && url.pathname === "/api/tilmeld") {
      if (!isOpen()) return json(res, 403, { error: "Lodtrækningen er lukket." });
      let b;
      try { b = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: "Ugyldig forespørgsel." }); }

      const navn = String(b.navn || "").trim().slice(0, 100);
      const firma = String(b.firma || "").trim().slice(0, 150);
      const email = String(b.email || "").trim().toLowerCase().slice(0, 150);
      const telefon = String(b.telefon || "").trim().slice(0, 30);
      const PLUS = ["Kollega", "Partner", "Ven", "Familie", "Ved ikke endnu"];
      const plusone = PLUS.includes(b.plusone) ? b.plusone : "";
      const valg = Array.isArray(b.valg) ? b.valg.filter((k) => CONCERTS[k]) : [];
      const kanDagen = b.kanDagen === true;

      if (!navn || !firma || !email) return json(res, 400, { error: "Udfyld dit navn, hvor du kommer fra og din email." });
      if (!plusone) return json(res, 400, { error: "Vælg hvem du vil tage med." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: "Tjek din email - den ser ikke helt rigtig ud." });
      if (!valg.length) return json(res, 400, { error: "Vælg mindst én koncert." });
      if (!kanDagen) return json(res, 400, { error: "Bekræft at du kan på dagen." });

      const db = load();
      const existing = db.entries.find((e) => e.email === email);
      const entry = { navn, firma, email, telefon, plusone, valg: [...new Set(valg)], tid: new Date().toISOString() };
      if (existing) Object.assign(existing, entry);
      else db.entries.push(entry);
      save(db);
      return json(res, 200, { ok: true, opdateret: !!existing });
    }

    // Admin
    if (url.pathname.startsWith("/admin")) {
      if (!isAdmin(req)) return askLogin(res);
      const db = load();

      if (req.method === "GET" && url.pathname === "/admin") return send(res, 200, adminPage(db));
      if (req.method === "GET" && url.pathname === "/admin/csv") {
        return send(res, 200, csv(db), "text/csv; charset=utf-8", {
          "Content-Disposition": 'attachment; filename="racoon-royal-tilmeldinger.csv"',
        });
      }
      if (req.method === "POST" && url.pathname === "/admin/draw") {
        const k = new URLSearchParams(await readBody(req)).get("koncert");
        if (CONCERTS[k]) {
          const pool = db.entries.filter((e) => e.valg.includes(k));
          // Fisher-Yates med kryptografisk tilfældighed
          for (let i = pool.length - 1; i > 0; i--) {
            const j = crypto.randomInt(i + 1);
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }
          db.winners[k] = pool.slice(0, 2);
          save(db);
        }
        res.writeHead(303, { Location: "/admin" });
        return res.end();
      }
    }

    send(res, 404, "Ikke fundet", "text/plain; charset=utf-8");
  } catch (err) {
    console.error(err);
    json(res, 500, { error: "Noget gik galt - prøv igen." });
  }
});

server.listen(PORT, () => console.log(`Racoon Royal kører på port ${PORT}`));
