import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { URL } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==================== ACCESS CODES ====================
const DEV_CODE_HASH = crypto.createHash('sha256').update(
  (process.env.XENA_DEV_CODE || 'PNG6G').trim().toUpperCase()
).digest('hex');
const ADMIN_CODE_HASH = crypto.createHash('sha256').update(
  (process.env.XENA_ADMIN_CODE || 'V46D9').trim().toUpperCase()
).digest('hex');

// ==================== UTILITIES ====================
function b64e(v: string): string {
  return Buffer.from(String(v || ''), 'utf8').toString('base64')
    .replace(/[+/=]/g, c => c === '+' ? '-' : c === '/' ? '_' : '');
}
function b64d(v: string): string {
  try {
    let t = String(v || '').replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return Buffer.from(t, 'base64').toString('utf8');
  } catch { return v; }
}

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
];
function randUA(): string { return UAS[Math.floor(Math.random() * UAS.length)]; }

function stripBadHeaders(headers: Record<string, any>): void {
  const bad = ['x-frame-options', 'content-security-policy', 'x-content-type-options',
    'strict-transport-security', 'x-xss-protection'];
  bad.forEach(h => {
    const key = Object.keys(headers).find(k => k.toLowerCase() === h);
    if (key) headers[key] = undefined;
  });
}

function rewriteHTML(html: string, baseUrl: string, prefix: string = '/fetch/'): string {
  const $ = cheerio.load(html);
  const rw = (val: string) => {
    if (!val || val.startsWith('data:') || val.startsWith('javascript:') || val.startsWith('#')) return val;
    try { return prefix + b64e(new URL(val, baseUrl).href); } catch { return val; }
  };
  $('[href]').each((_, e) => { const v = $(e).attr('href'); if (v && !v.startsWith('#') && !v.startsWith('javascript:')) $(e).attr('href', rw(v)); });
  $('[src]').each((_, e) => { const v = $(e).attr('src'); if (v && !v.startsWith('data:')) $(e).attr('src', rw(v)); });
  $('[action]').each((_, e) => { const v = $(e).attr('action'); if (v) $(e).attr('action', rw(v)); });
  $('[data-src]').each((_, e) => { const v = $(e).attr('data-src'); if (v) $(e).attr('data-src', rw(v)); });
  $('[poster]').each((_, e) => { const v = $(e).attr('poster'); if (v) $(e).attr('poster', rw(v)); });
  $('[style]').each((_, e) => {
    const s = $(e).attr('style');
    if (s?.includes('url(')) $(e).attr('style', s.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (_m: string, u: string) => {
      try { return `url(${prefix + b64e(new URL(u, baseUrl).href)})`; } catch { return _m; }
    }));
  });
  $('style').each((_, e) => {
    const t = $(e).html() || '';
    if (t.includes('url(')) $(e).html(t.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (_m: string, u: string) => {
      try { return `url(${prefix + b64e(new URL(u, baseUrl).href)})`; } catch { return _m; }
    }));
  });
  // Kill frame busters
  $('script').each((_, e) => {
    const t = $(e).html() || '';
    if (t.includes('top.location') || (t.includes('self') && t.includes('top') && t.includes('parent')) || t.includes('breakFrame'))
      $(e).remove();
  });
  return $.html();
}

async function proxyFetch(target: string, req: express.Request, res: express.Response, prefix: string = '/fetch/'): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': randUA(),
      'Accept': (req.headers['accept'] as string) || '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': target
    };
    if (req.headers['cookie']) headers['Cookie'] = req.headers['cookie'] as string;
    if (req.headers['range']) headers['Range'] = req.headers['range'] as string;

    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 35000);
    const resp = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined :
        req.body ? (typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body)) : undefined,
      redirect: 'follow',
      signal: ac.signal
    });
    clearTimeout(to);

    const ct = resp.headers.get('content-type') || '';
    stripBadHeaders(resp.headers as any);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (ct.includes('text/html')) {
      const html = await resp.text();
      const rw = rewriteHTML(html, target, prefix);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(resp.status).send(rw);
    } else if (ct.includes('text') || ct.includes('json') || ct.includes('javascript') || ct.includes('xml')) {
      res.setHeader('Content-Type', ct);
      res.status(resp.status).send(await resp.text());
    } else if (resp.body && (ct.includes('video') || ct.includes('audio') || ct.includes('image') || ct.includes('octet-stream'))) {
      if (resp.headers.get('content-range')) res.setHeader('Content-Range', resp.headers.get('content-range')!);
      if (resp.headers.get('content-length')) res.setHeader('Content-Length', resp.headers.get('content-length')!);
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      if (resp.status === 206) res.status(206);
      const reader = resp.body.getReader();
      const pump = async () => {
        while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
        res.end();
      };
      pump().catch(() => res.end());
      return;
    } else {
      res.setHeader('Content-Type', ct || 'application/octet-stream');
      res.status(resp.status).send(Buffer.from(await resp.arrayBuffer()));
    }
  } catch (err: any) {
    if (!res.headersSent) res.status(502).send(`Proxy error: ${err.message}`);
    else res.end();
  }
}

