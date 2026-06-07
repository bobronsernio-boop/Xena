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

// Encoding helpers
function b64e(v: string): string {
  return Buffer.from(String(v||"")).toString("base64").replace(/[+/=]/g, c => c==="+"?"-":c==="/"?"_":"");
}
function b64d(v: string): string {
  try { let t = String(v||"").replace(/-/g,"+").replace(/_/g,"/"); while(t.length%4) t+="="; return Buffer.from(t,"base64").toString("utf8"); } catch { return v; }
}
function xore(s: string, k="xena"): string {
  let r=""; for(let i=0;i<s.length;i++) r+=String.fromCharCode(s.charCodeAt(i)^k.charCodeAt(i%k.length));
  return Buffer.from(r,"utf8").toString("base64").replace(/[+/=]/g,c=>c==="+"?"-":c==="/"?"_":"");
}
function xord(s: string, k="xena"): string {
  try { let t=s.replace(/-/g,"+").replace(/_/g,"/"); while(t.length%4) t+="="; const d=Buffer.from(t,"base64").toString("utf8"); let r=""; for(let i=0;i<d.length;i++) r+=String.fromCharCode(d.charCodeAt(i)^k.charCodeAt(i%k.length)); return r; } catch { return s; }
}

// UA list for rotation
const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
];
function randUA() { return UAS[Math.floor(Math.random()*UAS.length)]; }

// HTML rewriter
function rewriteHTML(html: string, base: string): string {
  const $ = cheerio.load(html);
  const rewrite = (_: any, attr: string) => (i: number, el: any) => {
    const v = $(el).attr(attr);
    if (v && !v.startsWith("#") && !v.startsWith("javascript:") && !v.startsWith("data:") && !v.startsWith("blob:")) {
      try { $(el).attr(attr, "/fetch/" + b64e(new URL(v, base).href)); } catch {}
    }
  };
  $("a[href]").each(rewrite(0,"href"));
  $("form[action]").each(rewrite(0,"action"));
  $("img[src]").each(rewrite(0,"src"));
  $("script[src]").each(rewrite(0,"src"));
  $("link[href]").each(rewrite(0,"href"));
  $("source[src]").each(rewrite(0,"src"));
  $("video[poster]").each(rewrite(0,"poster"));
  $("[style]").each((_, el) => {
    const s = $(el).attr("style");
    if (s && s.includes("url(")) {
      $(el).attr("style", s.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (m: string, u: string) => {
        try { return `url(/fetch/${b64e(new URL(u, base).href)})`; } catch { return m; }
      }));
    }
  });
  return $.html();
}

// Core fetch-and-rewrite handler
async function proxyFetch(targetUrl: string, req: any, res: any) {
  try {
    const accept = req.headers["accept"] || "*/*";
    const resp = await fetch(targetUrl, {
      headers: {
        "User-Agent": randUA(),
        "Accept": accept,
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": new URL(targetUrl).origin,
      },
      redirect: "follow",
    });
    const ct = resp.headers.get("content-type") || "";
    // Remove blocking headers
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("X-Content-Type-Options");
    
    if (ct.includes("text/html")) {
      const html = await resp.text();
      const rewritten = rewriteHTML(html, targetUrl);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(resp.status).send(rewritten);
    } else if (ct.includes("text/css") || ct.includes("javascript") || ct.includes("application/json")) {
      const text = await resp.text();
      res.setHeader("Content-Type", ct);
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(resp.status).send(text);
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(resp.status).send(buf);
    }
  } catch (err: any) {
    console.error(`[Proxy] ${targetUrl}: ${err.message}`);
    // Retry once with different UA
    try {
      const resp = await fetch(targetUrl, {
        headers: { "User-Agent": UAS[1], "Accept": "*/*" },
        redirect: "follow",
      });
      const ct = resp.headers.get("content-type") || "";
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      if (ct.includes("text/html")) {
        const html = await resp.text();
        const rewritten = rewriteHTML(html, targetUrl);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(resp.status).send(rewritten);
      } else {
        const buf = Buffer.from(await resp.arrayBuffer());
        res.setHeader("Content-Type", ct);
        return res.status(resp.status).send(buf);
      }
    } catch (err2: any) {
      return res.status(502).send(`Proxy error: ${err2.message}`);
    }
  }
}

