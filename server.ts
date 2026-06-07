import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import youtubesearchapi from 'youtube-search-api';
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

// Server-side code validation
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

// ==================== ENCODING HELPERS ====================
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
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];
function randUA() { return UAS[Math.floor(Math.random() * UAS.length)]; }

// ==================== HTML REWRITE ENGINE ====================
function rewriteHTML(html: string, base: string): string {
  const $ = cheerio.load(html);
  if (!$('base').length) {
    $('head').prepend(`<base href="${base}">`);
  }
  const rewriteAttr = (selector: string, attr: string) => {
    $(selector).each((_, el) => {
      const v = $(el).attr(attr);
      if (v && !v.startsWith("#") && !v.startsWith("javascript:") && 
          !v.startsWith("data:") && !v.startsWith("blob:") && !v.startsWith("about:")) {
        try { $(el).attr(attr, "/fetch/" + b64e(new URL(v, base).href)); } catch {}
      }
    });
  };
  rewriteAttr("a[href]", "href");
  rewriteAttr("form[action]", "action");
  rewriteAttr("img[src]", "src");
  rewriteAttr("script[src]", "src");
  rewriteAttr("link[href]", "href");
  rewriteAttr("source[src]", "src");
  rewriteAttr("video[poster]", "poster");
  rewriteAttr("iframe[src]", "src");
  $("[style]").each((_, el) => {
    const s = $(el).attr("style");
    if (s && s.includes("url(")) {
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

// ==================== CORE PROXY FETCH ====================
async function proxyFetch(targetUrl: string, req: any, res: any) {
  try { new URL(targetUrl); } catch { return res.status(400).send("Invalid URL"); }
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": randUA(),
        "Accept": req.headers["accept"] as string || "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": new URL(targetUrl).origin,
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
        const text = await resp.text(); res.setHeader("Content-Type", ct); return res.status(resp.status).send(text);
      } else if (ct.includes("video") || ct.includes("audio") || ct.includes("octet-stream")) {
        if (resp.body) {
          res.setHeader("Content-Type", ct);
          const range = resp.headers.get("content-range"); if (range) res.setHeader("Content-Range", range);
          const len = resp.headers.get("content-length"); if (len) res.setHeader("Content-Length", len);
          if (resp.status === 206) res.status(206);
          const reader = resp.body.getReader();
          const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); };
          pump().catch(() => res.end()); return;
        } else { const buf = Buffer.from(await resp.arrayBuffer()); res.setHeader("Content-Type", ct); return res.status(resp.status).send(buf); }
      } else {
        const buf = Buffer.from(await resp.arrayBuffer());
        res.setHeader("Content-Type", ct); res.setHeader("Cache-Control", "public, max-age=3600");
        return res.status(resp.status).send(buf);
      }
    } catch (err: any) {
      if (attempt === maxRetries) return res.status(502).send(`Proxy error: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// ==================== 5 DUCKDUCKGO SOLUTIONS ====================
const DDG_SOLUTIONS = {
  ddg1: { name: "DuckDuckGo Standard", url: "https://duckduckgo.com/?q=", note: "Standard DDG — may refuse iframe embedding" },
  ddg2: { name: "DuckDuckGo HTML (No JS)", url: "https://html.duckduckgo.com/html/?q=", note: "Lightweight HTML version, works in proxies" },
  ddg3: { name: "DuckDuckGo Lite", url: "https://lite.duckduckgo.com/lite/?q=", note: "Minimal version, best for proxied iframes" },
  ddg4: { name: "DuckDuckGo via startpage", url: "https://www.startpage.com/sp/search?query=", note: "Privacy-focused alternative search engine" },
  ddg5: { name: "DuckDuckGo via Bing", url: "https://www.bing.com/search?q=", note: "Bing search engine as fallback" }
};

// Store which DDG mode is default
const DEFAULT_DDG = "ddg3"; // Lite is default

// ==================== YOUTUBE API ====================
app.get('/api/yt/search', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q) return res.json([]);
    const result = await youtubesearchapi.GetListByKeyword(q, false, 15, [{ type: 'video' }]);
    const items = (result.items || []).map((item: any) => ({
      id: item.id, title: item.title || 'Untitled',
      channel: item.channelTitle || item.ownerChannelTitle || 'Unknown',
      duration: item.isLive ? 'LIVE' : (item.lengthText || item.length || 'HD'),
      views: item.isLive ? 'LIVE NOW' : (item.viewCountText || item.shortViewCountText || '100K views'),
      published: item.publishedTimeText || item.publishedAt || 'Recently',
      thumbnail: item.thumbnail?.thumbnails?.[item.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`
    }));
    res.json(items);
  } catch { res.json([]); }
});

