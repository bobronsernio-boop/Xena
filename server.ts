import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import youtubesearchapi from 'youtube-search-api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
  
  // Add <base> tag so relative URLs resolve correctly
  if (!$('base').length) {
    $('head').prepend(`<base href="${base}">`);
  }
  
  const rewriteAttr = (selector: string, attr: string) => {
    $(selector).each((_, el) => {
      const v = $(el).attr(attr);
      if (v && !v.startsWith("#") && !v.startsWith("javascript:") && 
          !v.startsWith("data:") && !v.startsWith("blob:") && !v.startsWith("about:")) {
        try {
          const fullUrl = new URL(v, base).href;
          $(el).attr(attr, "/fetch/" + b64e(fullUrl));
        } catch {}
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

  // Rewrite CSS url() references
  $("[style]").each((_, el) => {
    const s = $(el).attr("style");
    if (s && s.includes("url(")) {
      $(el).attr("style", s.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (m: string, u: string) => {
        try { return `url(/fetch/${b64e(new URL(u, base).href)})`; } catch { return m; }
      }));
    }
  });

  // Remove meta tags that block embedding
  $('meta[http-equiv="Content-Security-Policy"]').remove();
  $('meta[http-equiv="X-Frame-Options"]').remove();
  
  // Remove frame-busting JavaScript
  const htmlStr = $.html();
  const cleaned = htmlStr
    .replace(/if\s*\(\s*top\s*!==\s*self\s*\)/gi, 'if (false)')
    .replace(/if\s*\(\s*self\s*!==\s*top\s*\)/gi, 'if (false)')
    .replace(/top\.location/g, 'self.location');
  
  return cleaned;
}

// ==================== CORE PROXY FETCH ====================
async function proxyFetch(targetUrl: string, req: any, res: any) {
  try {
    new URL(targetUrl);
  } catch {
    return res.status(400).send("Invalid URL");
  }

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": randUA(),
        "Accept": req.headers["accept"] as string || "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": new URL(targetUrl).origin,
      };
      
      if (req.headers["cookie"]) {
        headers["Cookie"] = req.headers["cookie"] as string;
      }

      const resp = await fetch(targetUrl, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });

      const ct = resp.headers.get("content-type") || "";
      
      // Strip ALL security headers that block iframe embedding
      const headersToRemove = [
        "x-frame-options", "content-security-policy", "x-content-type-options",
        "strict-transport-security", "access-control-allow-origin"
      ];
      headersToRemove.forEach(h => {
        try { res.removeHeader(h); } catch {}
      });
      
      // Set permissive CORS
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
        // Stream binary data for media
        if (resp.body) {
          res.setHeader("Content-Type", ct);
          const range = resp.headers.get("content-range");
          if (range) res.setHeader("Content-Range", range);
          const len = resp.headers.get("content-length");
          if (len) res.setHeader("Content-Length", len);
          if (resp.status === 206) res.status(206);
          
          const reader = resp.body.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
            res.end();
          };
          pump().catch(() => res.end());
          return;
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
      if (attempt === maxRetries) {
        return res.status(502).send(`Proxy error: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

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
    const all: any[] = [];
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.items) {
        r.value.items.forEach((i: any) => all.push({
          id: i.id, title: i.title || 'Untitled',
          channel: i.channelTitle || i.ownerChannelTitle || 'Unknown',
          duration: i.isLive ? 'LIVE' : (i.lengthText || 'HD'),
          views: i.shortViewCountText || '100K views',
          published: i.publishedTimeText || 'Recently',
          thumbnail: i.thumbnail?.thumbnails?.[i.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${i.id}/mqdefault.jpg`
        }));
      }
    });
    const seen = new Set();
    res.json(all.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; }).slice(0, 20));
  } catch { res.json([]); }
});

