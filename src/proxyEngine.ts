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
  'The first computer bug was an actual moth found in a computer',
  'Fun Fact Number 16 - The hashtag symbol is officially called an octothorpe',
  'The first domain name ever registered was Symbolics.com',
  'The original name for Windows was Interface Manager',
  'NASA is still using some technology from the 1970s on spacecraft',
  'The 404 error code was named after a room number at CERN where the web was born',
  'The first alarm clock could only ring at one time: 4 a.m.',
  'The world\'s first digital clock was invented in 1956',
  'The total weight of all the electricity running the internet is about 50 grams',
  'The first mobile phone call was made in New York City in 1973',
  'The original PlayStation was meant to be a Nintendo console plugin',
  'Amazon was almost named Cadabra, as in Abracadabra',
  'The first item ever scanned with a barcode was a pack of Wrigley\'s Juicy Fruit gum',
  'Firefox is actually named after the red panda, not a fox',
  'The first smartphone was created by IBM in 1992 and was called Simon',
  'Fun Fact Number 30 - Android was originally developed as an operating system for digital cameras',
  'The first computer mouse was made of wood by Douglas Engelbart',
  'In 1999, PayPal was voted one of the worst business ideas of the year',
  'The Nokia tune is actually based on a 19th-century guitar work called Gran Vals',
  'Over 300 billion emails are sent and received every single day',
  'The first text message ever sent said Merry Christmas',
  'A single Google search uses more computing power than it took to send Apollo 11 to the moon',
  'The original Twitter bird logo is named Larry, after basketball player Larry Bird',
  'Super Mario Bros. was so small it fit onto a 256-kilobit cartridge',
  'The first Apple logo featured Sir Isaac Newton sitting under an apple tree',
  'Wi-Fi doesn\'t actually stand for Wireless Fidelity; it\'s a made-up marketing term',
  'The average computer user blinks only 7 times a minute, instead of the usual 20',
  'The term robot comes from a Czech word meaning forced labor',
  'More people own a mobile phone than a toothbrush globally',
  'JPEG stands for Joint Photographic Experts Group',
  'The first banner ad went live in 1994 and had a 44% click-through rate',
  'GPS is owned and operated by the United States government',
  'Ebay was originally called AuctionWeb when it launched in 1995',
  'The first video ever uploaded to YouTube is called Me at the zoo',
  'Fun Fact Number 40 - Bluetooth was named after a 10th-century Scandinavian king who united Scandinavia',
  'The first commercial compact disc was pressed in 1982 and featured ABBA music',
  'Nearly 50% of all internet traffic comes from automated bots, not humans',
  'The founders of Google were willing to sell it to Excite for $1 million in 1999',
  'The first hard drive available for a home computer had a capacity of just 5 megabytes',
  'The dynamic island feature on newer iPhones replaces the traditional notch',
  'Siri was originally an independent app for iOS before Apple bought it',
  'The classic game Tetris was created in Soviet Russia by Alexey Pajitnov',
  'The first hard drive to cross the 1 terabyte mark was released by Hitachi in 2007',
  'The term spam for junk email comes from a Monty Python comedy sketch',
  'There are more active mobile connections in the world than there are people',
  'The world\'s first programmable computer was the Z1, built in 1936',
  'The first music video played on MTV was Video Killed the Radio Star by The Buggles',
  'The original name for Yahoo! was Jerry and David\'s Guide to the World Wide Web',
  'A petabyte is enough data to store 3.4 years of 24/7 4K video',
  'The save icon used in most software is a 3.5-inch floppy disk, which holds 1.44MB',
  'The first video game ever created was called Tennis for Two in 1958',
  'The spacebar is the most used key on a standard computer keyboard',
  'Netflix was founded in 1997, originally operating as a DVD-by-mail service',
  'The first laser was built in 1960 using a synthetic ruby crystal',
  'Fun Fact Number 57 - The original URL for Google was google.stanford.edu',
  'The world\'s first webcam image was a 128x128 grayscale picture of a coffee pot',
  'Macintosh computers were named after a variety of apple favored by the creator',
  'The first MP3 player was released in 1997 and could hold about 8 songs',
  'A single standard fiber optic cable can transmit the entire library of congress in seconds',
  'The blue color of Facebook is because Mark Zuckerberg is red-green colorblind',
  'The first 3D movie was released in theaters in 1922 and required green and red glasses',
  'The concept of the internet was envisioned by Nikola Tesla as early as 1900',
  'Over 90% of global currency exists only on computers as digital money',
  'The first digital camera was invented by an engineer at Kodak in 1975',
  'The term podcast is a blend of the words iPod and broadcast',
  'In 1995, the domain registration process for websites was completely free',
  'The first 4G cellular network was launched in South Korea in 2006',
  'The term bug was used to describe engineering glitches long before computers existed',
  'The world\'s most expensive domain name, Voice.com, sold for $30 million in 2019',
  'The first computer mouse required two wheels to track horizontal and vertical movement',
  'The original iPhone development team was kept so secret they called it Project Purple',
  'The first SMS message ever sent on a commercial network happened in December 1992',
  'The total amount of digital data in the world is measured in zettabytes',
  'The code that ran the Apollo 11 guidance computer was written by Margaret Hamilton',
  'The first consumer drones were available in the early 2010s',
  'The QWERTY layout was patented by Christopher Sholes in 1878',
  'The first virtual reality headset was created in 1968 and was called The Sword of Damocles',
  'Fun Fact Number 83 - The first commercial SMS text message was sent over the Vodafone GSM network',
  'The word emoji comes from the Japanese words for picture and character',
  'The first microprocessor was the Intel 4004, released in 1971',
  'The standard aspect ratio of 16:9 for modern screens was chosen as a compromise',
  'The first consumer version of Windows 95 sold 1 million copies in just 4 days',
  'The original concept of Wikipedia allowed anyone to edit without creating an account',
  'The first USB flash drives were introduced in 2000 with a capacity of 8 megabytes',
  'The word pixel is a combination of the words picture and element',
  'The first mechanical computer was designed by Charles Babbage in the 1830s',
  'The programming language JavaScript was famously written in just 10 days',
  'The first color photograph was taken by physicist James Clerk Maxwell in 1861',
  'The blue light emitted by screens can disrupt melatonin production and sleep patterns',
  'The first web browser capable of displaying images inline with text was Mosaic',
  'The world\'s first smartphone had a touchscreen, calendar, and fax capability',
  'The original mascot for Linux is a penguin named Tux',
  'The first Apple computer went on sale for the specific price of $666.66',
  'The first commercial cellular network was launched in Japan by NTT in 1979',
  'The word algorithm originates from the name of a 9th-century Persian mathematician',
  'The first solid-state drive for consumer PCs was introduced in the early 1991',
  'Fun Fact Number 100 - The Earth has more than 1 trillion species of microbes'
];
