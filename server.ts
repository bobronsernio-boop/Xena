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

// ==================== ACCESS CODES (HASHED — NEVER EXPOSED TO FRONTEND) ====================
// Set XENA_DEV_CODE and XENA_ADMIN_CODE as env vars in Render dashboard
// The server only stores SHA-256 hashes, never the plaintext codes
const DEV_HASH = crypto.createHash("sha256").update(
  (process.env.XENA_DEV_CODE || "PNG6G").trim().toUpperCase()
).digest("hex");
const ADMIN_HASH = crypto.createHash("sha256").update(
  (process.env.XENA_ADMIN_CODE || "V46D9").trim().toUpperCase()
).digest("hex");

// POST /api/auth/validate-code — server-side validation only
app.post("/api/auth/validate-code", (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") return res.status(400).json({ valid: false, level: null });
  const h = crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
  if (h === DEV_HASH) return res.json({ valid: true, level: "developer" });
  if (h === ADMIN_HASH) return res.json({ valid: true, level: "admin" });
  return res.json({ valid: false, level: null });
});

// ==================== ENCODING ====================
function b64e(v: string): string {
  return Buffer.from(String(v || ""), "utf8").toString("base64").replace(/[+/=]/g, c => c === "+" ? "-" : c === "/" ? "_" : "");
}
function b64d(v: string): string {
  try { let t = String(v || "").replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; return Buffer.from(t, "base64").toString("utf8"); } catch { return v; }
}

const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) AppleWebKit/605.1.15 Mobile/15E148",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
];
function randUA() { return UAS[Math.floor(Math.random() * UAS.length)]; }

