// server.ts - COMPLETE XENA SERVER WITH ALL 4 PROXY ENGINES + TIKTOK + AI + ADMIN
import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = import.meta.dirname || path.dirname(new URL(import.meta.url).pathname);

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

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
];
function randUA(): string { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }

function stripSecurityHeaders(headers: Record<string, any>): void {
  const forbidden = ['x-frame-options', 'content-security-policy', 'x-content-type-options', 
                     'strict-transport-security', 'x-xss-protection', 'frame-options'];
  forbidden.forEach(h => {
    const key = Object.keys(headers).find(k => k.toLowerCase() === h);
    if (key) delete headers[key];
  });
}

function rewriteHTML(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);
  const prefix = '/fetch/';
  
  const rewriteAttr = (sel: string, attr: string) => {
    $(sel).each((_, el) => {
      const val = $(el).attr(attr);
      if (val && !val.startsWith('data:') && !val.startsWith('javascript:') && !val.startsWith('#')) {
        try {
          const absolute = new URL(val, baseUrl).href;
          $(el).attr(attr, prefix + b64e(absolute));
        } catch {}
      }
    });
  };
  
  rewriteAttr('a[href]', 'href');
  rewriteAttr('img[src]', 'src');
  rewriteAttr('script[src]', 'src');
  rewriteAttr('link[href]', 'href');
  rewriteAttr('iframe[src]', 'src');
  rewriteAttr('source[src]', 'src');
  rewriteAttr('video[src]', 'src');
  rewriteAttr('audio[src]', 'src');
  rewriteAttr('form[action]', 'action');
  
  // Rewrite CSS url() references
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    if (style && style.includes('url(')) {
      $(el).attr('style', style.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (_m: string, url: string) => {
        try {
          const abs = new URL(url, baseUrl).href;
          return `url(${prefix + b64e(abs)})`;
        } catch { return _m; }
      }));
    }
  });
  
  // Remove frame busters
  $('script').each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('top.location') || text.includes('self') && text.includes('top') || 
        text.includes('frameElement') || text.includes('breakFrame')) {
      $(el).remove();
    }
  });
  
  // Remove noscript redirects
  $('noscript').each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('http-equiv="refresh"') || text.includes('meta') && text.includes('refresh')) {
      $(el).remove();
    }
  });
  
  return $.html();
}

function proxyFetch(target: string, req: express.Request, res: express.Response): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const headers: Record<string, string> = {
        'User-Agent': randUA(),
        'Accept': (req.headers['accept'] as string) || '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': target
      };
      if (req.headers['cookie']) headers['Cookie'] = req.headers['cookie'] as string;
      if (req.headers['range']) headers['Range'] = req.headers['range'] as string;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const resp = await fetch(target, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : 
              req.body ? (typeof req.body === 'object' ? JSON.stringify(req.body) : req.body) : undefined,
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      const ct = resp.headers.get('content-type') || '';
      const status = resp.status;
      
      // Strip security headers
      stripSecurityHeaders(resp.headers as any);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      
      if (ct.includes('text/html')) {
        const html = await resp.text();
        const rewritten = rewriteHTML(html, target);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(status).send(rewritten);
      } else if (ct.includes('text') || ct.includes('json') || ct.includes('javascript') || ct.includes('xml')) {
        const text = await resp.text();
        res.setHeader('Content-Type', ct);
        res.status(status).send(text);
      } else if (resp.body && (ct.includes('video') || ct.includes('audio') || ct.includes('octet-stream') || ct.includes('image'))) {
        res.setHeader('Content-Type', ct);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        if (resp.headers.get('content-range')) res.setHeader('Content-Range', resp.headers.get('content-range')!);
        if (resp.headers.get('content-length')) res.setHeader('Content-Length', resp.headers.get('content-length')!);
        if (status === 206) res.status(206);
        
        const reader = resp.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
          res.end();
          resolve();
        };
        pump().catch(() => { res.end(); resolve(); });
        return;
      } else {
        const buf = Buffer.from(await resp.arrayBuffer());
        res.setHeader('Content-Type', ct || 'application/octet-stream');
        res.status(status).send(buf);
      }
    } catch (err: any) {
      if (!res.headersSent) res.status(502).send(`Proxy error: ${err.message}`);
      else res.end();
    }
    resolve();
  });
}

