import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import http from "http";
import https from "https";
import * as cheerio from "cheerio";
import { Readable } from "stream";
import { handleProxy, generateSW } from "./src/proxyEngine.js";
import youtubesearchapi from 'youtube-search-api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ============================================================
// BASE64 & XOR ENCODING SERVICES (XENA CORES)
// ============================================================
function base64UrlEncode(value: string): string {
  return Buffer.from(String(value || ""), "utf8").toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  try {
    let token = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    while (token.length % 4 !== 0) token += "=";
    return Buffer.from(token, "base64").toString("utf8");
  } catch {
    return String(value || "");
  }
}

function xorEncode(str: string, key = "xena"): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(result, "utf8").toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function xorDecode(str: string, key = "xena"): string {
  try {
    let token = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
    while (token.length % 4 !== 0) token += "=";
    const decoded = Buffer.from(token, "base64").toString("utf8");
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return String(str || "");
  }
}

// ============================================================
// YOUTUBE SEARCH API (FREE, NO API KEY)
// ============================================================
app.get('/api/yt/search', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query) return res.json([]);
    const result = await youtubesearchapi.GetListByKeyword(query, false, 15, [{ type: 'video' }]);
    const items = (result.items || []).map((item: any) => ({
      id: item.id,
      title: item.title || 'Untitled',
      channel: item.channelTitle || item.ownerChannelTitle || 'Unknown',
      duration: item.isLive ? 'LIVE' : (item.lengthText || item.length || 'HD'),
      views: item.isLive ? 'LIVE NOW' : (item.viewCountText || item.shortViewCountText || '100K views'),
      published: item.publishedTimeText || item.publishedAt || 'Recently',
      thumbnail: item.thumbnail?.thumbnails?.[item.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`
    }));
    res.json(items);
  } catch (e: any) {
    console.error('[YT Search Error]', e.message);
    res.json([]);
  }
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
  } catch (e: any) {
    console.error('[YT Channel Error]', e.message);
    res.json({ name: req.query.name || 'Unknown', handle: '@unknown', subscribers: '0', videosCount: '0', bio: '', banner: '', recentlyPosted: [], mostPopular: [] });
  }
});

app.get('/api/yt/trending', async (_req, res) => {
  try {
    const categories = ['music', 'gaming', 'education', 'technology', 'vlog'];
    const promises = categories.map(cat => youtubesearchapi.GetListByKeyword(cat, false, 4, [{ type: 'video' }]));
    const results = await Promise.allSettled(promises);
    const allItems: any[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.items) {
        result.value.items.forEach((item: any) => {
          allItems.push({
            id: item.id, title: item.title || 'Untitled', channel: item.channelTitle || item.ownerChannelTitle || 'Unknown',
            duration: item.isLive ? 'LIVE' : (item.lengthText || 'HD'),
            views: item.shortViewCountText || '100K views', published: item.publishedTimeText || 'Recently',
            thumbnail: item.thumbnail?.thumbnails?.[item.thumbnail.thumbnails.length - 1]?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`
          });
        });
      }
    });
    const seen = new Set();
    const unique = allItems.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
    res.json(unique.slice(0, 20));
  } catch (e: any) {
    console.error('[YT Trending Error]', e.message);
    res.json([]);
  }
});