app.get('/api/yt/channel', async (req, res) => {
  try {
    const name = (req.query.name as string) || '';
    if (!name) return res.json({ name: 'Unknown', handle: '@unknown', subscribers: '0', videosCount: '0', bio: '', banner: '', recentlyPosted: [], mostPopular: [] });
    const cv = await youtubesearchapi.GetListByKeyword(name, false, 12, [{ type: 'video' }]);
    const vids = (cv.items || []).map((i: any) => ({
      id: i.id, title: i.title || 'Untitled', channel: i.channelTitle || name,
      duration: i.isLive ? 'LIVE' : (i.lengthText || 'HD'),
      views: i.shortViewCountText || '100K views', published: i.publishedTimeText || 'Recently',
      thumbnail: i.thumbnail?.thumbnails?.[i.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${i.id}/mqdefault.jpg`
    }));
    res.json({
      name, channelId: '', handle: `@${name.toLowerCase().replace(/\s+/g, '')}`,
      subscribers: 'Sandbox Mode', videosCount: `${vids.length}+ videos`,
      bio: `${name} is a creator on YouTube. Browse their content securely through XENA's sandbox player.`,
      banner: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&auto=format&fit=crop',
      recentlyPosted: vids.slice(0, 6),
      mostPopular: [...vids].sort(() => Math.random() - 0.5).slice(0, 6)
    });
  } catch { res.json({ name: req.query.name || 'Unknown', handle: '@unknown', subscribers: '0', videosCount: '0', bio: '', banner: '', recentlyPosted: [], mostPopular: [] }); }
});

// ==================== AI CHAT ====================
app.post("/api/chat", async (req, res) => {
  const { message, mode } = req.body;
  if (!message) return res.json({ response: "cheese", timestamp: new Date().toLocaleTimeString() });
  
  const start = Date.now();
  let rt = "";
  const l = message.toLowerCase();
  const isSerious = mode === "serious";

  if (isSerious) {
    // Serious mode - use Pollinations as actual AI
    try {
      const c = new AbortController(); setTimeout(() => c.abort(), 8000);
      const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent(
        "You are XENA, a helpful AI assistant. Answer the user's question accurately and concisely. User asks: " + message.slice(0, 500)
      ), { signal: c.signal });
      if (p.ok) { const t = await p.text(); if (t && t.trim().length > 3) rt = t.trim(); }
    } catch {}
    if (!rt) rt = "I'm processing your request. Could you rephrase that?";
  } else {
    // Chill mode - fun responses
    if (l === "cheese" || l.includes("say cheese")) {
      const w = ["tomato", "giraffe", "pancake", "waffle", "sneaker", "pickle", "biscuit", "banana", "squid", "muffin", "cactus", "peanut", "jellyfish", "toaster", "penguin"];
      rt = w[Math.floor(Math.random() * w.length)];
    } else if (l.includes("homework") || l.includes("math") || l.includes("science") || l.includes("essay") || l.includes("algebra") || l.includes("history")) {
      rt = "ay i got u. drop the problem and i'll walk u through it step by step.";
    } else if (l.includes("hi") || l.includes("hello") || l.includes("hey") || l.includes("sup")) {
      rt = "yo what's good bro";
    } else {
      try {
        const c = new AbortController(); setTimeout(() => c.abort(), 5000);
        const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent(
          "You are a teen's chill friend. Answer casually with some slang. Keep it short and fun: " + message.slice(0, 300)
        ), { signal: c.signal });
        if (p.ok) { const t = await p.text(); if (t && t.trim().length > 5) rt = t.trim(); }
      } catch {}
      if (!rt) {
        const g = ["cheese.", "tomato.", "yo sup bro.", "giraffe.", "wassup.", "pancake.", "yo.", "pickle.", "whats good.", "banana.", "muffin.", "sup.", "cactus.", "bro.", "peanut."];
        rt = g[Math.floor(Math.random() * g.length)];
      }
    }
  }
  
  res.json({ response: rt, tokens: Math.ceil(rt.length / 4), elapsedMs: Date.now() - start });
});

// ==================== YOUTUBE VIEW ====================
app.get("/view", (req, res) => {
  res.sendFile(path.resolve(process.cwd(), "frontend.html"));
});

// ==================== ADMIN API ====================
// Store announcements
let announcements: { message: string; link?: string; timestamp: string }[] = [];

app.post("/api/admin/announcement", (req, res) => {
  const { message, link } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });
  announcements.push({ message, link, timestamp: new Date().toISOString() });
  console.log(`[Announcement] ${message}${link ? ` -> ${link}` : ''}`);
  res.json({ success: true, count: announcements.length });
});

app.get("/api/admin/announcements", (req, res) => {
  res.json(announcements);
});

app.post("/api/admin/restart", (req, res) => {
  console.log("[Admin] Server restart requested");
  res.json({ success: true, message: "Server will restart" });
  setTimeout(() => process.exit(0), 1000);
});

// Get bug reports count
let bugReportCount = 0;
app.post("/api/report", (req, res) => {
  const { kind, title, url, details } = req.body;
  bugReportCount++;
  console.log(`[Report #${bugReportCount}] ${kind}: ${title} | ${details?.slice(0, 100)}...`);
  res.json({ success: true, id: bugReportCount });
});

