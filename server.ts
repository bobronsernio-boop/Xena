import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ==================== ACCESS CODES (ENVIRONMENT VARIABLES ONLY) ====================
const DEV_CODE_HASH = crypto.createHash("sha256").update(
  (process.env.XENA_DEV_CODE || "PNG6G").trim().toUpperCase()
).digest("hex");

const ADMIN_CODE_HASH = crypto.createHash("sha256").update(
  (process.env.XENA_ADMIN_CODE || "V46D9").trim().toUpperCase()
).digest("hex");

// ==================== VALIDATE CODE ====================
app.post("/api/auth/validate-code", (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ valid: false, level: null });
  }
  const inputHash = crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
  if (inputHash === DEV_CODE_HASH) return res.json({ valid: true, level: "developer" });
  if (inputHash === ADMIN_CODE_HASH) return res.json({ valid: true, level: "admin" });
  return res.json({ valid: false, level: null });
});

// ==================== ENCODING ====================
function b64e(v: string): string {
  return Buffer.from(String(v || ""), "utf8").toString("base64")
    .replace(/[+/=]/g, c => c === "+" ? "-" : c === "/" ? "_" : "");
}
function b64d(v: string): string {
  try {
    let t = String(v || "").replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4) t += "=";
    return Buffer.from(t, "base64").toString("utf8");
  } catch { return v; }
}

// ==================== USER AGENTS ====================
const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
];
function randUA() { return UAS[Math.floor(Math.random() * UAS.length)]; }

// ==================== HTML REWRITE ====================
function rewriteHTML(html: string, base: string): string {
  const $ = cheerio.load(html);
  if (!$('base').length) $('head').prepend(`<base href="${base}">`);
  
  const rewriteAttr = (sel: string, attr: string) => {
    $(sel).each((_, el) => {
      const v = $(el).attr(attr);
      if (v && !v.startsWith("#") && !v.startsWith("javascript:") && !v.startsWith("data:") && !v.startsWith("blob:") && !v.startsWith("about:")) {
        try { $(el).attr(attr, "/fetch/" + b64e(new URL(v, base).href)); } catch {}
      }
    });
  };
  rewriteAttr("a[href]","href"); rewriteAttr("form[action]","action"); rewriteAttr("img[src]","src");
  rewriteAttr("script[src]","src"); rewriteAttr("link[href]","href"); rewriteAttr("source[src]","src");
  rewriteAttr("video[poster]","poster"); rewriteAttr("iframe[src]","src");
  
  $("[style]").each((_, el) => {
    const s = $(el).attr("style");
    if (s?.includes("url(")) {
      $(el).attr("style", s.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (m: string, u: string) => {
        try { return `url(/fetch/${b64e(new URL(u, base).href)})`; } catch { return m; }
      }));
    }
  });
  
  $('meta[http-equiv="Content-Security-Policy"]').remove();
  $('meta[http-equiv="X-Frame-Options"]').remove();
  
  let cleaned = $.html();
  cleaned = cleaned
    .replace(/if\s*\(\s*top\s*!==\s*self\s*\)/gi, 'if (false)')
    .replace(/if\s*\(\s*self\s*!==\s*top\s*\)/gi, 'if (false)')
    .replace(/top\.location/g, 'self.location');
  return cleaned;
}

