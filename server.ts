import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import { Readable } from "stream";
import youtubesearchapi from 'youtube-search-api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ============================================================
// BASE64 & XOR ENCODING HELPERS
// ============================================================
function b64e(v: string): string {
  return Buffer.from(String(v || ""), "utf8").toString("base64").replace(/[+/=]/g, (c) => c === "+" ? "-" : c === "/" ? "_" : "");
}
function b64d(v: string): string {
  try { let t = String(v || "").replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; return Buffer.from(t, "base64").toString("utf8"); } catch { return String(v || ""); }
}
function xore(s: string, k = "xena"): string {
  let r = ""; for (let i = 0; i < s.length; i++) r += String.fromCharCode(s.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  return btoa(unescape(encodeURIComponent(r))).replace(/[+/=]/g, (c) => c === "+" ? "-" : c === "/" ? "_" : "");
}
function xord(s: string, k = "xena"): string {
  try { let t = s.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; const d = decodeURIComponent(escape(atob(t))); let r = ""; for (let i = 0; i < d.length; i++) r += String.fromCharCode(d.charCodeAt(i) ^ k.charCodeAt(i % k.length)); return r; } catch { return s; }
}

// ============================================================
// YOUTUBE SEARCH API
// ============================================================
app.get('/api/yt/search', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query) return res.json([]);
    const result = await youtubesearchapi.GetListByKeyword(query, false, 15, [{ type: 'video' }]);
    const items = (result.items || []).map((item: any) => ({
      id: item.id, title: item.title || 'Untitled', channel: item.channelTitle || item.ownerChannelTitle || 'Unknown',
      duration: item.isLive ? 'LIVE' : (item.lengthText || item.length || 'HD'),
      views: item.isLive ? 'LIVE NOW' : (item.viewCountText || item.shortViewCountText || '100K views'),
      published: item.publishedTimeText || item.publishedAt || 'Recently',
      thumbnail: item.thumbnail?.thumbnails?.[item.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`
    }));
    res.json(items);
  } catch (e: any) { res.json([]); }
});

app.get('/api/yt/channel', async (req, res) => {
  try {
    const name = (req.query.name as string) || '';
    if (!name) return res.json({ name: 'Unknown', handle: '@unknown', subscribers: '0', videosCount: '0', bio: '', banner: '', recentlyPosted: [], mostPopular: [] });
    const channelVideos = await youtubesearchapi.GetListByKeyword(name, false, 12, [{ type: 'video' }]);
    const videos = (channelVideos.items || []).map((item: any) => ({
      id: item.id, title: item.title || 'Untitled', channel: item.channelTitle || name,
      duration: item.isLive ? 'LIVE' : (item.lengthText || 'HD'),
      views: item.shortViewCountText || '100K views', published: item.publishedTimeText || 'Recently',
      thumbnail: item.thumbnail?.thumbnails?.[item.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`
    }));
    res.json({
      name, channelId: '', handle: `@${name.toLowerCase().replace(/\s+/g, '')}`,
      subscribers: 'Sandbox Mode', videosCount: `${videos.length}+ videos`,
      bio: `${name} is a creator on YouTube. Browse their content securely through XENA's sandbox player.`,
      banner: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&auto=format&fit=crop',
      recentlyPosted: videos.slice(0, 6), mostPopular: [...videos].sort(() => Math.random() - 0.5).slice(0, 6)
    });
  } catch (e: any) { res.json({ name: req.query.name || 'Unknown', handle: '@unknown', subscribers: '0', videosCount: '0', bio: '', banner: '', recentlyPosted: [], mostPopular: [] }); }
});

