// src/proxyEngine.ts - Proxy engine utilities for XENA

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

export function rewriteHtml(html: string, baseUrl: string, prefix: string = '/fetch/'): string {
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

export function generateSW(): string {
  return `const C='xena-cache-v1';
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
});`;
}

export const PROXY_MODES = [
  { id: 'sw', name: 'SW', fullName: 'Service Worker Engine', desc: 'Uses Service Worker to intercept and proxy requests client-side', badge: 'SW ENGINE', latency: '~12ms' },
  { id: 'rv', name: 'RV', fullName: 'Reverse Proxy', desc: 'Server-side reverse proxy that fetches and rewrites content (Default)', badge: 'REVERSE', latency: '~18ms' },
  { id: 'bss', name: 'BSS', fullName: 'Binary Stream Sandbox', desc: 'Optimized for streaming binary content with chunked encoding', badge: 'BINARY OS', latency: '~24ms' },
  { id: 'xt', name: 'XT', fullName: 'X-Treme Ultimate Proxy', desc: 'Multi-layer deep rewriting with DOM bridge injection for full interactivity preservation', badge: 'ULTIMATE', latency: '~32ms' }
];

export const DDG_OPTIONS: Record<string, { name: string; url: string; note: string }> = {
  ddg1: { name: 'DuckDuckGo Standard', url: 'https://duckduckgo.com/?q=', note: 'Standard DDG — may refuse iframe embedding' },
  ddg2: { name: 'DuckDuckGo HTML (No JS)', url: 'https://html.duckduckgo.com/html/?q=', note: 'Lightweight HTML version, works in proxies' },
  ddg3: { name: 'DuckDuckGo Lite', url: 'https://lite.duckduckgo.com/lite/?q=', note: 'Minimal version, best for proxied iframes' },
  ddg4: { name: 'Startpage (DDG alt)', url: 'https://www.startpage.com/sp/search?query=', note: 'Privacy-focused alternative' },
  ddg5: { name: 'Bing Fallback', url: 'https://www.bing.com/search?q=', note: 'Last resort fallback search engine' }
};

export const FUN_FACTS = [
  'The first computer virus was created in 1983',
  'There are over 1.8 billion websites on the internet',
  'The first 1GB hard drive weighed over 500 pounds in 1980',
  'Google processes over 8.5 billion searches per day',
  'The first email was sent by Ray Tomlinson in 1971',
  'More than 90% of the world\'s data was created in the last 2 years',
  'The first website is still online at info.cern.ch',
  'Over 500 hours of video are uploaded to YouTube every minute',
  'Python is named after Monty Python\'s Flying Circus',
  'The first iPhone had no copy and paste functionality',
  'Linux runs 90% of the world\'s cloud infrastructure',
  'The QWERTY keyboard was designed to slow typists down',
  'The first webcam was created to monitor a coffee pot',
  'CAPTCHA stands for Completely Automated Public Turing test',
  'The first computer bug was an actual moth found in a computer'
];