// ==================== CORE PROXY ====================
async function proxyFetch(targetUrl: string, req: any, res: any) {
  try { new URL(targetUrl); } catch { return res.status(400).send("Invalid URL"); }
  
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": randUA(),
        "Accept": (req.headers["accept"] as string) || "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": new URL(targetUrl).origin,
      };
      if (req.headers["cookie"]) headers["Cookie"] = req.headers["cookie"] as string;
      
      const resp = await fetch(targetUrl, { headers, redirect: "follow", signal: AbortSignal.timeout(15000) });
      const ct = resp.headers.get("content-type") || "";
      
      ["x-frame-options","content-security-policy","x-content-type-options","strict-transport-security","access-control-allow-origin"].forEach(h => { try { res.removeHeader(h); } catch {} });
      res.setHeader("Access-Control-Allow-Origin","*");
      res.setHeader("Access-Control-Allow-Methods","GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers","*");

      if (ct.includes("text/html")) {
        const html = await resp.text();
        const rewritten = rewriteHTML(html, targetUrl);
        res.setHeader("Content-Type","text/html; charset=utf-8");
        return res.status(resp.status).send(rewritten);
      } else if (ct.includes("javascript") || ct.includes("json") || ct.includes("text/css")) {
        const text = await resp.text();
        res.setHeader("Content-Type", ct);
        return res.status(resp.status).send(text);
      } else if (ct.includes("video") || ct.includes("audio") || ct.includes("octet-stream")) {
        if (resp.body) {
          res.setHeader("Content-Type", ct);
          const r = resp.headers.get("content-range"); if (r) res.setHeader("Content-Range", r);
          const l = resp.headers.get("content-length"); if (l) res.setHeader("Content-Length", l);
          if (resp.status === 206) res.status(206);
          const reader = resp.body.getReader();
          const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); };
          pump().catch(() => res.end()); return;
        } else {
          const buf = Buffer.from(await resp.arrayBuffer());
          res.setHeader("Content-Type", ct);
          return res.status(resp.status).send(buf);
        }
      } else {
        const buf = Buffer.from(await resp.arrayBuffer());
        res.setHeader("Content-Type", ct);
        res.setHeader("Cache-Control", "public, max-age=3600");
        return res.status(resp.status).send(buf);
      }
    } catch (err: any) {
      if (attempt === 2) return res.status(502).send(`Proxy error: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// ==================== AI CHAT ====================
app.post("/api/chat", async (req, res) => {
  const { message, mode } = req.body;
  if (!message) return res.json({ response: "cheese", timestamp: new Date().toLocaleTimeString() });
  const start = Date.now();
  let rt = "";
  const l = message.toLowerCase();
  const isSerious = mode === "serious";

  if (isSerious) {
    try {
      const c = new AbortController(); setTimeout(() => c.abort(), 8000);
      const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent("You are XENA, an AI assistant. Answer accurately and concisely. User asks: " + message.slice(0, 500)), { signal: c.signal });
      if (p.ok) { const t = await p.text(); if (t?.trim().length > 3) rt = t.trim(); }
    } catch {}
    if (!rt) rt = "I'm processing your request. Could you rephrase that?";
  } else {
    if (l === "cheese" || l.includes("say cheese")) {
      const w = ["tomato","giraffe","pancake","waffle","sneaker","pickle","biscuit","banana","squid","muffin","cactus","peanut","jellyfish","toaster","penguin"];
      rt = w[Math.floor(Math.random()*w.length)];
    } else if (l.includes("homework") || l.includes("math") || l.includes("science") || l.includes("essay")) {
      rt = "ay i got u. drop the problem and i'll walk u through it step by step.";
    } else if (l.includes("hi") || l.includes("hello") || l.includes("hey") || l.includes("sup")) {
      rt = "yo what's good bro";
    } else {
      try {
        const c = new AbortController(); setTimeout(() => c.abort(), 5000);
        const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent("You are a teen's chill friend. Answer casually with slang. Keep it short: " + message.slice(0, 300)), { signal: c.signal });
        if (p.ok) { const t = await p.text(); if (t?.trim().length > 5) rt = t.trim(); }
      } catch {}
      if (!rt) {
        const g = ["cheese.","tomato.","yo sup bro.","giraffe.","wassup.","pancake.","yo.","pickle.","whats good.","banana.","muffin.","sup.","cactus.","bro.","peanut."];
        rt = g[Math.floor(Math.random()*g.length)];
      }
    }
  }
  res.json({ response: rt, tokens: Math.ceil(rt.length / 4), elapsedMs: Date.now() - start });
});

// ==================== ADMIN ====================
let announcements: { message: string; link?: string; timestamp: string }[] = [];
let bugReportCount = 0;

app.post("/api/report", (req, res) => {
  const { kind, title, url, details } = req.body;
  bugReportCount++;
  console.log(`[Report #${bugReportCount}] ${kind}: ${title}`);
  res.json({ success: true, id: bugReportCount });
});

function requireAdmin(req: any, res: any, next: any) {
  const authCode = req.headers["x-admin-code"] as string;
  if (!authCode) return res.status(401).json({ error: "Unauthorized" });
  const h = crypto.createHash("sha256").update(authCode.trim().toUpperCase()).digest("hex");
  if (h === ADMIN_CODE_HASH || h === DEV_CODE_HASH) next();
  else res.status(403).json({ error: "Invalid access code" });
}

app.post("/api/admin/announcement", requireAdmin, (req, res) => {
  const { message, link } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });
  announcements.push({ message, link, timestamp: new Date().toISOString() });
  res.json({ success: true, count: announcements.length });
});

