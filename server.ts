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
];
function randUA() { return UAS[Math.floor(Math.random() * UAS.length)]; }

// ==================== HTML REWRITE ENGINE ====================
function rewriteHTML(html: string, base: string): string {
  const $ = cheerio.load(html);
  
  // Add <base> tag so relative URLs resolve correctly inside the iframe
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

  // Remove blocking headers injected by the page itself
  $('meta[http-equiv="Content-Security-Policy"]').remove();
  $('meta[http-equiv="X-Frame-Options"]').remove();

  return $.html();
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
      
      // Forward cookies if present
      if (req.headers["cookie"]) {
        headers["Cookie"] = req.headers["cookie"] as string;
      }

      const resp = await fetch(targetUrl, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });

      const ct = resp.headers.get("content-type") || "";
      
      // Strip security headers so iframe works
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.removeHeader("X-Content-Type-Options");
      res.setHeader("Access-Control-Allow-Origin", "*");

      if (ct.includes("text/html")) {
        const html = await resp.text();
        const rewritten = rewriteHTML(html, targetUrl);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(resp.status).send(rewritten);
      } else if (ct.includes("javascript") || ct.includes("application/json") || ct.includes("text/css")) {
        const text = await resp.text();
        res.setHeader("Content-Type", ct);
        return res.status(resp.status).send(text);
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
      // Wait briefly before retry
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
  const { message } = req.body;
  if (!message) return res.json({ response: "cheese", timestamp: new Date().toLocaleTimeString() });
  const start = Date.now();
  let rt = "";
  const l = message.toLowerCase();
  if (l === "cheese" || l.includes("say cheese")) {
    const w = ["tomato", "giraffe", "pancake", "waffle", "sneaker", "pickle", "biscuit", "banana", "squid", "muffin", "cactus", "peanut", "jellyfish", "toaster", "penguin"];
    rt = w[Math.floor(Math.random() * w.length)];
  } else if (l.includes("homework") || l.includes("math") || l.includes("science") || l.includes("essay") || l.includes("algebra") || l.includes("history")) {
    rt = "ay i got u. drop the problem and i'll walk u through it step by step.";
  } else {
    try {
      const c = new AbortController(); setTimeout(() => c.abort(), 5000);
      const p = await fetch("https://text.pollinations.ai/" + encodeURIComponent("You are a teen tutor. Answer casually. Keep it short: " + message.slice(0, 300)), { signal: c.signal });
      if (p.ok) { const t = await p.text(); if (t && t.trim().length > 5) rt = t.trim(); }
    } catch {}
    if (!rt) { const g = ["cheese.", "tomato.", "yo sup bro.", "giraffe.", "wassup.", "pancake.", "yo.", "pickle.", "whats good.", "banana."]; rt = g[Math.floor(Math.random() * g.length)]; }
  }
  res.json({ response: rt, tokens: Math.ceil(rt.length / 4), elapsedMs: Date.now() - start });
});

// ==================== YOUTUBE VIEW ====================
app.get("/view", (req, res) => {
  res.sendFile(path.resolve(process.cwd(), "frontend.html"));
});

// =============================================================
// PROXY ENGINE 1: Service Worker Proxy (DEFAULT - sw)
// Routes through /sw/ prefix, registers a SW that intercepts
// all outbound requests and pipes them through the server
// =============================================================
app.all("/sw/*", async (req, res) => {
  const encoded = req.path.replace("/sw/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

// Service Worker registration script
app.get("/xena-sw.js", (req, res) => {
  res.type("application/javascript").send(`
const XENA_CACHE = 'xena-sw-cache-v1';
const PROXY_PREFIX = '/sw/';

function b64e(str) {
  try { return btoa(unescape(encodeURIComponent(str))).replace(/[+/=]/g, c => c === '+' ? '-' : c === '/' ? '_' : ''); } catch { return str; }
}
function b64d(str) {
  try { let t = str.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; return decodeURIComponent(escape(atob(t))); } catch { return str; }
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(XENA_CACHE));
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  
  // Let through XENA's own assets
  if (url.pathname === '/' || url.pathname.startsWith('/assets/') || 
      url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || 
      url.pathname.endsWith('.ico') || url.pathname.endsWith('.woff2') ||
      url.pathname === '/xena-sw.js' || url.pathname.startsWith('/api/') ||
      url.pathname === '/view') {
    return;
  }
  
  // If already going through proxy, handle it
  if (url.pathname.startsWith(PROXY_PREFIX)) {
    e.respondWith(handleProxyRequest(req));
    return;
  }
  
  // Intercept cross-origin requests and route through proxy
  if (url.hostname !== self.location.hostname && 
      !url.hostname.includes('localhost') && 
      !url.hostname.includes('127.0.0.1')) {
    const proxyUrl = PROXY_PREFIX + b64e(req.url);
    e.respondWith(fetch(proxyUrl));
  }
});

async function handleProxyRequest(req) {
  try {
    const url = new URL(req.url);
    const b64 = url.pathname.substring(PROXY_PREFIX.length);
    const targetUrl = b64d(b64);
    if (!targetUrl.startsWith('http')) throw new Error('Invalid target');
    
    const resp = await fetch(targetUrl, {
      headers: {
        'User-Agent': navigator.userAgent,
        'Accept': req.headers.get('Accept') || '*/*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    return resp;
  } catch (e) {
    return new Response('SW Proxy error: ' + e.message, { status: 502 });
  }
}
`);
});

// =============================================================
// PROXY ENGINE 2: Reverse Proxy (rev)
// Uses http-proxy-middleware-style approach - streams directly
// through without rewriting. Best for APIs and media-heavy sites.
// =============================================================
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
    
    // Forward request body for POST/PUT etc
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
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
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

// =============================================================
// PROXY ENGINE 3: Binary Stream Web-OS Sandbox (bin)
// Streams raw bytes for video, audio, binaries. 
// Uses chunked transfer for large files.
// =============================================================
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

    // For video/audio - stream directly with proper headers
    const ct = resp.headers.get("content-type") || "application/octet-stream";
    const contentLength = resp.headers.get("content-length");
    const contentRange = resp.headers.get("content-range");
    const acceptRanges = resp.headers.get("accept-ranges");

    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    
    // Forward range headers for video seeking support
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
    res.setHeader("Content-Type", ct);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    
    // Set partial content status if range request
    if (resp.status === 206) {
      res.status(206);
    }

    // Stream the response directly (efficient for large files)
    if (resp.body) {
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
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.status(resp.status).send(buf);
    }
  } catch (err: any) {
    if (!res.headersSent) {
      return res.status(502).send(`Binary stream error: ${err.message}`);
    }
    res.end();
  }
});

// =============================================================
// PROXY ENGINE FALLBACK: Fetch Rewrite (legacy)
// =============================================================
app.all("/fetch/*", async (req, res) => {
  const encoded = req.path.replace("/fetch/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

// =============================================================
// DYNAMIC ASSET HANDLER (AFTER all proxy routes)
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
    console.log(`[XENA] Proxies: /sw/* (SW), /rev/* (Reverse), /bin/* (Binary Stream)`);
  });
}
bootstrap();