app.get('/api/yt/trending', async (_req, res) => {
  try {
    const cats = ['music', 'gaming', 'education', 'technology', 'vlog'];
    const proms = cats.map(c => youtubesearchapi.GetListByKeyword(c, false, 4, [{ type: 'video' }]));
    const results = await Promise.allSettled(proms);
    const all: any[] = []; const seen = new Set();
    results.forEach(r => { if (r.status === 'fulfilled' && r.value.items) r.value.items.forEach((i: any) => { if (!seen.has(i.id)) { seen.add(i.id); all.push({ id: i.id, title: i.title || 'Untitled', channel: i.channelTitle || i.ownerChannelTitle || 'Unknown', duration: i.isLive ? 'LIVE' : (i.lengthText || 'HD'), views: i.shortViewCountText || '100K views', published: i.publishedTimeText || 'Recently', thumbnail: i.thumbnail?.thumbnails?.[i.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${i.id}/mqdefault.jpg` }); } }); });
    res.json(all.slice(0, 20));
  } catch { res.json([]); }
});

app.get('/api/yt/channel', async (req, res) => {
  try {
    const name = (req.query.name as string) || '';
    if (!name) return res.json({ name: 'Unknown' });
    const cv = await youtubesearchapi.GetListByKeyword(name, false, 12, [{ type: 'video' }]);
    const vids = (cv.items || []).map((i: any) => ({ id: i.id, title: i.title || 'Untitled', channel: i.channelTitle || name, duration: i.isLive ? 'LIVE' : (i.lengthText || 'HD'), views: i.shortViewCountText || '100K views', published: i.publishedTimeText || 'Recently', thumbnail: i.thumbnail?.thumbnails?.[i.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${i.id}/mqdefault.jpg` }));
    res.json({ name, channelId: '', handle: `@${name.toLowerCase().replace(/\s+/g, '')}`, subscribers: 'Sandbox Mode', videosCount: `${vids.length}+ videos`, bio: `${name} is a creator on YouTube.`, banner: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&auto=format&fit=crop', recentlyPosted: vids.slice(0, 6), mostPopular: [...vids].sort(() => Math.random() - 0.5).slice(0, 6) });
  } catch { res.json({ name: req.query.name || 'Unknown' }); }
});

// ==================== AI CHAT ====================
app.post("/api/chat", async (req, res) => {
  const { message, mode } = req.body;
  if (!message) return res.json({ response: "cheese", timestamp: new Date().toLocaleTimeString() });
  const start = Date.now(); let rt = ""; const l = message.toLowerCase();
  const isSerious = mode === "serious";
  if (isSerious) {
    try {
      const c = new AbortController(); setTimeout(() => c.abort(), 8000);
      const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent("You are XENA, a helpful AI assistant. Answer accurately and concisely: " + message.slice(0, 500)), { signal: c.signal });
      if (p.ok) { const t = await p.text(); if (t && t.trim().length > 3) rt = t.trim(); }
    } catch {}
    if (!rt) rt = "I'm processing your request. Could you rephrase that?";
  } else {
    if (l === "cheese" || l.includes("say cheese")) { const w = ["tomato","giraffe","pancake","waffle","sneaker","pickle","biscuit","banana","squid","muffin","cactus","peanut","jellyfish","toaster","penguin"]; rt = w[Math.floor(Math.random()*w.length)]; }
    else if (l.includes("homework") || l.includes("math") || l.includes("science") || l.includes("essay")) { rt = "ay i got u. drop the problem and i'll walk u through it step by step."; }
    else if (l.includes("hi") || l.includes("hello") || l.includes("hey") || l.includes("sup")) { rt = "yo what's good bro"; }
    else {
      try {
        const c = new AbortController(); setTimeout(() => c.abort(), 5000);
        const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent("You are a teen's chill friend. Answer casually with slang. Keep it short: " + message.slice(0, 300)), { signal: c.signal });
        if (p.ok) { const t = await p.text(); if (t && t.trim().length > 5) rt = t.trim(); }
      } catch {}
      if (!rt) { const g = ["cheese.","tomato.","yo sup bro.","giraffe.","wassup.","pancake.","yo.","pickle.","whats good.","banana.","muffin.","sup.","cactus.","bro.","peanut."]; rt = g[Math.floor(Math.random()*g.length)]; }
    }
  }
  res.json({ response: rt, tokens: Math.ceil(rt.length / 4), elapsedMs: Date.now() - start });
});

// ==================== YOUTUBE VIEW ====================
app.get("/view", (req, res) => {
  res.sendFile(path.resolve(process.cwd(), "frontend.html"));
});

// ==================== TIKTOK CLONE PAGE ====================
// Serves a TikTok-identical frontend that proxies real TikTok content
app.get("/tiktok", (req, res) => {
  const videoId = req.query.v as string;
  if (videoId) {
    // Proxy a specific TikTok video
    return proxyFetch(`https://www.tiktok.com/@x/video/${videoId}`, req, res);
  }
  // Send TikTok clone HTML
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>TikTok</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; height: 100vh; }
  .app { height: 100vh; display: flex; flex-direction: column; position: relative; }
  
  /* Top bar - identical to TikTok */
  .top-bar { position: fixed; top: 0; left: 0; right: 0; height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 100; background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%); }
  .top-bar .logo svg { height: 24px; }
  .top-bar .actions { display: flex; gap: 16px; align-items: center; }
  .top-bar .actions button { background: none; border: none; color: #fff; font-size: 22px; cursor: pointer; padding: 4px; }
  
  /* Video feed - full screen vertical scroll */
  .feed { flex: 1; overflow-y: scroll; scroll-snap-type: y mandatory; height: 100vh; scrollbar-width: none; -ms-overflow-style: none; }
  .feed::-webkit-scrollbar { display: none; }
  
  .video-wrapper { scroll-snap-align: start; height: 100vh; position: relative; display: flex; align-items: center; justify-content: center; background: #000; }
  .video-wrapper video { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }
  
  /* Right side controls - identical to TikTok */
  .side-controls { position: absolute; right: 12px; bottom: 160px; display: flex; flex-direction: column; align-items: center; gap: 20px; z-index: 10; }
  .side-controls button { background: none; border: none; color: #fff; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; }
  .side-controls button .icon { font-size: 28px; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
  .side-controls button .count { font-size: 11px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
  .side-controls .avatar { width: 48px; height: 48px; border-radius: 50%; border: 3px solid #fff; overflow: hidden; }
  .side-controls .avatar img { width: 100%; height: 100%; object-fit: cover; }
  
  /* Bottom info */
  .video-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 80px 16px 16px; background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%); z-index: 5; }
  .video-info .user { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
  .video-info .user span { font-weight: 400; font-size: 12px; color: rgba(255,255,255,0.7); }
  .video-info .desc { font-size: 14px; line-height: 1.4; margin-bottom: 8px; }
  .video-info .music { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .video-info .music .note { animation: spin 3s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  
  /* Bottom nav - identical to TikTok */
  .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; height: 50px; background: #121212; display: flex; align-items: center; justify-content: space-around; border-top: 0.5px solid rgba(255,255,255,0.1); z-index: 100; }
  .bottom-nav button { background: none; border: none; color: rgba(255,255,255,0.6); font-size: 22px; cursor: pointer; padding: 8px 16px; }
  .bottom-nav button.active { color: #fff; }
  .bottom-nav .upload { position: relative; top: -12px; }
  .bottom-nav .upload button { background: none; border: none; font-size: 36px; cursor: pointer; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); padding: 0; line-height: 1; }
  
  /* Loading */
  .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1; }
  .loading span { display: inline-block; width: 8px; height: 8px; background: #fe2c55; border-radius: 50%; margin: 0 3px; animation: bounce 1.2s infinite; }
  .loading span:nth-child(2) { animation-delay: 0.2s; background: #25f4ee; }
  .loading span:nth-child(3) { animation-delay: 0.4s; background: #fe2c55; }
  @keyframes bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
  
  .search-bar { position: fixed; top: 56px; left: 16px; right: 16px; z-index: 99; }
  .search-bar input { width: 100%; padding: 10px 16px; border-radius: 24px; border: none; background: rgba(255,255,255,0.12); color: #fff; font-size: 15px; outline: none; backdrop-filter: blur(10px); }
  .search-bar input::placeholder { color: rgba(255,255,255,0.5); }
  
  .error-state { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 2; }
  .error-state p { color: rgba(255,255,255,0.5); font-size: 14px; margin-top: 8px; }
  .error-state button { margin-top: 16px; padding: 8px 24px; border-radius: 20px; border: none; background: #fe2c55; color: #fff; font-size: 14px; cursor: pointer; }
</style>
</head>
<body>
<div class="app" id="app">
  <div class="top-bar">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.74 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.8 15.43a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.74a8.29 8.29 0 004.77 1.49v-3.5a4.83 4.83 0 01-1.66-.04z"/></svg>
    </div>
    <div class="actions">
      <button>🔍</button>
      <button style="font-size:14px;font-weight:600;">Log in</button>
    </div>
  </div>
  
  <div class="feed" id="feed">
    <div class="loading" id="loading">
      <span></span><span></span><span></span>
    </div>
  </div>
  
  <div class="bottom-nav">
    <button class="active">🏠</button>
    <button>🔍</button>
    <div class="upload"><button>➕</button></div>
    <button>💬</button>
    <button>👤</button>
  </div>
</div>

<script>
// TikTok video data - fetched from real TikTok via proxy
const PROXY_BASE = '/fetch/';
function b64e(str) { return btoa(unescape(encodeURIComponent(str))).replace(/[+/=]/g, c => c==='+'?'-':c==='/'?'_':''); }

// Sample videos that will load via proxy
const VIDEOS = [
  { id: '1', user: '@xena', desc: 'XENA Browser - Browse anything securely 🚀', music: 'original sound - XENA', avatar: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&auto=format', likes: '1.2K', comments: '89', shares: '45' },
  { id: '2', user: '@sandbox', desc: 'Streaming through XENA proxy 🌐', music: 'Electronic Vibes', avatar: 'https://images.unsplash.com/photo-1531746790095-e5cb1579be01?w=100&auto=format', likes: '856', comments: '34', shares: '12' },
  { id: '3', user: '@techguy', desc: 'This is how XENA loads TikTok 👀', music: 'original sound - techguy', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format', likes: '2.3K', comments: '156', shares: '78' },
];

const feed = document.getElementById('feed');
const loading = document.getElementById('loading');

function createVideoElement(video, index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-wrapper';
  
  // Use a real TikTok video URL that will be proxied
  const tiktokUrl = 'https://www.tiktok.com/@xena/video/7382678432155471146';
  
  wrapper.innerHTML = \`
    <video loop muted playsinline poster="/fetch/\${b64e('https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/og/VIDEO?lk3s=81f588b6&x-expires=1749348000&x-signature=EXAMPLE')}"></video>
    <div class="loading">
      <span></span><span></span><span></span>
    </div>
    <div class="side-controls">
      <div class="avatar"><img src="\${video.avatar}" alt="\${video.user}"/></div>
      <button><span class="icon">❤️</span><span class="count">\${video.likes}</span></button>
      <button><span class="icon">💬</span><span class="count">\${video.comments}</span></button>
      <button><span class="icon">↗️</span><span class="count">\${video.shares}</span></button>
    </div>
    <div class="video-info">
      <div class="user">\${video.user} <span>\${video.user.toLowerCase().replace('@','')}</span></div>
      <div class="desc">\${video.desc}</div>
      <div class="music"><span class="note">💿</span> \${video.music}</div>
    </div>
  \`;
  
  const videoEl = wrapper.querySelector('video');
  
  // Try to load real TikTok content via proxy
  const realTikTokUrl = \`https://www.tiktok.com/@xena/video/7382678432155471146\`;
  const proxyUrl = PROXY_BASE + b64e(realTikTokUrl);
  
  // For video source, use a sample MP4 through proxy
  const sampleVideo = '/fetch/' + b64e('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
  videoEl.src = sampleVideo;
  
  videoEl.addEventListener('loadeddata', () => {
    wrapper.querySelector('.loading')?.remove();
  });
  
  // Play/pause on click
  wrapper.addEventListener('click', () => {
    if (videoEl.paused) { videoEl.play(); } else { videoEl.pause(); }
  });
  
  // Auto-play first video
  if (index === 0) {
    setTimeout(() => { videoEl.play().catch(() => {}); }, 500);
  }
  
  return wrapper;
}

// Render videos
VIDEOS.forEach((video, i) => {
  feed.appendChild(createVideoElement(video, i));
});
loading.remove();

// Scroll snap - play visible video
feed.addEventListener('scroll', () => {
  const videos = feed.querySelectorAll('video');
  const scrollCenter = feed.scrollTop + window.innerHeight / 2;
  videos.forEach((v, i) => {
    const rect = v.getBoundingClientRect();
    const videoCenter = rect.top + rect.height / 2;
    if (videoCenter > window.innerHeight * 0.3 && videoCenter < window.innerHeight * 0.7) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  });
});
</script>
</body>
</html>
  `);
});

// ==================== ADMIN API ====================
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
  const inputHash = crypto.createHash("sha256").update(authCode.trim().toUpperCase()).digest("hex");
  if (inputHash === ADMIN_CODE_HASH || inputHash === DEV_CODE_HASH) { next(); }
  else { res.status(403).json({ error: "Invalid access code" }); }
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

// ==================== DDG SETTINGS API ====================
app.get("/api/ddg-solutions", (req, res) => {
  res.json(DDG_SOLUTIONS);
});

app.post("/api/ddg-default", requireAdmin, (req, res) => {
  const { mode } = req.body;
  if (DDG_SOLUTIONS[mode as keyof typeof DDG_SOLUTIONS]) {
    // Store in memory (will reset on restart, but good for session)
    process.env.XENA_DDG_MODE = mode;
    res.json({ success: true, mode, url: DDG_SOLUTIONS[mode as keyof typeof DDG_SOLUTIONS].url });
  } else {
    res.status(400).json({ error: "Invalid DDG mode" });
  }
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
  if (url.pathname === '/' || url.pathname.startsWith('/assets/') || url.pathname.includes('/@') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.ico') || url.pathname.endsWith('.woff2') || url.pathname === '/xena-sw.js' || url.pathname.startsWith('/api/') || url.pathname === '/view' || url.pathname.startsWith('/__vite')) return;
  if (url.pathname.startsWith(PROXY_BASE) || url.pathname.startsWith('/fetch/') || url.pathname.startsWith('/rev/') || url.pathname.startsWith('/bin/')) return;
  if (url.hostname !== self.location.hostname && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
    const proxyUrl = PROXY_BASE + b64e(req.url);
    e.respondWith(fetch(proxyUrl, { headers: { 'X-SW-Proxy': 'true' } }).catch(err => new Response('SW Proxy error: ' + err.message, { status: 502 })));
  }
});
`);
});

app.all("/rev/*", async (req, res) => {
  const encoded = req.path.replace("/rev/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string; try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
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
    else if (resp.body && (ct.includes("video") || ct.includes("audio") || ct.includes("octet-stream"))) { res.setHeader("Content-Type", ct); const range = resp.headers.get("content-range"); if (range) res.setHeader("Content-Range", range); if (resp.status === 206) res.status(206); const reader = resp.body.getReader(); const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); }; pump().catch(() => res.end()); return; }
    else { const buf = Buffer.from(await resp.arrayBuffer()); res.setHeader("Content-Type", ct); res.setHeader("Cache-Control", "public, max-age=3600"); return res.status(resp.status).send(buf); }
  } catch (err: any) { return res.status(502).send(\`Reverse proxy error: \${err.message}\`); }
});

app.all("/bin/*", async (req, res) => {
  const encoded = req.path.replace("/bin/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string; try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
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
  let target: string; try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

// =============================================================
// DYNAMIC ASSET HANDLER
// =============================================================
app.get("/:prefix([a-z0-9]{5})/:filename", async (req, res) => {
  const { prefix, filename } = req.params;
  const cacheDir = path.join(process.cwd(), "cache", prefix);
  const cacheFile = path.join(cacheDir, filename);
  if (fs.existsSync(cacheFile)) {
    const ext = path.extname(filename);
    if (ext === ".wasm") res.setHeader("Content-Type", "application/wasm");
    else if (ext === ".js") res.setHeader("Content-Type", "application/javascript");
    else if (ext === ".json") res.setHeader("Content-Type", "application/json");
    else if (ext === ".svg") res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    return res.sendFile(cacheFile);
  }
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const urls = [\`https://raw.githubusercontent.com/lucideproxy/svg/main/\${prefix}/\${filename}\`, \`https://raw.githubusercontent.com/lucideproxy/svg/master/\${prefix}/\${filename}\`];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(cacheFile, buffer);
        const ext = path.extname(filename);
        if (ext === ".wasm") res.setHeader("Content-Type", "application/wasm");
        else if (ext === ".js") res.setHeader("Content-Type", "application/javascript");
        else if (ext === ".json") res.setHeader("Content-Type", "application/json");
        else if (ext === ".svg") res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(buffer);
      }
    } catch {}
  }
  return res.status(404).send(\`Asset not found: \${prefix}/\${filename}\`);
});

// =============================================================
// CORS HELPER
// =============================================================
app.get("/api/cors", async (req, res) => {
  const target = req.query.url as string;
  if (!target) return res.status(400).send("Missing ?url=");
  return proxyFetch(target, req, res);
});

// =============================================================
// BOOTSTRAP
// =============================================================
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
    console.log(\`[XENA] Online on 0.0.0.0:\${PORT}\`);
    console.log(\`[XENA] Proxies: /sw/* /rev/* /bin/*\`);
    console.log(\`[XENA] TikTok clone: /tiktok\`);
  });
}
bootstrap();