// ============================================================
// FREE AI CHAT — no API key needed, uses Pollinations
// ============================================================
app.post("/api/chat", async (req, res) => {
  const { message, image } = req.body;
  if (!message) return res.json({ response: "cheese", timestamp: new Date().toLocaleTimeString() });
  
  const startTime = Date.now();
  let responseText = "";
  const lower = message.toLowerCase();

  if (lower === "cheese" || lower.includes("say cheese")) {
    const sillyWords = ["tomato", "giraffe", "pancake", "waffle", "sneaker", "pickle", "biscuit", "banana", "squid", "muffin", "cactus", "peanut", "jellyfish", "toaster", "penguin"];
    responseText = sillyWords[Math.floor(Math.random() * sillyWords.length)];
  } else if (lower.includes("how") && (lower.includes("xena") || lower.includes("proxy") || lower.includes("work"))) {
    responseText = "bet bro. so basically xena runs on a custom engine in the backend. you type a url or search in the bar and it fetches the site through the server, rewrites all the links so they stay inside xena, and strips the security headers so it loads in the iframe. ts is clean af. no bare server nonsense, no uv framework. just straight fetch + rewrite. if u want sites that go crazy try discord, reddit, or youtube. they work the best.";
  } else if (lower.includes("site") || lower.includes("sites") || lower.includes("where") || lower.includes("what") || (lower.includes("use") && !lower.includes("how to use"))) {
    responseText = "yo the best ones rn are discord, reddit, spotify, youtube, and honestly most socials. some sites like chatgpt get weird bc of their own security but we working on that. if a site dont load try refreshing or check if xena is down. lmk what u tryna get on and i'll tell u if it works.";
  } else if (lower.includes("how to use")) {
    responseText = "ts simple bro. just type the full url in the search bar like https://discord.com/channels/@me and hit go. xena fetches it and loads it in the iframe. all the links get rewritten so u can click around inside. if u want a new tab just hit the plus button. adblock helps too fr.";
  } else if (lower.includes("stupid") || lower.includes("dumb") || lower.includes("bad") || lower.includes("trash") || lower.includes("suck") || lower.includes("fix") || lower.includes("broken") || lower.includes("not working") || lower.includes("doesn't work") || lower.includes("dont work")) {
    responseText = "bro. su gon blame me when u probably typed the url wrong. make sure u put the https:// and everything. if ts still broke refresh the page or try a different site. ion control if the site blocks proxies thats on them not me.";
  } else if (lower.includes("engine") || lower.includes("backend") || lower.includes("how it works") || lower.includes("code")) {
    responseText = "aight so the backend is express with typescript. when u enter a url the server fetches it with node fetch, then cheerio rewrites all href src action and style attributes so they point back through /proxy/. it also strips x-frame-options and csp headers so the site loads in the iframe. the service worker catches subsequent requests so images and css also route through. ts basically a custom engine no uv no scramjet no cap.";
  } else if (lower.includes("homework") || lower.includes("help") || lower.includes("math") || lower.includes("science") || lower.includes("essay") || lower.includes("algebra") || lower.includes("calculus") || lower.includes("biology") || lower.includes("chemistry") || lower.includes("history")) {
    responseText = "ay i got u. what subject we talking? drop the problem and i'll walk u through it step by step. ion do the work for u but i'll explain ts so u actually learn.";
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const pollResp = await fetch("https://text.pollinations.ai/" + encodeURIComponent("You are a chill teen tutor. Answer casually with slang. Replace 'this' with 'ts'. Keep it short: " + message.slice(0, 300)), {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (pollResp.ok) {
        const text = await pollResp.text();
        if (text && text.trim().length > 5) {
          responseText = text.trim();
        }
      }
    } catch (e) {}
    
    if (!responseText) {
      const greetings = ["cheese.", "tomato.", "yo sup bro.", "giraffe.", "wassup.", "pancake.", "yo.", "pickle.", "whats good.", "banana.", "muffin.", "sup.", "cactus.", "bro.", "peanut."];
      responseText = greetings[Math.floor(Math.random() * greetings.length)];
    }
  }

  const elapsedMs = Date.now() - startTime;
  res.json({ response: responseText, tokens: Math.ceil(responseText.length / 4), elapsedMs });
});

// ============================================================
// YOUTUBE VIEW PAGE
// ============================================================
app.get("/view", (req, res) => {
  res.sendFile(path.resolve(process.cwd(), "frontend.html"));
});

// ============================================================
// IMPROVED PROXY TUNNEL — handles non-HTML content better
// ============================================================
const proxyTargetPattern = /^\/proxy\/(.+)/;
app.all("/proxy/*", handleProxy);
app.post("/proxy/*", handleProxy);
app.get("/sw.js", (req, res) => {
  res.type("application/javascript").send(generateSW());
});

// ============================================================
// DYNAMIC ASSET HANDLER (LucideProxy scramjet resources)
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
    if (!response.ok) {
      const masterUrl = `https://raw.githubusercontent.com/lucideproxy/svg/master/${prefix}/${filename}`;
      response = await fetch(masterUrl);
    }
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const nodeBuf = Buffer.from(buffer);
      fs.writeFileSync(cacheFile, nodeBuf);
      if (filename.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
      else if (filename.endsWith(".js")) res.setHeader("Content-Type", "application/javascript");
      else if (filename.endsWith(".json")) res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=31536000");
      return res.send(nodeBuf);
    } else {
      return res.status(response.status).send(`Failed to fetch dynamic asset ${prefix}/${filename} from upstream branches.`);
    }
  } catch (err: any) {
    return res.status(500).send(`Error fetching dynamic asset ${prefix}/${filename}: ${err.message}`);
  }
});

// ============================================================
// CORS PROXY ENDPOINT (for sites that block direct fetch)
// ============================================================
app.get("/api/cors", async (req, res) => {
  const target = req.query.url as string;
  if (!target) return res.status(400).send("Missing ?url= parameter");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const proxyResponse = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const contentType = proxyResponse.headers.get("content-type") || "";
    res.status(proxyResponse.status);
    proxyResponse.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (["content-type", "content-encoding", "set-cookie"].includes(lowerKey)) {
        res.setHeader(key, val);
      }
    });
    res.setHeader("Access-Control-Allow-Origin", "*");
    const arrayBuffer = await proxyResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("CORS proxy failed:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(502).send(`CORS proxy error: ${err.message}`);
  }
});

// ============================================================
// DEVELOPMENT VS PRODUCTION SITE SERVE
// ============================================================
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`[XENA] Replica Beta Online. Bound on host 0.0.0.0:${PORT}`);
    
    // Warm up cache
    try {
      const cacheDir = path.join(process.cwd(), "cache", "8cfc2");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const resources = ["hgshm.js", "sfoew.js", "ccqit.wasm"];
      for (const file of resources) {
        const cacheFile = path.join(cacheDir, file);
        if (!fs.existsSync(cacheFile)) {
          try {
            let r = await fetch(`https://raw.githubusercontent.com/lucideproxy/svg/main/8cfc2/${file}`);
            if (!r.ok) r = await fetch(`https://raw.githubusercontent.com/lucideproxy/svg/master/8cfc2/${file}`);
            if (r.ok) {
              fs.writeFileSync(cacheFile, Buffer.from(await r.arrayBuffer()));
              console.log(`[XENA] Cached: ${file}`);
            }
          } catch {}
        }
      }
    } catch {}
  });
}

bootstrap();