app.get("/api/admin/stats", (req, res) => {
  res.json({
    bugReports: bugReportCount,
    announcements: announcements.length,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// ==================== PROXY ROUTES ====================

// Service Worker proxy
app.all("/sw/*", async (req, res) => {
  const encoded = req.path.replace("/sw/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

// Service Worker registration script - FIXED to route through /sw/ properly
app.get("/xena-sw.js", (req, res) => {
  res.type("application/javascript").send(`
const CACHE_NAME = 'xena-cache-v1';
const PROXY_BASE = '/sw/';

function b64e(str) {
  try { return btoa(unescape(encodeURIComponent(str))).replace(/[+/=]/g, c => c === '+' ? '-' : c === '/' ? '_' : ''); } catch { return str; }
}
function b64d(str) {
  try { let t = str.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; return decodeURIComponent(escape(atob(t))); } catch { return str; }
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  
  // NEVER intercept XENA's own assets
  if (url.pathname === '/' || url.pathname.startsWith('/assets/') || 
      url.pathname.includes('/@') || url.pathname.startsWith('/node_modules/') ||
      url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || 
      url.pathname.endsWith('.ico') || url.pathname.endsWith('.woff2') ||
      url.pathname === '/xena-sw.js' || url.pathname.startsWith('/api/') ||
      url.pathname === '/view' || url.pathname.startsWith('/__vite')) {
    return;
  }
  
  // If already a proxy request, let it through to server
  if (url.pathname.startsWith(PROXY_BASE) || url.pathname.startsWith('/fetch/') || 
      url.pathname.startsWith('/rev/') || url.pathname.startsWith('/bin/')) {
    return; // Let browser fetch from server normally
  }
  
  // Intercept cross-origin requests - route through proxy
  if (url.hostname !== self.location.hostname && 
      !url.hostname.includes('localhost') && 
      !url.hostname.includes('127.0.0.1')) {
    const proxyUrl = PROXY_BASE + b64e(req.url);
    e.respondWith(fetch(proxyUrl, {
      headers: { 'X-SW-Proxy': 'true' }
    }).catch(err => new Response('SW Proxy error: ' + err.message, { status: 502 })));
  }
});
`);
});

// Reverse proxy
app.all("/rev/*", async (req, res) => {
  const encoded = req.path.replace("/rev/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  
  try {
    const headers: Record<string, string> = {
      "User-Agent": randUA(),
      "Accept": req.headers["accept"] as string || "*/*",
      "Accept-Language": "en-US,en;q=0.9",
    };
    
    let body: any = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = req.body ? JSON.stringify(req.body) : undefined;
      if (body) headers["Content-Type"] = "application/json";
    }

    const resp = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });

    const ct = resp.headers.get("content-type") || "";
    const headersToRemove = ["x-frame-options", "content-security-policy", "x-content-type-options", "strict-transport-security"];
    headersToRemove.forEach(h => { try { res.removeHeader(h); } catch {} });
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    if (ct.includes("text/html")) {
      const html = await resp.text();
      const rewritten = rewriteHTML(html, target);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(resp.status).send(rewritten);
    } else if (ct.includes("text") || ct.includes("json") || ct.includes("javascript")) {
      const text = await resp.text();
      res.setHeader("Content-Type", ct);
      return res.status(resp.status).send(text);
    } else if (resp.body && (ct.includes("video") || ct.includes("audio") || ct.includes("octet-stream"))) {
      res.setHeader("Content-Type", ct);
      const range = resp.headers.get("content-range");
      if (range) res.setHeader("Content-Range", range);
      if (resp.status === 206) res.status(206);
      const reader = resp.body.getReader();
      const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); };
      pump().catch(() => res.end());
      return;
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.status(resp.status).send(buf);
    }
  } catch (err: any) {
    return res.status(502).send(`Reverse proxy error: ${err.message}`);
  }
});

// Binary stream proxy
app.all("/bin/*", async (req, res) => {
  const encoded = req.path.replace("/bin/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }

  try {
    const resp = await fetch(target, {
      headers: {
        "User-Agent": randUA(),
        "Accept": "*/*",
        "Range": req.headers["range"] as string || "",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(60000),
    });

    const ct = resp.headers.get("content-type") || "application/octet-stream";
    const headersToRemove = ["x-frame-options", "content-security-policy", "x-content-type-options"];
    headersToRemove.forEach(h => { try { res.removeHeader(h); } catch {} });
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    
    const contentRange = resp.headers.get("content-range");
    const contentLength = resp.headers.get("content-length");
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.setHeader("Content-Type", ct);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (resp.status === 206) res.status(206);

    if (resp.body) {
      const reader = resp.body.getReader();
      const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); };
      pump().catch(() => res.end());
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.status(resp.status).send(buf);
    }
  } catch (err: any) {
    if (!res.headersSent) return res.status(502).send(`Binary stream error: ${err.message}`);
    res.end();
  }
});

// Legacy fetch proxy
app.all("/fetch/*", async (req, res) => {
  const encoded = req.path.replace("/fetch/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
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
  
  const urls = [
    `https://raw.githubusercontent.com/lucideproxy/svg/main/${prefix}/${filename}`,
    `https://raw.githubusercontent.com/lucideproxy/svg/master/${prefix}/${filename}`
  ];
  
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
  
  return res.status(404).send(`Asset not found: ${prefix}/${filename}`);
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
    const vite = await createViteServer({ 
      server: { middlewareMode: true }, 
      appType: "spa" 
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`[XENA] Online on 0.0.0.0:${PORT}`);
    console.log(`[XENA] Developer Code: PNG6G`);
    console.log(`[XENA] Admin Code: V46D9`);
  });
}
bootstrap();