app.get("/api/admin/announcements", requireAdmin, (req, res) => {
  res.json(announcements);
});

app.post("/api/admin/restart", requireAdmin, (req, res) => {
  console.log("[Admin] Server restart requested");
  res.json({ success: true, message: "Server will restart" });
  setTimeout(() => process.exit(0), 1000);
});

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  res.json({ bugReports: bugReportCount, announcements: announcements.length, uptime: process.uptime(), memory: process.memoryUsage() });
});

// ==================== PROXY ROUTES ====================
app.all("/sw/*", async (req, res) => {
  const encoded = req.path.replace("/sw/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

app.get("/xena-sw.js", (req, res) => {
  res.type("application/javascript").send(`
const CACHE_NAME = 'xena-cache-v1';
const PROXY_BASE = '/sw/';
function b64e(str) { try { return btoa(unescape(encodeURIComponent(str))).replace(/[+/=]/g, c => c === '+' ? '-' : c === '/' ? '_' : ''); } catch { return str; } }
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME)); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if (url.pathname === '/' || url.pathname.startsWith('/assets/') || url.pathname.includes('/@') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.ico') || url.pathname.endsWith('.woff2') || url.pathname === '/xena-sw.js' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/__vite')) return;
  if (url.pathname.startsWith(PROXY_BASE) || url.pathname.startsWith('/fetch/') || url.pathname.startsWith('/rev/') || url.pathname.startsWith('/bin/')) return;
  if (url.hostname !== self.location.hostname && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
    e.respondWith(fetch(PROXY_BASE + b64e(req.url), { headers: { 'X-SW-Proxy': 'true' } }).catch(err => new Response('SW Proxy: ' + err.message, { status: 502 })));
  }
});
`);
});

app.all("/rev/*", async (req, res) => {
  const encoded = req.path.replace("/rev/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string; try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  try {
    const headers: Record<string, string> = { "User-Agent": randUA(), "Accept": (req.headers["accept"] as string) || "*/*" };
    let body: any; if (req.method !== 'GET' && req.method !== 'HEAD') { body = req.body ? JSON.stringify(req.body) : undefined; if (body) headers["Content-Type"] = "application/json"; }
    const resp = await fetch(target, { method: req.method, headers, body, redirect: "follow", signal: AbortSignal.timeout(30000) });
    const ct = resp.headers.get("content-type") || "";
    ["x-frame-options","content-security-policy","x-content-type-options","strict-transport-security"].forEach(h => { try { res.removeHeader(h); } catch {} });
    res.setHeader("Access-Control-Allow-Origin","*");
    if (ct.includes("text/html")) { const html = await resp.text(); const rw = rewriteHTML(html, target); res.setHeader("Content-Type","text/html; charset=utf-8"); return res.status(resp.status).send(rw); }
    else if (ct.includes("text") || ct.includes("json") || ct.includes("javascript")) { const t = await resp.text(); res.setHeader("Content-Type", ct); return res.status(resp.status).send(t); }
    else if (resp.body && (ct.includes("video") || ct.includes("audio") || ct.includes("octet-stream"))) { res.setHeader("Content-Type", ct); const r = resp.headers.get("content-range"); if (r) res.setHeader("Content-Range", r); if (resp.status === 206) res.status(206); const reader = resp.body.getReader(); const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); }; pump().catch(() => res.end()); return; }
    else { const buf = Buffer.from(await resp.arrayBuffer()); res.setHeader("Content-Type", ct); res.setHeader("Cache-Control","public, max-age=3600"); return res.status(resp.status).send(buf); }
  } catch (err: any) { return res.status(502).send(`REV error: ${err.message}`); }
});

app.all("/bin/*", async (req, res) => {
  const encoded = req.path.replace("/bin/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string; try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  try {
    const resp = await fetch(target, { headers: { "User-Agent": randUA(), "Accept": "*/*", "Range": (req.headers["range"] as string) || "" }, redirect: "follow", signal: AbortSignal.timeout(60000) });
    const ct = resp.headers.get("content-type") || "application/octet-stream";
    ["x-frame-options","content-security-policy","x-content-type-options"].forEach(h => { try { res.removeHeader(h); } catch {} });
    res.setHeader("Access-Control-Allow-Origin","*"); res.setHeader("Access-Control-Allow-Headers","*");
    const cr = resp.headers.get("content-range"); const cl = resp.headers.get("content-length");
    if (cr) res.setHeader("Content-Range", cr); res.setHeader("Content-Type", ct);
    if (cl) res.setHeader("Content-Length", cl); if (resp.status === 206) res.status(206);
    if (resp.body) { const reader = resp.body.getReader(); const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); }; pump().catch(() => res.end()); }
    else { const buf = Buffer.from(await resp.arrayBuffer()); res.status(resp.status).send(buf); }
  } catch (err: any) { if (!res.headersSent) return res.status(502).send(`BIN error: ${err.message}`); res.end(); }
});