// ==================== AUTH ====================
app.post('/api/auth/validate-code', (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') return res.json({ valid: false, role: null });
  const h = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
  if (h === DEV_CODE_HASH) return res.json({ valid: true, role: 'developer' });
  if (h === ADMIN_CODE_HASH) return res.json({ valid: true, role: 'admin' });
  return res.json({ valid: false, role: null });
});

function authMw(req: express.Request, res: express.Response, next: express.NextFunction) {
  const code = req.headers['x-access-code'];
  if (!code || typeof code !== 'string') return res.status(401).json({ error: 'Access code required' });
  const h = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
  if (h === DEV_CODE_HASH) { (req as any).userRole = 'developer'; return next(); }
  if (h === ADMIN_CODE_HASH) { (req as any).userRole = 'admin'; return next(); }
  return res.status(403).json({ error: 'Invalid code' });
}
function adminMw(req: express.Request, res: express.Response, next: express.NextFunction) {
  if ((req as any).userRole !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ==================== PROXY ENGINE 1: SW (Service Worker) ====================
app.get('/xena-sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.send(`
    const C='xena-cache-v1';
    self.addEventListener('install',e=>self.skipWaiting());
    self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
    self.addEventListener('fetch',e=>{
      const u=new URL(e.request.url);
      if(u.pathname=='/'||u.pathname.startsWith('/assets/')||u.pathname=='/xena-sw.js'||u.pathname.match(/\\.(js|css|png|jpg|svg|ico|woff2?|ttf)$/))return;
      if(u.pathname.startsWith('/sw/')){
        const enc=u.pathname.replace('/sw/','');
        let t;try{t=atob(enc.replace(/-/g,'+').replace(/_/g,'/'))}catch{return}
        e.respondWith((async()=>{
          const r=await fetch(t,{headers:{'User-Agent':navigator.userAgent}});
          return new Response(await r.text(),{headers:{'Content-Type':r.headers.get('Content-Type')||'text/html'}})
        })());
      }
    });
  `);
});
app.all('/sw/*', async (req, res) => {
  const enc = req.path.replace('/sw/', '').split('?')[0];
  if (!enc) return res.status(400).send('Missing URL');
  try { const t = b64d(decodeURIComponent(enc)); new URL(t); return proxyFetch(t, req, res, '/sw/'); }
  catch { return res.status(400).send('Invalid'); }
});

// ==================== PROXY ENGINE 2: RV (Reverse Proxy) - DEFAULT ====================
app.all('/rev/*', async (req, res) => {
  const enc = req.path.replace('/rev/', '').split('?')[0];
  if (!enc) return res.status(400).send('Missing URL');
  try { const t = b64d(decodeURIComponent(enc)); new URL(t); return proxyFetch(t, req, res, '/rev/'); }
  catch { return res.status(400).send('Invalid'); }
});

// ==================== PROXY ENGINE 3: BSS (Binary Stream Sandbox) ====================
app.all('/bss/*', async (req, res) => {
  const enc = req.path.replace('/bss/', '').split('?')[0];
  if (!enc) return res.status(400).send('Missing URL');
  let target: string;
  try { target = b64d(decodeURIComponent(enc)); new URL(target); } catch { return res.status(400).send('Invalid'); }
  try {
    const headers: Record<string, string> = { 'User-Agent': randUA(), 'Accept': '*/*', 'Range': (req.headers['range'] as string) || '' };
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 60000);
    const resp = await fetch(target, { method: req.method, headers, redirect: 'follow', signal: ac.signal });
    clearTimeout(to);
    stripBadHeaders(resp.headers as any);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', resp.headers.get('content-type') || 'application/octet-stream');
    if (resp.headers.get('content-range')) res.setHeader('Content-Range', resp.headers.get('content-range')!);
    if (resp.headers.get('content-length')) res.setHeader('Content-Length', resp.headers.get('content-length')!);
    if (resp.status === 206) res.status(206);
    if (resp.body) {
      const reader = resp.body.getReader();
      const pump = async () => { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); } res.end(); };
      pump().catch(() => res.end());
    } else { res.status(resp.status).send(Buffer.from(await resp.arrayBuffer())); }
  } catch (err: any) { if (!res.headersSent) res.status(502).send('BSS error: ' + err.message); else res.end(); }
});

// ==================== PROXY ENGINE 4: XT (X-Treme Ultimate Proxy) ====================
app.all('/xt/*', async (req, res) => {
  const enc = req.path.replace('/xt/', '').split('?')[0];
  if (!enc) return res.status(400).send('Missing URL');
  let target: string;
  try { target = b64d(decodeURIComponent(enc)); new URL(target); } catch { return res.status(400).send('Invalid'); }
  try {
    const headers: Record<string, string> = {
      'User-Agent': randUA(),
      'Accept': req.headers['accept'] as string || 'text/html,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': target,
      'Origin': new URL(target).origin,
      'Cache-Control': 'no-cache'
    };
    if (req.headers['cookie']) headers['Cookie'] = req.headers['cookie'] as string;

    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 45000);
    const resp = await fetch(target, {
      method: req.method, headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'follow', signal: ac.signal
    });
    clearTimeout(to);

    const ct = resp.headers.get('content-type') || '';
    stripBadHeaders(resp.headers as any);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (ct.includes('text/html')) {
      const html = await resp.text();
      const $ = cheerio.load(html);
      const p = '/xt/';
      const rw = (v: string) => { try { return p + b64e(new URL(v, target).href); } catch { return v; } };
      $('[href]').each((_, e) => { const v = $(e).attr('href'); if (v && !v.startsWith('#') && !v.startsWith('javascript:')) $(e).attr('href', rw(v)); });
      $('[src]').each((_, e) => { const v = $(e).attr('src'); if (v && !v.startsWith('data:')) $(e).attr('src', rw(v)); });
      $('[action]').each((_, e) => { const v = $(e).attr('action'); if (v) $(e).attr('action', rw(v)); });
      $('[data-src]').each((_, e) => { const v = $(e).attr('data-src'); if (v) $(e).attr('data-src', rw(v)); });
      $('[data-href]').each((_, e) => { const v = $(e).attr('data-href'); if (v) $(e).attr('data-href', rw(v)); });
      $('[poster]').each((_, e) => { const v = $(e).attr('poster'); if (v) $(e).attr('poster', rw(v)); });
      $('[style]').each((_, e) => {
        const s = $(e).attr('style');
        if (s?.includes('url(')) $(e).attr('style', s.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (_m: string, u: string) => {
          try { return `url(${p + b64e(new URL(u, target).href)})`; } catch { return _m; }
        }));
      });
      $('style').each((_, e) => {
        const t = $(e).html() || '';
        if (t.includes('url(')) $(e).html(t.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (_m: string, u: string) => {
          try { return `url(${p + b64e(new URL(u, target).href)})`; } catch { return _m; }
        }));
      });
      // Kill frame busters
      $('script').each((_, e) => {
        const t = $(e).html() || '';
        if (t.includes('top.location') || (t.includes('self') && t.includes('top')) || t.includes('breakFrame'))
          $(e).remove();
      });
      // Inject XT bridge
      const bridge = `<script>(function(){window.__xena={base:'${p}',origin:'${new URL(target).origin}',target:'${target}'};
        const oc=document.createElement.bind(document);
        document.createElement=function(tag){const el=oc(tag);if(['a','link','form'].includes(tag.toLowerCase())){const os=el.setAttribute.bind(el);el.setAttribute=function(n,v){if((n==='href'||n==='action')&&v&&!v.startsWith('#')&&!v.startsWith('javascript:')){try{v=window.__xena.base+btoa(new URL(v,window.__xena.origin).href).replace(/[+/=]/g,c=>c==='+'?'-':c==='/'?'_':'')}catch(e){}}return os(n,v)};}}return el};
        const ow=window.open.bind(window);window.open=function(u,...a){if(u&&!u.startsWith(window.__xena.base)){try{u=window.__xena.base+btoa(new URL(u,window.__xena.origin).href).replace(/[+/=]/g,c=>c==='+'?'-':c==='/'?'_':'')}catch(e){}}return ow(u,...a)};
        try{Object.defineProperty(window,'frameElement',{value:null,writable:false})}catch(e){}
        try{Object.defineProperty(window,'top',{value:window,writable:false})}catch(e){}
        try{Object.defineProperty(window,'parent',{value:window,writable:false})}catch(e){}
      })();</script>`;
      let htmlOut = $.html();
      const headEnd = htmlOut.indexOf('</head>');
      htmlOut = headEnd > -1 ? htmlOut.slice(0, headEnd) + bridge + htmlOut.slice(headEnd) : bridge + htmlOut;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(resp.status).send(htmlOut);
    } else if (ct.includes('text') || ct.includes('json') || ct.includes('javascript') || ct.includes('xml')) {
      res.setHeader('Content-Type', ct);
      res.status(resp.status).send(await resp.text());
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.setHeader('Content-Type', ct || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.status(resp.status).send(buf);
    }
  } catch (err: any) { if (!res.headersSent) res.status(502).send('XT error: ' + err.message); else res.end(); }
});

// ==================== COMMON FETCH ====================
app.all('/fetch/*', async (req, res) => {
  const enc = req.path.replace('/fetch/', '').split('?')[0];
  if (!enc) return res.status(400).send('Missing URL');
  try { const t = b64d(decodeURIComponent(enc)); new URL(t); return proxyFetch(t, req, res, '/fetch/'); }
  catch { return res.status(400).send('Invalid'); }
});

// ==================== TIKTOK API ====================
// Uses TikTok's public endpoints with proper headers
const TT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.tiktok.com/',
  'Origin': 'https://www.tiktok.com'
};

interface TikTokVideo {
  id: string;
  desc: string;
  createTime: number;
  author: { id: string; uniqueId: string; nickname: string; avatarThumb: string; signature: string };
  stats: { diggCount: number; shareCount: number; commentCount: number; playCount: number };
  video: { cover: string; originCover: string; dynamicCover: string; playAddr: string; downloadAddr: string; duration: number };
  music: { id: string; title: string; authorName: string; coverThumb: string; playUrl: string };
}

// Trending feed
app.get('/api/tiktok/trending', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count as string) || 15, 30);
    // Try the main TikTok feed API
    const resp = await fetch('https://www.tiktok.com/api/recommend/item_list/?aid=1988&count=' + count + '&from_page=fyp', {
      headers: {
        ...TT_HEADERS,
        'Cookie': process.env.TIKTOK_SESSION || 'tt_webid_v2=1; tt_csrf_token=1'
      }
    });

    if (!resp.ok) throw new Error('TikTok API returned ' + resp.status);

    const data = await resp.json() as any;
    const items: any[] = data.itemList || [];

    const videos: TikTokVideo[] = items.map((item: any) => ({
      id: String(item.id || ''),
      desc: item.desc || '',
      createTime: item.createTime || 0,
      author: {
        id: String(item.author?.id || ''),
        uniqueId: item.author?.uniqueId || '',
        nickname: item.author?.nickname || '',
        avatarThumb: item.author?.avatarThumb?.urlList?.[0] || item.author?.avatarLarger || '',
        signature: item.author?.signature || ''
      },
      stats: {
        diggCount: item.stats?.diggCount || 0,
        shareCount: item.stats?.shareCount || 0,
        commentCount: item.stats?.commentCount || 0,
        playCount: item.stats?.playCount || 0
      },
      video: {
        cover: item.video?.cover?.urlList?.[0] || item.video?.cover || '',
        originCover: item.video?.originCover?.urlList?.[0] || '',
        dynamicCover: item.video?.dynamicCover?.urlList?.[0] || '',
        playAddr: item.video?.playAddr?.[0] || item.video?.playAddr || '',
        downloadAddr: item.video?.downloadAddr || '',
        duration: item.video?.duration || 0
      },
      music: {
        id: String(item.music?.id || ''),
        title: item.music?.title || '',
        authorName: item.music?.authorName || '',
        coverThumb: item.music?.coverThumb?.urlList?.[0] || '',
        playUrl: item.music?.playUrl || ''
      }
    }));

    res.json({ videos, hasMore: data.hasMore || false, cursor: data.cursor || 0 });
  } catch (err: any) {
    console.error('[TikTok] Trending error:', err.message);
    // Fallback: use oembed for some known trending videos
    try {
      const fallbackIds = ['6718335390845095173', '6910966691128298758', '6954929478562974981', '6980000000000000000'];
      const fallbackVideos: TikTokVideo[] = [];
      for (const id of fallbackIds.slice(0, 5)) {
        try {
          const oembedResp = await fetch(`https://www.tiktok.com/oembed?url=https://www.tiktok.com/t/${id}`);
          if (oembedResp.ok) {
            const oembed = await oembedResp.json() as any;
            fallbackVideos.push({
              id: id, desc: oembed.title || '', createTime: Date.now(),
              author: { id: '', uniqueId: oembed.author_unique_id || '', nickname: oembed.author_name || '', avatarThumb: oembed.thumbnail_url || '', signature: '' },
              stats: { diggCount: 0, shareCount: 0, commentCount: 0, playCount: 0 },
              video: { cover: oembed.thumbnail_url || '', originCover: '', dynamicCover: '', playAddr: '', downloadAddr: '', duration: 0 },
              music: { id: '', title: '', authorName: '', coverThumb: '', playUrl: '' }
            });
          }
        } catch {}
      }
      if (fallbackVideos.length > 0) {
        return res.json({ videos: fallbackVideos, hasMore: false, cursor: 0 });
      }
    } catch {}
    res.json({ videos: [], hasMore: false, cursor: 0, error: err.message });
  }
});