// ==================== ROUTES ====================

// YouTube API
app.get('/api/yt/search', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q) return res.json([]);
    const r = await youtubesearchapi.GetListByKeyword(q, false, 15, [{type:'video'}]);
    const items = (r.items||[]).map((i:any)=>({
      id: i.id, title: i.title||'Untitled', channel: i.channelTitle||i.ownerChannelTitle||'Unknown',
      duration: i.isLive?'LIVE':(i.lengthText||i.length||'HD'),
      views: i.isLive?'LIVE NOW':(i.viewCountText||i.shortViewCountText||'100K views'),
      published: i.publishedTimeText||i.publishedAt||'Recently',
      thumbnail: i.thumbnail?.thumbnails?.[i.thumbnail.thumbnails.length-1]?.url||`https://img.youtube.com/vi/${i.id}/mqdefault.jpg`
    }));
    res.json(items);
  } catch { res.json([]); }
});

app.get('/api/yt/trending', async (_req, res) => {
  try {
    const cats = ['music','gaming','education','technology','vlog'];
    const ps = cats.map(c=>youtubesearchapi.GetListByKeyword(c,false,4,[{type:'video'}]));
    const rs = await Promise.allSettled(ps);
    const all:any[]=[];
    rs.forEach(r=>{if(r.status==='fulfilled'&&r.value.items) r.value.items.forEach((i:any)=>{all.push({id:i.id,title:i.title||'Untitled',channel:i.channelTitle||i.ownerChannelTitle||'Unknown',duration:i.isLive?'LIVE':(i.lengthText||'HD'),views:i.shortViewCountText||'100K views',published:i.publishedTimeText||'Recently',thumbnail:i.thumbnail?.thumbnails?.[i.thumbnail.thumbnails.length-1]?.url||`https://img.youtube.com/vi/${i.id}/mqdefault.jpg`});});});
    const seen=new Set();
    res.json(all.filter(i=>{if(seen.has(i.id))return false;seen.add(i.id);return true}).slice(0,20));
  } catch { res.json([]); }
});

app.get('/api/yt/channel', async (req, res) => {
  try {
    const name = (req.query.name as string)||'';
    if(!name) return res.json({name:'Unknown',handle:'@unknown',subscribers:'0',videosCount:'0',bio:'',banner:'',recentlyPosted:[],mostPopular:[]});
    const cv = await youtubesearchapi.GetListByKeyword(name,false,12,[{type:'video'}]);
    const vids = (cv.items||[]).map((i:any)=>({id:i.id,title:i.title||'Untitled',channel:i.channelTitle||name,duration:i.isLive?'LIVE':(i.lengthText||'HD'),views:i.shortViewCountText||'100K views',published:i.publishedTimeText||'Recently',thumbnail:i.thumbnail?.thumbnails?.[i.thumbnail.thumbnails.length-1]?.url||`https://img.youtube.com/vi/${i.id}/mqdefault.jpg`}));
    res.json({name,channelId:'',handle:`@${name.toLowerCase().replace(/\s+/g,'')}`,subscribers:'Sandbox Mode',videosCount:`${vids.length}+ videos`,bio:`${name} is a creator on YouTube.`,banner:'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&auto=format&fit=crop',recentlyPosted:vids.slice(0,6),mostPopular:[...vids].sort(()=>Math.random()-0.5).slice(0,6)});
  } catch { res.json({name:req.query.name||'Unknown',handle:'@unknown',subscribers:'0',videosCount:'0',bio:'',banner:'',recentlyPosted:[],mostPopular:[]}); }
});