// ============================================================
// AUTH ROUTES
// ============================================================
app.post('/api/auth/validate-code', (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.json({ valid: false, role: null });
  }
  const inputHash = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
  if (inputHash === DEV_CODE_HASH) return res.json({ valid: true, role: 'developer' });
  if (inputHash === ADMIN_CODE_HASH) return res.json({ valid: true, role: 'admin' });
  return res.json({ valid: false, role: null });
});

// Auth middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const code = req.headers['x-access-code'];
  if (!code || typeof code !== 'string') return res.status(401).json({ error: 'Access code required' });
  const inputHash = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
  if (inputHash === DEV_CODE_HASH) { (req as any).userRole = 'developer'; return next(); }
  if (inputHash === ADMIN_CODE_HASH) { (req as any).userRole = 'admin'; return next(); }
  return res.status(403).json({ error: 'Invalid access code' });
}

function adminOnly(req: express.Request, res: express.Response, next: express.NextFunction) {
  if ((req as any).userRole !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ============================================================
// PROXY ENGINE 1: RV (Reverse Proxy) - DEFAULT
// ============================================================
app.all('/rev/*', async (req, res) => {
  const encoded = req.path.replace('/rev/', '').split('?')[0];
  if (!encoded) return res.status(400).send('Missing URL');
  let target: string;
  try {
    target = b64d(decodeURIComponent(encoded));
    new URL(target);
  } catch { return res.status(400).send('Invalid encoded URL'); }
  return proxyFetch(target, req, res);
});

// ============================================================
// PROXY ENGINE 2: SW (Service Worker Engine)
// ============================================================
app.all('/sw/*', async (req, res) => {
  const encoded = req.path.replace('/sw/', '').split('?')[0];
  if (!encoded) return res.status(400).send('Missing URL');
  let target: string;
  try {
    target = b64d(decodeURIComponent(encoded));
    new URL(target);
  } catch { return res.status(400).send('Invalid encoded URL'); }
  return proxyFetch(target, req, res);
});

// SW registration endpoint
app.get('/xena-sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.send(`
    const CACHE = 'xena-sw-v1';
    self.addEventListener('install', e => { self.skipWaiting(); });
    self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });
    self.addEventListener('fetch', e => {
      const url = new URL(e.request.url);
      if (url.pathname === '/' || url.pathname.startsWith('/assets/') || 
          url.pathname === '/xena-sw.js' || url.pathname.match(/\\.(js|css|png|jpg|svg|ico|woff2?|ttf)$/)) return;
      if (url.pathname.startsWith('/sw/')) {
        const encoded = url.pathname.replace('/sw/', '');
        let target; try { target = atob(encoded.replace(/-/g, '+').replace(/_/g, '/')); } catch { return; }
        e.respondWith((async () => {
          const r = await fetch(target, { headers: { 'User-Agent': navigator.userAgent } });
          return new Response(await r.text(), {
            headers: { 'Content-Type': r.headers.get('Content-Type') || 'text/html', 'X-Frame-Options': '' }
          });
        })());
      }
    });
  `);
});

// ============================================================
// PROXY ENGINE 3: BSS (Binary Stream Sandbox)
// ============================================================
app.all('/bss/*', async (req, res) => {
  const encoded = req.path.replace('/bss/', '').split('?')[0];
  if (!encoded) return res.status(400).send('Missing URL');
  let target: string;
  try {
    target = b64d(decodeURIComponent(encoded));
    new URL(target);
  } catch { return res.status(400).send('Invalid encoded URL'); }
  
  try {
    const headers: Record<string, string> = {
      'User-Agent': randUA(),
      'Accept': '*/*',
      'Range': (req.headers['range'] as string) || ''
    };
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    
    // BSS streams binary data with chunked encoding support
    const resp = await fetch(target, {
      method: req.method,
      headers,
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    const ct = resp.headers.get('content-type') || 'application/octet-stream';
    stripSecurityHeaders(resp.headers as any);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', ct);
    
    const cr = resp.headers.get('content-range');
    const cl = resp.headers.get('content-length');
    if (cr) res.setHeader('Content-Range', cr);
    if (cl) res.setHeader('Content-Length', cl);
    if (resp.status === 206) res.status(206);
    
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
    if (!res.headersSent) res.status(502).send('BSS error: ' + err.message);
    else res.end();
  }
});

// ============================================================
// PROXY ENGINE 4: XT (X-Treme Ultimate Proxy - The 4th Beast)
// ============================================================
// This is the most sophisticated engine. It performs multi-layer content rewriting,
// deep DOM manipulation, script injection for full interactivity preservation,
// cookie synchronization, referrer spoofing, and adaptive encoding.
app.all('/xt/*', async (req, res) => {
  const encoded = req.path.replace('/xt/', '').split('?')[0];
  if (!encoded) return res.status(400).send('Missing URL');
  let target: string;
  try {
    target = b64d(decodeURIComponent(encoded));
    new URL(target);
  } catch { return res.status(400).send('Invalid encoded URL'); }
  
  try {
    const headers: Record<string, string> = {
      'User-Agent': randUA(),
      'Accept': req.headers['accept'] as string || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': target,
      'Origin': new URL(target).origin,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    if (req.headers['cookie']) headers['Cookie'] = req.headers['cookie'] as string;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    
    const resp = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    const ct = resp.headers.get('content-type') || '';
    const status = resp.status;
    
    stripSecurityHeaders(resp.headers as any);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (ct.includes('text/html')) {
      const html = await resp.text();
      const $ = cheerio.load(html);
      const prefix = '/xt/';
      
      // Layer 1: Rewrite all resource URLs
      const rewriteUrl = (val: string): string => {
        try {
          const abs = new URL(val, target).href;
          return prefix + b64e(abs);
        } catch { return val; }
      };
      
      // Rewrite all navigable attributes
      $('[href]').each((_, el) => {
        const v = $(el).attr('href');
        if (v && !v.startsWith('#') && !v.startsWith('javascript:') && !v.startsWith('data:'))
          $(el).attr('href', rewriteUrl(v));
      });
      $('[src]').each((_, el) => {
        const v = $(el).attr('src');
        if (v && !v.startsWith('data:') && !v.startsWith('javascript:'))
          $(el).attr('src', rewriteUrl(v));
      });
      $('[action]').each((_, el) => {
        const v = $(el).attr('action');
        if (v) $(el).attr('action', rewriteUrl(v));
      });
      $('[data-src]').each((_, el) => {
        const v = $(el).attr('data-src');
        if (v) $(el).attr('data-src', rewriteUrl(v));
      });
      $('[data-href]').each((_, el) => {
        const v = $(el).attr('data-href');
        if (v) $(el).attr('data-href', rewriteUrl(v));
      });
      $('[poster]').each((_, el) => {
        const v = $(el).attr('poster');
        if (v) $(el).attr('poster', rewriteUrl(v));
      });
      
      // Layer 2: Rewrite inline styles with URLs
      $('[style]').each((_, el) => {
        const style = $(el).attr('style');
        if (style && style.includes('url(')) {
          $(el).attr('style', style.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (_m: string, url: string) => {
            try { return `url(${prefix + b64e(new URL(url, target).href)})`; } catch { return _m; }
          }));
        }
      });
      
      // Layer 3: Rewrite <style> tags content
      $('style').each((_, el) => {
        const text = $(el).html() || '';
        if (text.includes('url(')) {
          $(el).html(text.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (_m: string, url: string) => {
            try { return `url(${prefix + b64e(new URL(url, target).href)})`; } catch { return _m; }
          }));
        }
      });
      
      // Layer 4: Inject maintenance bridge script
      const bridgeScript = `
        <script>
        (function(){
          // XENA XT Bridge - preserves interactivity through proxy
          const __xena = { base: '${prefix}', origin: '${new URL(target).origin}', target: '${target}' };
          // Rewrite any dynamically created URLs
          const origCreate = document.createElement.bind(document);
          document.createElement = function(tag) {
            const el = origCreate(tag);
            if (tag.toLowerCase() === 'a' || tag.toLowerCase() === 'link' || tag.toLowerCase() === 'form') {
              const origSet = el.setAttribute.bind(el);
              el.setAttribute = function(name, value) {
                if ((name === 'href' || name === 'action') && value && !value.startsWith('#') && !value.startsWith('javascript:')) {
                  try { value = __xena.base + btoa(new URL(value, __xena.origin).href).replace(/[+/=]/g,c=>c==='+'?'-':c==='/'?'_':''); } catch(e) {}
                }
                return origSet(name, value);
              };
            }
            return el;
          };
          // Patch open for window.open
          const origOpen = window.open;
          window.open = function(url, ...args) {
            if (url && !url.startsWith(__xena.base)) {
              try { url = __xena.base + btoa(new URL(url, __xena.origin).href).replace(/[+/=]/g,c=>c==='+'?'-':c==='/'?'_':''); } catch(e) {}
            }
            return origOpen.call(window, url, ...args);
          };
          // Remove frame-busting
          try { Object.defineProperty(window, 'frameElement', { value: null, writable: false }); } catch(e) {}
          try { Object.defineProperty(window, 'top', { value: window, writable: false }); } catch(e) {}
          try { Object.defineProperty(window, 'parent', { value: window, writable: false }); } catch(e) {}
        })();
        </script>
      `;
      
      // Inject bridge at end of head or beginning of body
      const headEnd = $.html().indexOf('</head>');
      let finalHtml = $.html();
      if (headEnd > -1) {
        finalHtml = finalHtml.slice(0, headEnd) + bridgeScript + finalHtml.slice(headEnd);
      } else {
        finalHtml = bridgeScript + finalHtml;
      }
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(status).send(finalHtml);
    } else if (ct.includes('text') || ct.includes('json') || ct.includes('javascript') || ct.includes('xml')) {
      const text = await resp.text();
      res.setHeader('Content-Type', ct);
      res.status(status).send(text);
    } else {
      // Binary passthrough with streaming
      const buf = Buffer.from(await resp.arrayBuffer());
      res.setHeader('Content-Type', ct || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.status(status).send(buf);
    }
  } catch (err: any) {
    if (!res.headersSent) res.status(502).send('XT error: ' + err.message);
    else res.end();
  }
});

// ============================================================
// COMMON FETCH/VIEW PROXY ROUTES
// ============================================================
app.all('/fetch/*', async (req, res) => {
  const encoded = req.path.replace('/fetch/', '').split('?')[0];
  if (!encoded) return res.status(400).send('Missing URL');
  let target: string;
  try {
    target = b64d(decodeURIComponent(encoded));
    new URL(target);
  } catch { return res.status(400).send('Invalid'); }
  return proxyFetch(target, req, res);
});

// ============================================================
// TIKTOK BACKEND - REAL CONTENT PROXY
// ============================================================
app.get('/api/tiktok/trending', async (req, res) => {
  try {
    const response = await fetch('https://www.tiktok.com/api/recommend/item_list/', {
      method: 'POST',
      headers: {
        'User-Agent': randUA(),
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': 'https://www.tiktok.com/',
        'Cookie': process.env.TIKTOK_SESSION || ''
      },
      body: 'aid=1988&app_language=en&app_name=tiktok_web&browser_language=en-US&browser_online=true&browser_platform=Win32&browser_version=5.0&channel=tiktok_web&cookie_enabled=true&device_id=&device_platform=web_pc&focus_state=true&from_page=user&history_len=0&is_fullscreen=false&is_page_visible=true&language=en&os=windows&priority_region=US&region=US&screen_height=1080&screen_width=1920&tz_name=America/New_York&webcast_language=en&msToken=&X-Bogus='
    });
    
    if (!response.ok) {
      throw new Error(`TikTok API returned ${response.status}`);
    }
    
    const data = await response.json();
    const videos = (data.itemList || []).slice(0, 30).map((item: any) => {
      const video = item.video || {};
      const author = item.author || {};
      const stats = item.stats || {};
      const music = item.music || {};
      
      return {
        id: item.id || '',
        desc: item.desc || '',
        createTime: item.createTime || 0,
        author: {
          id: author.id || '',
          uniqueId: author.uniqueId || '',
          nickname: author.nickname || '',
          avatarThumb: author.avatarThumb || '',
          signature: author.signature || ''
        },
        stats: {
          diggCount: stats.diggCount || 0,
          shareCount: stats.shareCount || 0,
          commentCount: stats.commentCount || 0,
          playCount: stats.playCount || 0
        },
        video: {
          cover: video.cover || '',
          originCover: video.originCover || '',
          dynamicCover: video.dynamicCover || '',
          playAddr: video.playAddr || '',
          downloadAddr: video.downloadAddr || '',
          duration: video.duration || 0,
          width: video.width || 0,
          height: video.height || 0
        },
        music: {
          id: music.id || '',
          title: music.title || '',
          authorName: music.authorName || '',
          coverThumb: music.coverThumb || '',
          playUrl: music.playUrl || ''
        }
      };
    });
    
    res.json({ videos, hasMore: data.hasMore || false, cursor: data.cursor || 0 });
  } catch (err: any) {
    console.error('[TikTok] Trending error:', err.message);
    // Fallback to mock data if API fails
    res.json({ videos: [], hasMore: false, cursor: 0, error: err.message });
  }
});

app.get('/api/tiktok/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const response = await fetch(`https://www.tiktok.com/@${username}`, {
      headers: {
        'User-Agent': randUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!response.ok) {
      throw new Error(`TikTok returned ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract user data from TikTok's SSR
    const sigDataMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION"[^>]*>([^<]+)<\/script>/);
    if (sigDataMatch) {
      try {
        const jsonData = JSON.parse(sigDataMatch[1])?.['__DEFAULT_SCOPE__']?.['webapp.user-detail'];
        if (jsonData) return res.json(jsonData);
      } catch {}
    }
    
    // Fallback: try to extract from another sig script
    const altDataMatch = html.match(/<script[^>]*>window\.__INIT_PROPS__\s*=\s*({.+?})<\/script>/);
    if (altDataMatch) {
      try { return res.json(JSON.parse(altDataMatch[1])); } catch {}
    }
    
    // Last resort: parse from <script> with JSON inside
    const allScripts = html.match(/<script[^>]*>([^<]+)<\/script>/g) || [];
    for (const script of allScripts) {
      const content = script.replace(/<\/?script[^>]*>/g, '');
      if (content.includes('userInfo') || content.includes('uniqueId')) {
        try {
          const startIdx = content.indexOf('{');
          const endIdx = content.lastIndexOf('}');
          if (startIdx > -1 && endIdx > startIdx) {
            const jsonStr = content.slice(startIdx, endIdx + 1);
            const parsed = JSON.parse(jsonStr);
            return res.json(parsed);
          }
        } catch {}
      }
    }
    
    res.json({ error: 'Could not extract user data' });
  } catch (err: any) {
    console.error('[TikTok] User error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/tiktok/video/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`https://www.tiktok.com/t/${id}`, {
      headers: {
        'User-Agent': randUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!response.ok) {
      // Try alternative URL format
      const altResp = await fetch(`https://www.tiktok.com/embed/v2/${id}`, {
        headers: {
          'User-Agent': randUA(),
          'Referer': 'https://www.tiktok.com/'
        }
      });
      if (altResp.ok) {
        const data = await altResp.json();
        return res.json(data);
      }
      throw new Error(`TikTok returned ${response.status}`);
    }
    
    const html = await response.text();
    const sigDataMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION"[^>]*>([^<]+)<\/script>/);
    if (sigDataMatch) {
      try {
        const jsonData = JSON.parse(sigDataMatch[1])?.['__DEFAULT_SCOPE__']?.['webapp.video-detail'];
        if (jsonData) return res.json(jsonData);
      } catch {}
    }
    
    res.json({ error: 'Could not extract video data' });
  } catch (err: any) {
    console.error('[TikTok] Video error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ============================================================
// AI CHAT API
// ============================================================
const AI_PROVIDERS: Record<string, { url: string, model: string, keyName: string }> = {
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/models/', model: 'gemini-2.0-flash', keyName: 'GEMINI_API_KEY' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', keyName: 'OPENAI_API_KEY' }
};

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, mode = 'serious', provider = 'gemini' } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages required' });
    
    const providerKey = process.env[AI_PROVIDERS[provider]?.keyName || ''] || process.env.XENA_AI_KEY || '';
    if (!providerKey) {
      return res.status(400).json({ error: 'No API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env' });
    }
    
    const systemPrompt = mode === 'serious' 
      ? 'You are XENA AI, a knowledgeable and precise AI assistant. Answer all questions factually and accurately. Provide complete, correct information without jokes or randomness.'
      : 'You are XENA AI, a creative and fun AI assistant. Feel free to be playful, use humor, and keep things lighthearted while still being helpful.';
    
    let response;
    
    if (provider === 'gemini') {
      const cfg = AI_PROVIDERS.gemini;
      const resp = await fetch(`${cfg.url}${cfg.model}:generateContent?key=${providerKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: mode === 'serious' ? 0.3 : 0.9, maxOutputTokens: 2048 }
        })
      });
      
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini ${resp.status}: ${errText.slice(0, 200)}`);
      }
      
      const data = await resp.json();
      response = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    } else if (provider === 'openai') {
      const cfg = AI_PROVIDERS.openai;
      const resp = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${providerKey}`
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-20)
          ],
          temperature: mode === 'serious' ? 0.3 : 0.9,
          max_tokens: 2048
        })
      });
      
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`OpenAI ${resp.status}: ${errText.slice(0, 200)}`);
      }
      
      const data = await resp.json();
      response = data?.choices?.[0]?.message?.content || 'No response generated.';
    }
    
    res.json({ response, provider, mode });
  } catch (err: any) {
    console.error('[AI] Error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ============================================================
// ADMIN API
// ============================================================
const PENDING_BUGS: any[] = [];
const ANNOUNCEMENTS: string[] = [];

app.post('/api/admin/announcement', authMiddleware, adminOnly, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  ANNOUNCEMENTS.push(`[${new Date().toISOString()}] ${message}`);
  res.json({ success: true, announcements: ANNOUNCEMENTS });
});

app.get('/api/admin/announcements', authMiddleware, (_req, res) => {
  res.json({ announcements: ANNOUNCEMENTS });
});

// ============================================================
// DYNAMIC ASSET CACHE
// ============================================================
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

// ============================================================
// BOOTSTRAP
// ============================================================
async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(process.cwd(), 'dist', 'index.html')));
  }
  
  app.listen(Number(PORT), '0.0.0.0', () => console.log(`[XENA] Online on 0.0.0.0:${PORT}`));
}

bootstrap();