app.get('/api/yt/trending', async (_req, res) => {
  try {
    const cats = ['music', 'gaming', 'education', 'technology', 'vlog'];
    const proms = cats.map(c => youtubesearchapi.GetListByKeyword(c, false, 4, [{ type: 'video' }]));
    const results = await Promise.allSettled(proms);
    const all: any[] = [];
    results.forEach(r => { if (r.status === 'fulfilled' && r.value.items) r.value.items.forEach((i: any) => all.push({ id: i.id, title: i.title || 'Untitled', channel: i.channelTitle || i.ownerChannelTitle || 'Unknown', duration: i.isLive ? 'LIVE' : (i.lengthText || 'HD'), views: i.shortViewCountText || '100K views', published: i.publishedTimeText || 'Recently', thumbnail: i.thumbnail?.thumbnails?.[i.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${i.id}/mqdefault.jpg` })); });
    const seen = new Set();
    res.json(all.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; }).slice(0, 20));
  } catch (e: any) { res.json([]); }
});

// ============================================================
// FREE AI CHAT - Pollinations
// ============================================================
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ response: "cheese", timestamp: new Date().toLocaleTimeString() });
  const start = Date.now();
  let rt = "";
  const l = message.toLowerCase();

  if (l === "cheese" || l.includes("say cheese")) {
    const silly = ["tomato","giraffe","pancake","waffle","sneaker","pickle","biscuit","banana","squid","muffin","cactus","peanut","jellyfish","toaster","penguin"];
    rt = silly[Math.floor(Math.random() * silly.length)];
  } else if (l.includes("how") && (l.includes("xena") || l.includes("work"))) {
    rt = "bet bro. xena fetches sites through the backend, rewrites all the links so they stay inside the sandbox, and strips security headers so everything loads in the iframe. ts clean.";
  } else if (l.includes("homework") || l.includes("math") || l.includes("science") || l.includes("essay") || l.includes("algebra") || l.includes("history")) {
    rt = "ay i got u. drop the problem and i'll walk u through it step by step. ion do the work for u but i'll explain ts so u actually learn.";
  } else {
    try {
      const c = new AbortController();
      setTimeout(() => c.abort(), 5000);
      const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent("You are a chill teen tutor. Answer casually with slang. Replace 'this' with 'ts'. Keep it short: " + message.slice(0, 300)), { signal: c.signal });
      if (p.ok) { const t = await p.text(); if (t && t.trim().length > 5) rt = t.trim(); }
    } catch {}
    if (!rt) { const g = ["cheese.","tomato.","yo sup bro.","giraffe.","wassup.","pancake.","yo.","pickle.","whats good.","banana.","muffin.","sup.","cactus.","bro.","peanut."]; rt = g[Math.floor(Math.random() * g.length)]; }
  }
  res.json({ response: rt, tokens: Math.ceil(rt.length / 4), elapsedMs: Date.now() - start });
});

// ============================================================
// YOUTUBE VIEW PAGE
// ============================================================
app.get("/view", (req, res) => {
  res.sendFile(path.resolve(process.cwd(), "frontend.html"));
});

// ============================================================
// THE PROXY ENGINE — rewrites HTML, routes through server
// ============================================================
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function rewriteHtml(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);
  $("a[href]").each((_, el) => { const h = $(el).attr("href"); if (h && !h.startsWith("#") && !h.startsWith("javascript:")) { try { $(el).attr("href", "/fetch/" + b64e(new URL(h, baseUrl).href)); } catch {} } });
  $("form[action]").each((_, el) => { const a = $(el).attr("action"); if (a) { try { $(el).attr("action", "/fetch/" + b64e(new URL(a, baseUrl).href)); } catch {} } });
  $("img[src]").each((_, el) => { const s = $(el).attr("src"); if (s) { try { $(el).attr("src", "/fetch/" + b64e(new URL(s, baseUrl).href)); } catch {} } });
  $("script[src]").each((_, el) => { const s = $(el).attr("src"); if (s) { try { $(el).attr("src", "/fetch/" + b64e(new URL(s, baseUrl).href)); } catch {} } });
  $("link[href]").each((_, el) => { const h = $(el).attr("href"); if (h) { try { $(el).attr("href", "/fetch/" + b64e(new URL(h, baseUrl).href)); } catch {} } });
  $("[style]").each((_, el) => { const s = $(el).attr("style"); if (s && s.includes("url(")) { $(el).attr("style", s.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (m: string, u: string) => { try { return `url(/fetch/${b64e(new URL(u, baseUrl).href)})`; } catch { return m; } })); } });
  return $.html();
}

// Proxy fetch route — handles /fetch/<base64url>
app.all("/fetch/*", async (req, res) => {
  const encoded = req.path.replace("/fetch/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let targetUrl: string;
  try { targetUrl = b64d(encoded); new URL(targetUrl); } catch { return res.status(400).send("Invalid encoded URL"); }
  try {
    const resp = await fetch(targetUrl, {
      headers: { "User-Agent": UA, "Accept": req.headers["accept"] || "*/*", "Accept-Language": "en-US,en;q=0.5" },
      redirect: "follow",
    });
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("text/html")) {
      const html = await resp.text();
      const rewritten = rewriteHtml(html, targetUrl);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      return res.status(resp.status).send(rewritten);
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      return res.status(resp.status).send(buf);
    }
  } catch (err: any) {
    console.error(`[Fetch Error] ${targetUrl}: ${err.message}`);
    return res.status(502).send(`Fetch error: ${err.message}`);
  }
});

// Base64 gateway route
app.all("/proxy/*", async (req, res) => {
  const encoded = req.path.replace("/proxy/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing encoded URL");
  let targetUrl: string;
  try { targetUrl = b64d(encoded); new URL(targetUrl); } catch { return res.status(400).send("Invalid"); }
  try {
    const resp = await fetch(targetUrl, {
      headers: { "User-Agent": UA, "Accept": req.headers["accept"] || "*/*" },
      redirect: "follow",
    });
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("text/html")) {
      const html = await resp.text();
      const rewritten = rewriteHtml(html, targetUrl);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      return res.status(resp.status).send(rewritten);
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      return res.status(resp.status).send(buf);
    }
  } catch (err: any) { return res.status(502).send(`Proxy error: ${err.message}`); }
});

// XOR gateway
app.all("/gateway/*", async (req, res) => {
  const encoded = req.path.replace("/gateway/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing");
  let targetUrl: string;
  try { targetUrl = xord(encoded); new URL(targetUrl); } catch { return res.status(400).send("Invalid"); }
  try {
    const resp = await fetch(targetUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("text/html")) {
      const html = await resp.text();
      const rewritten = rewriteHtml(html, targetUrl);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      return res.status(resp.status).send(rewritten);
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      return res.status(resp.status).send(buf);
    }
  } catch (err: any) { return res.status(502).send(`Gateway error: ${err.message}`); }
});

// Service worker
app.get("/sw.js", (req, res) => {
  res.type("application/javascript").send(`
self.addEventListener("install",(e)=>{self.skipWaiting();});
self.addEventListener("activate",(e)=>{e.waitUntil(clients.claim());});
self.addEventListener("fetch",(e)=>{
  const u=new URL(e.request.url);
  if(u.pathname==="/"||u.pathname.startsWith("/assets/")||u.pathname.endsWith(".js")||u.pathname.endsWith(".css")||u.pathname.endsWith(".png")||u.pathname.endsWith(".svg")||u.pathname.endsWith(".ico")||u.pathname.endsWith(".woff2")) return;
  if(u.pathname.startsWith("/fetch/")||u.pathname.startsWith("/proxy/")||u.pathname.startsWith("/gateway/")){e.respondWith(handleProxy(e.request));return;}
  if(u.hostname!==self.location.hostname){e.respondWith(fetch("/fetch/"+btoa(u.href).replace(/[+/=]/g,c=>c==="+"?"-":c==="/"?"_":"")));}
});
async function handleProxy(r){try{const u=new URL(r.url);const p=u.pathname;const b64=p.substring(p.indexOf("/",1)+1);const t=atob(b64.replace(/-/g,"+").replace(/_/g,""));const re=await fetch(t,{headers:{"User-Agent":navigator.userAgent}});return re;}catch(e){return new Response("Proxy error: "+e.message,{status:502});}}`);
});

// ============================================================
// DYNAMIC ASSET HANDLER — MUST be AFTER proxy routes
// ============================================================
app.get("/:prefix([a-z0-9]{5})/:filename", async (req, res) => {
  const { prefix, filename } = req.params;
  const cacheDir = path.join(process.cwd(), "cache", prefix);
  const cacheFile = path.join(cacheDir, filename);
  if (fs.existsSync(cacheFile)) {
    if (filename.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
    else if (filename.endsWith(".js")) res.setHeader("Content-Type", "application/javascript");
    else if (filename.endsWith(".json")) res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    return res.sendFile(cacheFile);
  }
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const targetUrl = `https://raw.githubusercontent.com/lucideproxy/svg/main/${prefix}/${filename}`;
  try {
    let response = await fetch(targetUrl);
    if (!response.ok) response = await fetch(`https://raw.githubusercontent.com/lucideproxy/svg/master/${prefix}/${filename}`);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(cacheFile, buffer);
      if (filename.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
      else if (filename.endsWith(".js")) res.setHeader("Content-Type", "application/javascript");
      else if (filename.endsWith(".json")) res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=31536000");
      return res.send(buffer);
    } else {
      return res.status(response.status).send(`Failed to fetch dynamic asset ${prefix}/${filename}`);
    }
  } catch (err: any) {
    return res.status(500).send(`Error fetching dynamic asset: ${err.message}`);
  }
});

// ============================================================
// CORS PROXY HELPER
// ============================================================
app.get("/api/cors", async (req, res) => {
  const target = req.query.url as string;
  if (!target) return res.status(400).send("Missing ?url=");
  try {
    const c = new AbortController();
    setTimeout(() => c.abort(), 10000);
    const r = await fetch(target, { headers: { "User-Agent": UA }, redirect: "follow", signal: c.signal });
    res.setHeader("Access-Control-Allow-Origin", "*");
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("text/html")) {
      const html = await r.text();
      const rewritten = rewriteHtml(html, target);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      return res.status(r.status).send(rewritten);
    } else {
      res.setHeader("Content-Type", ct);
      return res.status(r.status).send(Buffer.from(await r.arrayBuffer()));
    }
  } catch (err: any) { return res.status(502).send(`CORS error: ${err.message}`); }
});

// ============================================================
// DEV / PRODUCTION STATIC SERVING
// ============================================================
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`[XENA] Beta Online on 0.0.0.0:${PORT}`);
  });
}
bootstrap();