// AI Chat
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ response:"cheese", timestamp:new Date().toLocaleTimeString() });
  const start=Date.now();
  let rt="";
  const l=message.toLowerCase();
  if(l==="cheese"||l.includes("say cheese")) { const w=["tomato","giraffe","pancake","waffle","sneaker","pickle","biscuit","banana","squid","muffin","cactus","peanut","jellyfish","toaster","penguin"]; rt=w[Math.floor(Math.random()*w.length)]; }
  else if(l.includes("how")&&(l.includes("xena")||l.includes("work"))) { rt="bet bro. xena fetches sites through the backend, rewrites all the links so they stay inside the sandbox, and strips security headers so everything loads in the iframe. ts clean."; }
  else if(l.includes("homework")||l.includes("math")||l.includes("science")||l.includes("essay")||l.includes("algebra")||l.includes("history")) { rt="ay i got u. drop the problem and i'll walk u through it step by step. ion do the work for u but i'll explain ts so u actually learn."; }
  else {
    try {
      const c=new AbortController(); setTimeout(()=>c.abort(),5000);
      const p=await fetch("https://text.pollinations.ai/"+encodeURIComponent("You are a chill teen tutor. Answer casually with slang. Replace 'this' with 'ts'. Keep it short: "+message.slice(0,300)),{signal:c.signal});
      if(p.ok){const t=await p.text();if(t&&t.trim().length>5)rt=t.trim();}
    }catch{}
    if(!rt){const g=["cheese.","tomato.","yo sup bro.","giraffe.","wassup.","pancake.","yo.","pickle.","whats good.","banana.","muffin.","sup.","cactus.","bro.","peanut."];rt=g[Math.floor(Math.random()*g.length)];}
  }
  res.json({response:rt,tokens:Math.ceil(rt.length/4),elapsedMs:Date.now()-start});
});

// YouTube View
app.get("/view", (req, res) => {
  res.sendFile(path.resolve(process.cwd(), "frontend.html"));
});

// ==================== PROXY ROUTES ====================
// These MUST be before the dynamic asset handler

// Primary fetch proxy
app.all("/fetch/*", async (req, res) => {
  const encoded = req.path.replace("/fetch/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing URL");
  let target: string;
  try { target = b64d(decodeURIComponent(encoded)); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

// Base64 gateway
app.all("/proxy/*", async (req, res) => {
  const encoded = req.path.replace("/proxy/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing");
  let target: string;
  try { target = b64d(encoded); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

// XOR gateway
app.all("/gateway/*", async (req, res) => {
  const encoded = req.path.replace("/gateway/", "").split("?")[0];
  if (!encoded) return res.status(400).send("Missing");
  let target: string;
  try { target = xord(encoded); new URL(target); } catch { return res.status(400).send("Invalid"); }
  return proxyFetch(target, req, res);
});

// SW
app.get("/sw.js", (req, res) => {
  res.type("application/javascript").send(`
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(clients.claim()));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.pathname==="/"||u.pathname.startsWith("/assets/")||u.pathname.endsWith(".js")||u.pathname.endsWith(".css")||u.pathname.endsWith(".png")||u.pathname.endsWith(".svg")||u.pathname.endsWith(".ico")||u.pathname.endsWith(".woff2")) return;
  if(u.pathname.startsWith("/fetch/")||u.pathname.startsWith("/proxy/")||u.pathname.startsWith("/gateway/")){e.respondWith(handleProxy(e.request));return;}
  if(u.hostname!==self.location.hostname){e.respondWith(fetch("/fetch/"+btoa(u.href).replace(/[+/=]/g,c=>c==="+"?"-":c==="/"?"_":"")));}
});
async function handleProxy(r){try{const u=new URL(r.url);const p=u.pathname;const b=p.substring(p.indexOf("/",1)+1);const t=atob(b.replace(/-/g,"+").replace(/_/g,""));const re=await fetch(t,{headers:{"User-Agent":navigator.userAgent}});return re;}catch(e){return new Response("Proxy error: "+e.message,{status:502});}}
`);
});

// ==================== DYNAMIC ASSET HANDLER ====================
// Only matches 5-char alphanumeric prefix + filename — safe because proxy routes are above
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
      return res.status(response.status).send(`Failed to fetch ${prefix}/${filename}`);
    }
  } catch (err: any) {
    return res.status(500).send(`Error: ${err.message}`);
  }
});

// ==================== CORS HELPER ====================
app.get("/api/cors", async (req, res) => {
  const target = req.query.url as string;
  if (!target) return res.status(400).send("Missing ?url=");
  return proxyFetch(target, req, res);
});

// ==================== DEV / PROD ====================
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
    console.log(`[XENA] Online on 0.0.0.0:${PORT}`);
  });
}
bootstrap();