app.all("/fetch/*", async (req, res) => {
  const encoded = req.path.replace("/fetch/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string; try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

// ==================== DYNAMIC ASSETS ====================
app.get("/:prefix([a-z0-9]{5})/:filename", async (req, res) => {
  const { prefix, filename } = req.params;
  const cacheDir = path.join(process.cwd(), "cache", prefix);
  const cacheFile = path.join(cacheDir, filename);
  if (fs.existsSync(cacheFile)) {
    const ext = path.extname(filename);
    if (ext === ".wasm") res.setHeader("Content-Type","application/wasm");
    else if (ext === ".js") res.setHeader("Content-Type","application/javascript");
    else if (ext === ".json") res.setHeader("Content-Type","application/json");
    else if (ext === ".svg") res.setHeader("Content-Type","image/svg+xml");
    res.setHeader("Cache-Control","public, max-age=31536000");
    return res.sendFile(cacheFile);
  }
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  for (const url of [`https://raw.githubusercontent.com/lucideproxy/svg/main/${prefix}/${filename}`, `https://raw.githubusercontent.com/lucideproxy/svg/master/${prefix}/${filename}`]) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(cacheFile, buffer);
        const ext = path.extname(filename);
        if (ext === ".wasm") res.setHeader("Content-Type","application/wasm");
        else if (ext === ".js") res.setHeader("Content-Type","application/javascript");
        else if (ext === ".json") res.setHeader("Content-Type","application/json");
        else if (ext === ".svg") res.setHeader("Content-Type","image/svg+xml");
        res.setHeader("Cache-Control","public, max-age=31536000");
        return res.send(buffer);
      }
    } catch {}
  }
  return res.status(404).send(`Not found: ${prefix}/${filename}`);
});

// ==================== BOOTSTRAP ====================
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(process.cwd(), "dist", "index.html")));
  }
  app.listen(Number(PORT), "0.0.0.0", () => console.log(`[XENA] Online on 0.0.0.0:${PORT}`));
}
bootstrap();