// User profile and videos
app.get('/api/tiktok/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const resp = await fetch(`https://www.tiktok.com/@${username}`, {
      headers: {
        'User-Agent': randUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const html = await resp.text();
    // Try SIGI_STATE or __UNIVERSAL_DATA_FOR_REHYDRATION
    const scripts = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION"[^>]*>([^<]+)<\/script>/);
    if (scripts) {
      try {
        const parsed = JSON.parse(scripts[1]);
        const userData = parsed?.['__DEFAULT_SCOPE__']?.['webapp.user-detail'];
        if (userData) return res.json(userData);
        const videoData = parsed?.['__DEFAULT_SCOPE__']?.['webapp.video-feed'];
        if (videoData) return res.json(videoData);
      } catch {}
    }
    // Try SIGI_STATE
    const sigiMatch = html.match(/window\.SIGI_STATE\s*=\s*({.+?});\s*</);
    if (sigiMatch) {
      try { return res.json(JSON.parse(sigiMatch[1])); } catch {}
    }
    // Try __INIT_PROPS__
    const initMatch = html.match(/window\.__INIT_PROPS__\s*=\s*({.+?});\s*</);
    if (initMatch) {
      try { return res.json(JSON.parse(initMatch[1])); } catch {}
    }
    res.json({ error: 'Could not extract user data' });
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// Video details by ID
app.get('/api/tiktok/video/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resp = await fetch(`https://www.tiktok.com/oembed?url=https://www.tiktok.com/t/${id}`);
    if (resp.ok) {
      const data = await resp.json();
      return res.json(data);
    }
    // Try embed page
    const embedResp = await fetch(`https://www.tiktok.com/embed/v2/${id}`, {
      headers: { 'User-Agent': randUA(), 'Referer': 'https://www.tiktok.com/' }
    });
    if (embedResp.ok) return res.json(await embedResp.json());
    res.status(404).json({ error: 'Video not found' });
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

// ==================== AI CHAT API ====================
const AI_PROVIDERS: Record<string, { url: string; model: string; keyName: string }> = {
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/models/', model: 'gemini-2.0-flash', keyName: 'GEMINI_API_KEY' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', keyName: 'OPENAI_API_KEY' }
};

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, mode = 'serious', provider = 'gemini' } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages required' });

    const providerCfg = AI_PROVIDERS[provider];
    if (!providerCfg) return res.status(400).json({ error: 'Invalid provider' });

    const apiKey = process.env[providerCfg.keyName] || '';
    if (!apiKey) return res.status(400).json({ error: `No API key for ${provider}. Set ${providerCfg.keyName}=your_key in .env` });

    const sysPrompt = mode === 'serious'
      ? 'You are XENA AI, a precise and knowledgeable assistant. Answer all questions factually and accurately. No jokes, no randomness.'
      : 'You are XENA AI, a creative and fun assistant. Be playful, use humor, keep things lighthearted while helpful.';

    let response: string;
    if (provider === 'gemini') {
      const resp = await fetch(`${providerCfg.url}${providerCfg.model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') }] }],
          systemInstruction: { parts: [{ text: sysPrompt }] },
          generationConfig: { temperature: mode === 'serious' ? 0.2 : 0.9, maxOutputTokens: 4096 }
        })
      });
      if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      const data = await resp.json() as any;
      response = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    } else {
      const resp = await fetch(providerCfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: providerCfg.model,
          messages: [{ role: 'system', content: sysPrompt }, ...messages.slice(-30)],
          temperature: mode === 'serious' ? 0.2 : 0.9,
          max_tokens: 4096
        })
      });
      if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      const data = await resp.json() as any;
      response = data?.choices?.[0]?.message?.content || 'No response.';
    }

    res.json({ response, provider, mode });
  } catch (err: any) {
    console.error('[AI] Error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ==================== ADMIN API ====================
const announcements: string[] = [];
let gatewayStatus = 'running';
let uptime = 0;
setInterval(() => uptime++, 1000);

app.get('/api/admin/status', authMw, adminMw, (_req, res) => {
  res.json({
    status: gatewayStatus,
    uptime: Math.floor(uptime),
    version: '3.0.0',
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage().heapUsed
  });
});

app.post('/api/admin/announcement', authMw, adminMw, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  announcements.push({ id: Date.now(), message, time: new Date().toISOString(), author: 'Admin' });
  res.json({ success: true, announcements });
});

app.get('/api/admin/announcements', authMw, (_req, res) => {
  res.json({ announcements });
});

app.post('/api/admin/restart-gateway', authMw, adminMw, (_req, res) => {
  gatewayStatus = 'restarting';
  setTimeout(() => { gatewayStatus = 'running'; }, 2000);
  res.json({ success: true, message: 'Gateway restarting...' });
});

// ==================== DYNAMIC ASSET CACHE ====================
app.get('/:prefix([a-z0-9]{4,8})/:filename', async (req, res) => {
  const { prefix, filename } = req.params;
  const cacheDir = path.join(process.cwd(), 'cache', prefix);
  const cacheFile = path.join(cacheDir, filename);
  if (fs.existsSync(cacheFile)) {
    const ext = path.extname(filename);
    if (ext === '.wasm') res.setHeader('Content-Type', 'application/wasm');
    else if (ext === '.js') res.setHeader('Content-Type', 'application/javascript');
    else if (ext === '.json') res.setHeader('Content-Type', 'application/json');
    else if (ext === '.svg') res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.sendFile(cacheFile);
  }
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  for (const url of [
    `https://raw.githubusercontent.com/lucideproxy/svg/main/${prefix}/${filename}`,
    `https://raw.githubusercontent.com/lucideproxy/svg/master/${prefix}/${filename}`
  ]) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(cacheFile, buffer);
        const ext = path.extname(filename);
        if (ext === '.wasm') res.setHeader('Content-Type', 'application/wasm');
        else if (ext === '.js') res.setHeader('Content-Type', 'application/javascript');
        else if (ext === '.json') res.setHeader('Content-Type', 'application/json');
        else if (ext === '.svg') res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.send(buffer);
      }
    } catch {}
  }
  return res.status(404).send(`Not found: ${prefix}/${filename}`);
});

// ==================== BOOTSTRAP ====================
async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(process.cwd(), 'dist', 'index.html')));
  }
  app.listen(Number(PORT), '0.0.0.0', () => console.log(`[XENA] Online on 0.0.0.0:${PORT}`));
}
bootstrap();