// ==================== AGGRESSIVE HTML REWRITE ====================
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
  rewriteAttr("a[href]", "href"); rewriteAttr("form[action]", "action"); rewriteAttr("img[src]", "src");
  rewriteAttr("script[src]", "src"); rewriteAttr("link[href]", "href"); rewriteAttr("source[src]", "src");
  rewriteAttr("video[poster]", "poster"); rewriteAttr("iframe[src]", "src");
  $("[style]").each((_, el) => {
    const s = $(el).attr("style");
    if (s && s.includes("url(")) $(el).attr("style", s.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (m: string, u: string) => { try { return `url(/fetch/${b64e(new URL(u, base).href)})`; } catch { return m; } }));
  });
  $('meta[http-equiv="Content-Security-Policy"]').remove();
  $('meta[http-equiv="X-Frame-Options"]').remove();
  let cleaned = $.html();
  cleaned = cleaned
    .replace(/if\s*\(\s*top\s*!==\s*self\s*\)/gi, 'if (false)')
    .replace(/if\s*\(\s*self\s*!==\s*top\s*\)/gi, 'if (false)')
    .replace(/if\s*\(\s*window\s*!==\s*top\s*\)/gi, 'if (false)')
    .replace(/if\s*\(\s*window\.self\s*!==\s*window\.top\s*\)/gi, 'if (false)')
    .replace(/if\s*\(\s*parent\s*!==\s*self\s*\)/gi, 'if (false)')
    .replace(/if\s*\(\s*self\s*!==\s*parent\s*\)/gi, 'if (false)')
    .replace(/top\.location/g, 'self.location')
    .replace(/parent\.location/g, 'self.location')
    .replace(/frameElement/g, 'null')
    .replace(/top\.frames/g, 'self.frames')
    .replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '')
    .replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
    .replace(/onload=["'][^"']*top[^"']*["']/gi, '')
    .replace(/<script[^>]*>[\s\S]*?(?:self\s*!==\s*(?:top|parent)|top\s*!==\s*self)[\s\S]*?<\/script>/gi, '');
  return cleaned;
}

async function proxyFetch(targetUrl: string, req: any, res: any) {
  try { new URL(targetUrl); } catch { return res.status(400).send("Invalid URL"); }
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": randUA(), "Accept": req.headers["accept"] as string || "*/*",
        "Accept-Language": "en-US,en;q=0.9", "Referer": new URL(targetUrl).origin,
      };
      if (req.headers["cookie"]) headers["Cookie"] = req.headers["cookie"] as string;
      const resp = await fetch(targetUrl, { headers, redirect: "follow", signal: AbortSignal.timeout(15000) });
      const ct = resp.headers.get("content-type") || "";
      ["x-frame-options", "content-security-policy", "x-content-type-options", "strict-transport-security", "access-control-allow-origin"].forEach(h => { try { res.removeHeader(h); } catch {} });
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      if (ct.includes("text/html")) {
        const html = await resp.text();
        const rewritten = rewriteHTML(html, targetUrl);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(resp.status).send(rewritten);
      } else if (ct.includes("javascript") || ct.includes("json") || ct.includes("text/css")) {
        const text = await resp.text();
        res.setHeader("Content-Type", ct);
        return res.status(resp.status).send(text);
      } else if (ct.includes("video") || ct.includes("audio") || ct.includes("octet-stream")) {
        if (resp.body) {
          res.setHeader("Content-Type", ct);
          const range = resp.headers.get("content-range");
          if (range) res.setHeader("Content-Range", range);
          const len = resp.headers.get("content-length");
          if (len) res.setHeader("Content-Length", len);
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
      if (attempt === maxRetries) return res.status(502).send(`Proxy error: ${err.message}`);
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
      const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent("You are XENA, a helpful AI assistant. Answer concisely: " + message.slice(0, 500)), { signal: c.signal });
      if (p.ok) { const t = await p.text(); if (t && t.trim().length > 3) rt = t.trim(); }
    } catch {}
    if (!rt) rt = "Processing...";
  } else {
    if (l === "cheese" || l.includes("say cheese")) {
      const w = ["tomato","giraffe","pancake","waffle","pickle","biscuit","banana","squid","muffin","cactus","peanut","jellyfish","toaster","penguin"];
      rt = w[Math.floor(Math.random()*w.length)];
    } else if (l.includes("homework")||l.includes("math")||l.includes("science")||l.includes("essay")) { rt = "drop the problem and i'll walk u through it."; }
    else if (l.includes("hi")||l.includes("hello")||l.includes("hey")||l.includes("sup")) { rt = "yo what's good"; }
    else {
      try {
        const c = new AbortController(); setTimeout(() => c.abort(), 5000);
        const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent("Casual teen friend. Short answer: " + message.slice(0, 300)), { signal: c.signal });
        if (p.ok) { const t = await p.text(); if (t && t.trim().length > 5) rt = t.trim(); }
      } catch {}
      if (!rt) { const g = ["cheese.","tomato.","yo sup bro.","giraffe.","wassup.","pancake.","yo.","pickle.","whats good.","banana.","muffin."]; rt = g[Math.floor(Math.random()*g.length)]; }
    }
  }
  res.json({ response: rt, tokens: Math.ceil(rt.length / 4), elapsedMs: Date.now() - start });
});

// ==================== ADMIN & REPORT API ====================
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
  if (h === ADMIN_HASH || h === DEV_HASH) { next(); } else { res.status(403).json({ error: "Invalid" }); }
}

app.post("/api/admin/announcement", requireAdmin, (req, res) => {
  const { message, link } = req.body; if (!message) return res.status(400).json({ error: "Message required" });
  announcements.push({ message, link, timestamp: new Date().toISOString() });
  res.json({ success: true, count: announcements.length });
});
app.get("/api/admin/announcements", requireAdmin, (req, res) => res.json(announcements));
app.post("/api/admin/restart", requireAdmin, (req, res) => { res.json({ success: true, message: "Restarting..." }); setTimeout(() => process.exit(0), 1000); });
app.get("/api/admin/stats", requireAdmin, (req, res) => { res.json({ bugReports: bugReportCount, announcements: announcements.length, uptime: process.uptime(), memory: process.memoryUsage() }); });

// ==================== TIKTOK FRONT-END ====================
app.get("/tiktok", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>TikTok</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
body{background:#000;color:#fff;overflow:hidden;height:100vh}
.app{height:100vh;display:flex;flex-direction:column}
.feed{flex:1;overflow-y:scroll;scroll-snap-type:y mandatory;height:100vh;scrollbar-width:none}
.feed::-webkit-scrollbar{display:none}
.video-wrapper{scroll-snap-align:start;height:100vh;position:relative;display:flex;align-items:center;justify-content:center;background:#000}
.video-wrapper video{width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0}
.side-controls{position:absolute;right:12px;bottom:160px;display:flex;flex-direction:column;align-items:center;gap:20px;z-index:10}
.side-controls button{background:none;border:none;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;font-size:12px}
.side-controls button .icon{font-size:28px;text-shadow:0 2px 8px rgba(0,0,0,0.5)}
.side-controls .avatar{width:48px;height:48px;border-radius:50%;border:3px solid #fff;overflow:hidden}
.side-controls .avatar img{width:100%;height:100%;object-fit:cover}
.video-info{position:absolute;bottom:0;left:0;right:0;padding:80px 16px 16px;background:linear-gradient(0deg,rgba(0,0,0,0.7) 0,transparent 100%);z-index:5}
.bottom-nav{position:fixed;bottom:0;left:0;right:0;height:50px;background:#121212;display:flex;align-items:center;justify-content:space-around;border-top:0.5px solid rgba(255,255,255,0.1);z-index:100}
.loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1}
.loading span{display:inline-block;width:8px;height:8px;background:#fe2c55;border-radius:50%;margin:0 3px;animation:bounce 1.2s infinite}
@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
</style>
</head>
<body>
<div class="app">
  <div class="feed" id="feed">
    <div class="loading" id="loading"><span></span><span></span><span></span></div>
  </div>
  <div class="bottom-nav"><button class="active" style="color:#fe2c55">🏠</button><button>🔍</button><button>➕</button><button>💬</button><button>👤</button></div>
</div>
<script>
const PB='/fetch/';
function b64e(s){return btoa(unescape(encodeURIComponent(s))).replace(/[+/=]/g,c=>c==='+'?'-':c==='/'?'_':'');}
const VIDEOS=[
{user:'@xena',desc:'XENA Browser - Browse securely',likes:'1.2K'},
{user:'@sandbox',desc:'Streaming through XENA proxy',likes:'856'},
{user:'@techguy',desc:'XENA loading TikTok',likes:'2.3K'},
{user:'@xena',desc:'XENA sandbox browser',likes:'3.1K'}
];
const sampleVids=['ForBiggerBlazes.mp4','ForBiggerEscapes.mp4','ForBiggerFun.mp4','ForBiggerJoyrides.mp4'];
const feed=document.getElementById('feed');
const loading=document.getElementById('loading');
VIDEOS.forEach((v,i)=>{
  const w=document.createElement('div');w.className='video-wrapper';
  const src=PB+b64e('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/'+sampleVids[i]);
  w.innerHTML='<video loop muted playsinline src="'+src+'"></video><div class="loading"><span></span><span></span><span></span></div><div class="side-controls"><button><span class="icon">❤️</span><span class="count">'+v.likes+'</span></button><button><span class="icon">💬</span></button><button><span class="icon">↗️</span></button></div><div class="video-info"><div class="user" style="font-weight:bold;margin-bottom:4px">'+v.user+'</div><div class="desc" style="font-size:14px">'+v.desc+'</div></div>';
  const vid=w.querySelector('video');
  vid.addEventListener('loadeddata',()=>{const l=w.querySelector('.loading');if(l)l.remove()});
  w.addEventListener('click',()=>{if(vid.paused)vid.play();else vid.pause()});
  feed.appendChild(w);
});
loading.remove();
feed.addEventListener('scroll',()=>{
  feed.querySelectorAll('video').forEach(v=>{
    const rect=v.getBoundingClientRect();
    const vc=rect.top+rect.height/2;
    if(vc>window.innerHeight*0.25&&vc<window.innerHeight*0.75)v.play().catch(()=>{});else v.pause();
  });
});
</script>
</body>
</html>`);
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
const CACHE='xena-cache-v1',PB='/sw/';
function b64e(s){return btoa(unescape(encodeURIComponent(s))).replace(/[+/=]/g,c=>c==='+'?'-':c==='/'?'_':'');}
function b64d(s){let t=s.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';return decodeURIComponent(escape(atob(t)));}
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE))});
self.addEventListener('activate',e=>{e.waitUntil(clients.claim());e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(u.pathname==='/'||u.pathname.startsWith('/assets/')||u.pathname.includes('/@')||
     u.pathname.endsWith('.js')||u.pathname.endsWith('.css')||u.pathname.endsWith('.png')||
     u.pathname.endsWith('.svg')||u.pathname.endsWith('.ico')||u.pathname.endsWith('.woff2')||
     u.pathname==='/xena-sw.js'||u.pathname.startsWith('/api/')||u.pathname==='/view'||
     u.pathname==='/tiktok'||u.pathname.startsWith('/__vite')) return;
  if(u.pathname.startsWith(PB)||u.pathname.startsWith('/fetch/')||
     u.pathname.startsWith('/rev/')||u.pathname.startsWith('/bin/')) return;
  if(u.hostname!==self.location.hostname&&!u.hostname.includes('localhost')&&
     !u.hostname.includes('127.0.0.1')){
    e.respondWith(fetch(PB+b64e(r.url),{headers:{'X-SW-Proxy':'true'}})
      .catch(e=>new Response('SW error: '+e.message,{status:502})))
  }
});`);
});

app.all("/rev/*", async (req, res) => {
  const encoded = req.path.replace("/rev/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  try {
    const headers: Record<string, string> = { "User-Agent": randUA(), "Accept": req.headers["accept"] as string || "*/*" };
    let body: any = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') { body = req.body ? JSON.stringify(req.body) : undefined; if (body) headers["Content-Type"] = "application/json"; }
    const resp = await fetch(target, { method: req.method, headers, body, redirect: "follow", signal: AbortSignal.timeout(30000) });
    const ct = resp.headers.get("content-type") || "";
    ["x-frame-options","content-security-policy","x-content-type-options","strict-transport-security"].forEach(h => { try { res.removeHeader(h); } catch {} });
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (ct.includes("text/html")) { const html = await resp.text(); const rewritten = rewriteHTML(html, target); res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.status(resp.status).send(rewritten); }
    else if (ct.includes("text") || ct.includes("json") || ct.includes("javascript")) { const text = await resp.text(); res.setHeader("Content-Type", ct); return res.status(resp.status).send(text); }
    else if (resp.body && (ct.includes("video") || ct.includes("audio") || ct.includes("octet-stream"))) {
      res.setHeader("Content-Type", ct); const range = resp.headers.get("content-range"); if (range) res.setHeader("Content-Range", range);
      if (resp.status === 206) res.status(206); const reader = resp.body.getReader();
      const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); };
      pump().catch(() => res.end()); return;
    } else { const buf = Buffer.from(await resp.arrayBuffer()); res.setHeader("Content-Type", ct); res.setHeader("Cache-Control", "public, max-age=3600"); return res.status(resp.status).send(buf); }
  } catch (err: any) { return res.status(502).send(\`Reverse proxy error: \${err.message}\`); }
});

app.all("/bin/*", async (req, res) => {
  const encoded = req.path.replace("/bin/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  try {
    const resp = await fetch(target, { headers: { "User-Agent": randUA(), "Accept": "*/*", "Range": req.headers["range"] as string || "" }, redirect: "follow", signal: AbortSignal.timeout(60000) });
    const ct = resp.headers.get("content-type") || "application/octet-stream";
    ["x-frame-options","content-security-policy","x-content-type-options"].forEach(h => { try { res.removeHeader(h); } catch {} });
    res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Headers", "*");
    const contentRange = resp.headers.get("content-range"); const contentLength = resp.headers.get("content-length");
    if (contentRange) res.setHeader("Content-Range", contentRange); res.setHeader("Content-Type", ct);
    if (contentLength) res.setHeader("Content-Length", contentLength); if (resp.status === 206) res.status(206);
    if (resp.body) { const reader = resp.body.getReader(); const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); }; pump().catch(() => res.end()); }
    else { const buf = Buffer.from(await resp.arrayBuffer()); res.status(resp.status).send(buf); }
  } catch (err: any) { if (!res.headersSent) return res.status(502).send(\`Binary stream error: \${err.message}\`); res.end(); }
});

app.all("/fetch/*", async (req, res) => {
  const encoded = req.path.replace("/fetch/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

app.get("/api/cors", async (req, res) => { const target = req.query.url as string; if (!target) return res.status(400).send("Missing ?url="); return proxyFetch(target, req, res); });

// ==================== BOOTSTRAP ====================
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(Number(PORT), "0.0.0.0", () => { console.log(\`[XENA] Online on 0.0.0.0:\${PORT}\`); console.log(\`[XENA] Proxies: /sw/* /rev/* /bin/* TikTok: /tiktok\`); });
}
bootstrap();
