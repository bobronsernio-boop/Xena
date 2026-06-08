import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send,
  Shield, Bug, Cpu, Terminal, Search, Heart, MessageCircle, Share2, Play, Pause,
  Volume2, VolumeX, Sun, Moon, LogOut, Bell, RefreshCw, AlertTriangle, Users,
  ChevronRight, ChevronLeft, ExternalLink, Trash2, Star
} from 'lucide-react';

// ==================== ENCODING ====================
function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c === '+' ? '-' : c === '/' ? '_' : ''); }
  catch { return encodeURIComponent(v); }
}
function b64d(v: string): string {
  try { let t = v.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; return decodeURIComponent(escape(atob(t))); }
  catch { return v; }
}

// ==================== PROXY MODES ====================
const PROXY_MODES = [
  { id: 'rv', name: 'RV', fullName: 'Reverse Proxy', desc: 'Server-side reverse proxy (Default)', badge: 'REVERSE', latency: '~18ms' },
  { id: 'sw', name: 'SW', fullName: 'Service Worker Engine', desc: 'Client-side SW interception', badge: 'SW ENGINE', latency: '~12ms' },
  { id: 'bss', name: 'BSS', fullName: 'Binary Stream Sandbox', desc: 'Streaming binary content', badge: 'BINARY OS', latency: '~24ms' },
  { id: 'xt', name: 'XT', fullName: 'X-Treme Ultimate Proxy', desc: 'Deep rewrite + DOM bridge', badge: 'ULTIMATE', latency: '~32ms' }
];

// ==================== DDG OPTIONS ====================
const DDG_OPTIONS: Record<string, { name: string; url: string; note: string }> = {
  ddg1: { name: 'DuckDuckGo Standard', url: 'https://duckduckgo.com/?q=', note: 'Standard DDG — may refuse iframe embedding' },
  ddg2: { name: 'DuckDuckGo HTML', url: 'https://html.duckduckgo.com/html/?q=', note: 'HTML-only version, no JS required' },
  ddg3: { name: 'DuckDuckGo Lite', url: 'https://lite.duckduckgo.com/lite/?q=', note: 'Lite version — best iframe compatibility' },
  ddg4: { name: 'Startpage', url: 'https://www.startpage.com/do/dsearch?query=', note: 'Private search engine, good fallback' },
  ddg5: { name: 'Bing', url: 'https://www.bing.com/search?q=', note: 'Bing — always works in iframes' }
};

// ==================== FUN FACTS ====================
const FUN_FACTS = [
  'The first computer virus was created in 1983',
  'Not a fun fact but no ads. Ever!',
  'The first 1GB hard drive weighed over 500 pounds in 1980',
  'Google processes over 8.5 billion searches per day',
  'The first email was sent by Ray Tomlinson in 1971',
  'The first website ever is still online at info.cern.ch',
  'The world\'s first website was published on August 6, 1991',
  'Over 6 billion Google searches happen every day',
  'The first YouTube video was uploaded on April 23, 2005',
  'The first webcam was created to monitor a coffee pot',
  'CAPTCHA stands for Completely Automated Public Turing test',
  'The first computer bug was an actual moth found in a computer',
  'The hashtag symbol is officially called an octothorpe',
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
  'Im fun fact number 15',
  'Android was originally developed as an operating system for digital cameras',
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
  'Im fun fact number 35',
  'Bluetooth was named after a 10th-century Scandinavian king who united Scandinavia',
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
  'Im fun fact number 56',
  'The original URL for Google was google.stanford.edu',
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
  'Im fun fact number 80',
  'The first commercial SMS text message was sent over the Vodafone GSM network',
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
  'Im fun fact number 100'
];

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getRandomFact(): string {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}

// ==================== TYPES ====================
interface SearchItem {
  query: string;
  engine: string;
  timestamp: string;
}

interface AIHistoryItem {
  message: string;
  response: string;
  mode: string;
  timestamp: string;
}

interface BugReport {
  id: number;
  title: string;
  description: string;
  page: string;
  steps: string;
  important: boolean;
  time: string;
}

// ==================== MAIN APP ====================
export default function App() {
  // State
  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [proxyMode, setProxyMode] = useState(() => localStorage.getItem('xena_proxy_mode') || 'rv');
  const [ddgMode, setDdgMode] = useState(() => localStorage.getItem('xena_ddg_mode') || 'ddg3');
  const [ping, setPing] = useState<number>(0);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [modal, setModal] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<'general' | 'history'>('general');
  const [cloakOn, setCloakOn] = useState(() => localStorage.getItem('xena_cloak') === 'on');
  const [escKey, setEscKey] = useState(() => localStorage.getItem('xena_escape_key') || '`');
  const [escUrl, setEscUrl] = useState(() => localStorage.getItem('xena_escape_url') || 'https://google.com');
  const [greeting, setGreeting] = useState(getTimeGreeting());
  const [funFact, setFunFact] = useState(getRandomFact());
  const [searchHistory, setSearchHistory] = useState<SearchItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('xena_search_history') || '[]'); }
    catch { return []; }
  });
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingScreen, setPendingScreen] = useState<'dev' | 'admin'>('dev');
  const [passwordInput, setPasswordInput] = useState('');
  const [aiHistory, setAiHistory] = useState<AIHistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('xena_ai_history') || '[]'); }
    catch { return []; }
  });
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
      setGreeting(getTimeGreeting());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotate fun fact every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => setFunFact(getRandomFact()), 15000);
    return () => clearInterval(interval);
  }, []);

  // Ping simulation
  useEffect(() => {
    const interval = setInterval(() => setPing(Math.floor(Math.random() * 40) + 15), 3000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === escKey) { window.location.href = escUrl; }
      if (e.key === 'Enter' && document.activeElement === inputRef.current) { handleGo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [escKey, escUrl, url]);

  // Check if on a specific route
  const path = window.location.pathname;

  // ==================== ROUTES ====================
  if (path === '/dev-console') return <DevConsole />;
  if (path === '/admin-console') return <AdminConsole />;
  if (path === '/tiktok') return <TikTokClone />;

  // ==================== HANDLERS ====================
  function handleGo(q?: string) {
    const query = q || url;
    if (!query.trim()) return;

    let finalUrl = query;
    // Check if it's a search or direct URL
    if (!query.startsWith('http://') && !query.startsWith('https://') && !query.startsWith('//')) {
      if (query.includes('.') && !query.includes(' ')) {
        finalUrl = 'https://' + query;
      } else {
        // Search using current DDG mode
        const engine = DDG_OPTIONS[ddgMode as keyof typeof DDG_OPTIONS] || DDG_OPTIONS.ddg3;
        finalUrl = engine.url + encodeURIComponent(query);
      }
    }

    setIframeUrl(finalUrl);

    // Add to search history
    const engineName = DDG_OPTIONS[ddgMode as keyof typeof DDG_OPTIONS]?.name || 'Unknown';
    const newItem: SearchItem = { query, engine: engineName, timestamp: new Date().toLocaleString() };
    const updated = [newItem, ...searchHistory].slice(0, 50);
    setSearchHistory(updated);
    localStorage.setItem('xena_search_history', JSON.stringify(updated));
    setUrl('');
  }

  async function checkAccessCode(code: string): Promise<boolean> {
    try {
      const res = await fetch('/api/check-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() })
      });
      const data = await res.json();
      if (data.role === 'developer') { setDevUnlocked(true); setModal(null); return true; }
      if (data.role === 'admin') { setDevUnlocked(true); setAdminUnlocked(true); setModal(null); return true; }
      return false;
    } catch { return false; }
  }

  function goToDevConsole() {
    setPendingScreen('dev');
    setPasswordInput('');
    setShowPasswordModal(true);
  }

  function goToAdminConsole() {
    setPendingScreen('admin');
    setPasswordInput('');
    setShowPasswordModal(true);
  }

  async function handlePasswordSubmit() {
    try {
      const res = await fetch('/api/check-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: passwordInput.toUpperCase() })
      });
      const data = await res.json();
      if (data.role === 'admin' && pendingScreen === 'admin') {
        setDevUnlocked(true); setAdminUnlocked(true);
        setShowPasswordModal(false);
        window.location.href = '/admin-console';
      } else if (data.role === 'developer' || data.role === 'admin') {
        setDevUnlocked(true);
        if (data.role === 'admin') setAdminUnlocked(true);
        setShowPasswordModal(false);
        window.location.href = '/dev-console';
      } else {
        alert('Invalid code');
      }
    } catch {
      alert('Error checking code');
    }
  }

  function logout() {
    localStorage.removeItem('xena_dev_unlocked');
    localStorage.removeItem('xena_admin_unlocked');
    setDevUnlocked(false);
    setAdminUnlocked(false);
  }

  function goBack() { try { iframeRef.current?.contentWindow?.history.back(); } catch {} }
  function goForward() { try { iframeRef.current?.contentWindow?.history.forward(); } catch {} }
  function refresh() { if (iframeUrl) setIframeUrl(prev => prev ? prev + (prev.includes('?') ? '&_t=' : '?_t=') + Date.now() : ''); }

  const proxyBase = proxyMode === 'rv' ? '/rev' : proxyMode === 'sw' ? '/sw' : proxyMode === 'bss' ? '/bin' : '/xt';
  const activeMode = PROXY_MODES.find(m => m.id === proxyMode) || PROXY_MODES[0];

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden font-mono">
      {/* ===== TOP BAR ===== */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border-b border-zinc-900 shrink-0">
        <button onClick={goBack} className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white"><ArrowLeft size={14} /></button>
        <button onClick={goForward} className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white"><ArrowRight size={14} /></button>
        <button onClick={refresh} className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white"><RotateCw size={14} /></button>

        <div className="flex-1 flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-[9px] font-semibold text-zinc-600 shrink-0">
            <Shield size={10} className="text-emerald-500" />
            <span className="text-emerald-500">SECURE</span>
            <span className="text-zinc-700">|</span>
            <span className="text-amber-500">{activeMode.badge}</span>
            {devUnlocked && <span className="text-cyan-400">DEV</span>}
            {adminUnlocked && <span className="text-purple-400">ADMIN</span>}
          </div>
          <div className="flex-1 flex items-center bg-zinc-900 rounded-md border border-zinc-800 px-2 py-1">
            <Globe size={12} className="text-zinc-600 shrink-0 mr-1.5" />
            <input ref={inputRef} value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGo()} placeholder="Search or enter URL..." className="flex-1 bg-transparent text-xs text-white outline-none placeholder-zinc-600" />
            <button onClick={() => handleGo()} className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500"><Search size={12} /></button>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[9px] text-zinc-600">
          <span className="text-zinc-700">{ping}ms</span>
          <span className="text-zinc-800">|</span>
          <span>{time}</span>
        </div>

        <button onClick={() => setModal('settings')} className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white"><Settings size={14} /></button>
        <button onClick={goToDevConsole} className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white"><Terminal size={14} /></button>
        <button onClick={goToAdminConsole} className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white"><Shield size={14} /></button>
      </div>

      {/* ===== IFRAME AREA ===== */}
      <div className="flex-1 bg-black relative">
        {iframeUrl ? (
          <iframe ref={iframeRef} src={`${proxyBase}/${b64e(iframeUrl)}`} className="w-full h-full border-none" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="text-5xl font-bold font-display mb-2 text-white/10 select-none">XENA</div>
            <p className="text-zinc-600 text-sm mb-1">{greeting}.</p>
            <p className="text-zinc-700 text-xs max-w-md">{funFact}</p>
          </div>
        )}
      </div>

      {/* ===== SETTINGS MODAL ===== */}
      {modal === 'settings' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 w-[420px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold font-mono tracking-wider text-white">## Settings</h2>
              <button onClick={() => setModal(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-500"><X size={14} /></button>
            </div>

            {/* Tabs */}
            <div className="flex mb-4 border-b border-zinc-900">
              {['general', 'history'].map(t => (
                <button key={t} onClick={() => setSettingsTab(t as 'general' | 'history')} className={`flex-1 py-2.5 text-[10px] font-mono tracking-wider uppercase border-b-2 text-center transition-all ${settingsTab === t ? 'border-white text-white font-bold' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                  {t === 'general' ? 'Stealth' : 'History'}
                </button>
              ))}
            </div>

            {settingsTab === 'general' && (
              <div className="space-y-4">
                {/* Cloak */}
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-zinc-400">Classroom Cloak</label>
                  <button onClick={() => { setCloakOn(!cloakOn); localStorage.setItem('xena_cloak', cloakOn ? 'off' : 'on'); }} className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider font-mono ${cloakOn ? 'bg-white/10 text-white border border-zinc-700' : 'bg-zinc-950 text-zinc-600 border border-zinc-800'}`}>
                    {cloakOn ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Panic Escape */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 mb-1 block">Panic Escape</label>
                  <p className="text-[9px] text-zinc-700 mb-1">Key: {escKey}</p>
                  <input value={escKey} onChange={e => { setEscKey(e.target.value); localStorage.setItem('xena_escape_key', e.target.value); }} className="w-full h-8 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-mono text-white outline-none focus:border-zinc-500 mb-1" />
                  <input value={escUrl} onChange={e => { setEscUrl(e.target.value); localStorage.setItem('xena_escape_url', e.target.value); }} className="w-full h-8 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white outline-none focus:border-zinc-500" />
                </div>

                {/* Proxy Engine */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 mb-2 block">Proxy Engine</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROXY_MODES.map(mode => {
                      const isActive = proxyMode === mode.id;
                      return (
                        <button key={mode.id} onClick={() => { setProxyMode(mode.id); localStorage.setItem('xena_proxy_mode', mode.id); }} className={`p-3 rounded-lg border cursor-pointer transition-all text-left ${isActive ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                          <div className="text-xs font-bold mb-0.5">{mode.name}</div>
                          <div className="text-[9px] text-zinc-500">{mode.desc}</div>
                          <div className="flex gap-1 mt-1">
                            <span className="text-[8px] px-1 py-0.5 rounded bg-zinc-900 text-zinc-500">{mode.badge}</span>
                            <span className="text-[8px] px-1 py-0.5 rounded bg-zinc-900 text-zinc-500">{mode.latency}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search Engine */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 mb-2 block">Search Engine</label>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {Object.entries(DDG_OPTIONS).map(([k, o]) => (
                      <button key={k} onClick={() => { setDdgMode(k); localStorage.setItem('xena_ddg_mode', k); }} className={`px-2 py-1 rounded text-[9px] font-mono border ${ddgMode === k ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                        {o.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-zinc-700">DDG is annoying and doesn't always work so try another mode. Just know all of them have an old layout I can't control. MB</p>
                </div>

                {/* Access Codes */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 mb-2 block">Access Codes</label>
                  <div className="flex gap-2">
                    <input value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder="Enter code..." maxLength={5} className="flex-1 h-8 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-mono text-white outline-none focus:border-zinc-500 uppercase tracking-widest" />
                    <button onClick={async () => { const ok = await checkAccessCode(accessCode); if (!ok) alert('Invalid code'); }} className="h-8 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-semibold font-mono">
                      Unlock
                    </button>
                  </div>
                </div>

                {/* Privacy */}
                <div className="flex gap-2">
                  <button onClick={() => { const w = window.open('about:blank', '_blank'); if (w) { w.document.write('<iframe style=\"width:100%;height:100%;border:none\" src=\"' + window.location.href + '\"></iframe>'); } }} className="flex-1 h-8 rounded-lg border border-zinc-800 bg-black text-[10px] text-zinc-500 hover:text-white font-mono">
                    About:Blank
                  </button>
                  <button onClick={() => { try { const b = new Blob(['<html><body><iframe style="width:100%;height:100%;border:none" src="' + window.location.href + '"></iframe></body></html>'], { type: 'text/html' }); window.open(URL.createObjectURL(b)); } catch {} }} className="flex-1 h-8 rounded-lg border border-zinc-800 bg-black text-[10px] text-zinc-500 hover:text-white font-mono">
                    Blob:URL
                  </button>
                </div>
              </div>
            )}

            {settingsTab === 'history' && (
              <div className="space-y-4">
                {/* Search History */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono text-zinc-400">Search History ({searchHistory.length})</label>
                    {searchHistory.length > 0 && (
                      <button onClick={() => { setSearchHistory([]); localStorage.removeItem('xena_search_history'); }} className="text-[8px] font-mono uppercase bg-zinc-950 px-1.5 py-0.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded">
                        Clear
                      </button>
                    )}
                  </div>
                  {searchHistory.length === 0 ? (
                    <p className="text-[10px] text-zinc-700">No search history.</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {searchHistory.slice(0, 20).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-1.5 rounded bg-zinc-950 border border-zinc-900">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-zinc-300 truncate">{item.query}</p>
                            <p className="text-[8px] text-zinc-700">{item.engine} · {item.timestamp}</p>
                          </div>
                          <button onClick={() => { handleGo(item.query); setModal(null); }} className="text-[9px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-white rounded font-mono hover:bg-zinc-800 shrink-0 ml-2">
                            Go
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI History */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono text-zinc-400">AI History ({aiHistory.length})</label>
                    {aiHistory.length > 0 && (
                      <button onClick={() => { setAiHistory([]); localStorage.removeItem('xena_ai_history'); }} className="text-[8px] font-mono uppercase bg-zinc-950 px-1.5 py-0.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded">
                        Clear
                      </button>
                    )}
                  </div>
                  {aiHistory.length === 0 ? (
                    <p className="text-[10px] text-zinc-700">No AI conversations yet.</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {aiHistory.slice(0, 15).map((item, i) => (
                        <div key={i} className="p-1.5 rounded bg-zinc-950 border border-zinc-900">
                          <div className="flex items-center gap-1 text-[8px] text-zinc-600 font-mono mb-0.5">
                            <span className={item.mode === 'serious' ? 'text-indigo-500' : 'text-orange-500'}>{item.mode}</span>
                            <span>· {item.timestamp}</span>
                          </div>
                          <p className="text-[9px] text-zinc-400 truncate">Q: {item.message}</p>
                          <p className="text-[9px] text-zinc-600 truncate">A: {item.response}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password Modal for Dev/Admin */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold font-mono mb-4 text-white">
              {pendingScreen === 'dev' ? 'Developer Access' : 'Admin Access'}
            </h3>
            <input value={passwordInput} onChange={e => setPasswordInput(e.target.value.toUpperCase())} placeholder="Enter code..." maxLength={5}
              className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-sm font-mono text-white outline-none focus:border-zinc-500 uppercase tracking-widest mb-3"
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()} />
            <button onClick={handlePasswordSubmit}
              className="w-full h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold font-mono">
              Unlock
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== DEV CONSOLE ====================
function DevConsole() {
  const [tab, setTab] = useState<'dashboard' | 'ai' | 'bugs'>('dashboard');
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiMode, setAiMode] = useState<'serious' | 'chill'>('serious');
  const [aiLoading, setAiLoading] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugPage, setBugPage] = useState('');
  const [bugSteps, setBugSteps] = useState('');
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [showLogout, setShowLogout] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/status').then(r => r.json()).then(setStatus).catch(() => {});
    fetch('/api/admin/announcements').then(r => r.json()).then(d => setAnnouncements(d.announcements || [])).catch(() => {});
  }, []);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [aiMessages]);

  async function sendAiMessage() {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: msg }]);
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...aiMessages, { role: 'user', content: msg }], mode: aiMode, provider: 'gemini' })
      });
      const data = await res.json();
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response.' }]);
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Error contacting AI.' }]);
    }
    setAiLoading(false);
  }

  function submitBug() {
    if (!bugTitle.trim()) return;
    const newBug: BugReport = {
      id: Date.now(),
      title: bugTitle,
      description: bugDesc,
      page: bugPage,
      steps: bugSteps,
      important: false,
      time: new Date().toISOString()
    };
    setBugs(prev => [newBug, ...prev]);
    setBugTitle(''); setBugDesc(''); setBugPage(''); setBugSteps('');
  }

  function toggleBugImportance(id: number) {
    setBugs(prev => prev.map(b => b.id === id ? { ...b, important: !b.important } : b));
  }

  function deleteBug(id: number) {
    setBugs(prev => prev.filter(b => b.id !== id));
  }

  function handleLogout() {
    localStorage.removeItem('xena_dev_unlocked');
    localStorage.removeItem('xena_admin_unlocked');
    window.location.href = '/';
  }

  const greeting = getTimeGreeting();
  const h = new Date().getHours();
  const isNight = h >= 19 || h < 6;

  return (
    <div className="h-screen w-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #060a18 0%, #0a1030 50%, #060a18 100%)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2C8.5 2 6 3.5 6 8C6 12 4 14 4 14H16C16 14 14 12 14 8C14 3.5 11.5 2 10 2Z" fill="currentColor" opacity="0.3"/>
              <path d="M10 17C11.5 17 13 15.5 13 14H7C7 15.5 8.5 17 10 17Z" fill="currentColor" opacity="0.5"/>
              <circle cx="10" cy="8" r="3.5" fill="currentColor" opacity="0.8"/>
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-white/90 font-display tracking-wide">
            {greeting}{isNight ? " 🌙" : ""}, <span className="text-white/50">G</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/20">{new Date().toLocaleDateString()}</span>
          <button onClick={() => setShowLogout(!showLogout)} className="text-[10px] px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 font-mono transition-all">
            Logout
          </button>
          {showLogout && (
            <div className="absolute top-14 right-5 bg-[#0a1030] border border-white/10 rounded-lg p-3 shadow-2xl z-50">
              <p className="text-[10px] text-white/50 mb-2 font-mono">Sure?</p>
              <button onClick={handleLogout} className="text-[10px] px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 font-mono w-full transition-all">
                Yes, logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 py-2 border-b border-white/5">
        {[
          { id: 'dashboard' as const, label: 'Dashboard', icon: '◇' },
          { id: 'ai' as const, label: 'AI Chat', icon: '◆' },
          { id: 'bugs' as const, label: 'Bug Reports', icon: '◈' }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded text-[10px] font-mono tracking-wider transition-all ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'dashboard' && (
          <div className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1">Status</p>
                <p className="text-sm font-semibold text-emerald-400">{status?.status || 'unknown'}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1">Uptime</p>
                <p className="text-sm font-semibold text-white/80">{status ? `${Math.floor(status.uptime / 60)}m` : '...'}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-1">Version</p>
                <p className="text-sm font-semibold text-white/80">{status?.version || '...'}</p>
              </div>
            </div>
            {announcements.length > 0 && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">Announcements</p>
                {announcements.map((a: any, i) => (
                  <p key={i} className="text-xs text-white/60 mb-1">• {a.message}</p>
                ))}
              </div>
            )}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2">Quick Links</p>
              <div className="flex gap-2">
                <button onClick={() => window.location.href = '/'} className="text-[10px] px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 font-mono">← Back to Browser</button>
                <button onClick={() => window.location.href = '/admin-console'} className="text-[10px] px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 font-mono">Admin Console</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div className="flex flex-col h-full max-w-3xl mx-auto">
            <div ref={chatRef} className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[60vh] pr-2">
              {aiMessages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-white/20 font-display">AI Chat</p>
                  <p className="text-[10px] text-white/10 font-mono mt-1">{aiMode === 'serious' ? 'Serious mode' : 'Chill mode'} · Powered by Gemini</p>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-xs ${msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-white/[0.03] border border-white/[0.06] text-white/80'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && <div className="text-[10px] text-white/30 font-mono animate-pulse">Thinking...</div>}
            </div>
            <div className="flex gap-2">
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendAiMessage()} placeholder="Type a message..." className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white outline-none focus:border-white/20 placeholder-white/20" />
              <button onClick={() => setAiMode(aiMode === 'serious' ? 'chill' : 'serious')} className={`px-3 rounded-lg text-[10px] font-mono border ${aiMode === 'serious' ? 'border-indigo-500/30 text-indigo-400' : 'border-orange-500/30 text-orange-400'}`}>
                {aiMode === 'serious' ? 'SRS' : 'CHILL'}
              </button>
              <button onClick={sendAiMessage} disabled={aiLoading} className="px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono disabled:opacity-50">
                Send
              </button>
            </div>
          </div>
        )}

        {tab === 'bugs' && (
          <div className="max-w-3xl space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-3">Submit Bug Report</p>
              <div className="space-y-2">
                <input value={bugTitle} onChange={e => setBugTitle(e.target.value)} placeholder="Title" className="w-full h-8 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white outline-none focus:border-white/20 placeholder-white/20" />
                <input value={bugDesc} onChange={e => setBugDesc(e.target.value)} placeholder="Description" className="w-full h-8 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white outline-none focus:border-white/20 placeholder-white/20" />
                <input value={bugPage} onChange={e => setBugPage(e.target.value)} placeholder="Page where it happened" className="w-full h-8 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white outline-none focus:border-white/20 placeholder-white/20" />
                <input value={bugSteps} onChange={e => setBugSteps(e.target.value)} placeholder="Steps to reproduce" className="w-full h-8 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white outline-none focus:border-white/20 placeholder-white/20" />
                <button onClick={submitBug} className="px-4 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono">Submit</button>
              </div>
            </div>
            {bugs.length === 0 ? (
              <p className="text-xs text-white/20 text-center py-8 font-mono">No bug reports yet.</p>
            ) : (
              bugs.map(bug => (
                <div key={bug.id} className={`p-3 rounded-xl border ${bug.important ? 'border-yellow-500/30 bg-yellow-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-white/80 font-medium">{bug.title}</p>
                        <span className="text-[8px] font-mono text-white/20">{new Date(bug.time).toLocaleDateString()}</span>
                      </div>
                      {bug.description && <p className="text-[10px] text-white/50 mt-1">{bug.description}</p>}
                      {bug.page && <p className="text-[9px] text-white/30 font-mono mt-1">Page: {bug.page}</p>}
                      {bug.steps && <p className="text-[9px] text-white/30 font-mono mt-0.5">Steps: {bug.steps}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => toggleBugImportance(bug.id)} className={`p-1 rounded text-[10px] ${bug.important ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400'}`}>
                        {bug.important ? '★' : '☆'}
                      </button>
                      <button onClick={() => deleteBug(bug.id)} className="p-1 rounded text-white/20 hover:text-red-400 text-[10px]">✕</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== ADMIN CONSOLE ====================
function AdminConsole() {
  const [status, setStatus] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announceInput, setAnnounceInput] = useState('');
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    fetch('/api/admin/status').then(r => r.json()).then(setStatus).catch(() => {});
    fetch('/api/admin/announcements').then(r => r.json()).then(d => setAnnouncements(d.announcements || [])).catch(() => {});
  }, []);

  function postAnnouncement() {
    if (!announceInput.trim()) return;
    fetch('/api/admin/announcement', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: announceInput })
    }).then(r => r.json()).then(d => {
      setAnnouncements(d.announcements || []);
      setAnnounceInput('');
    }).catch(() => {});
  }

  function restartGateway() {
    fetch('/api/admin/restart-gateway', { method: 'POST' })
      .then(() => { setStatus((s: any) => ({ ...s, status: 'restarting' })); setTimeout(() => fetch('/api/admin/status').then(r => r.json()).then(setStatus), 3000); })
      .catch(() => {});
  }

  function handleLogout() {
    localStorage.removeItem('xena_dev_unlocked');
    localStorage.removeItem('xena_admin_unlocked');
    window.location.href = '/';
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-white">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
        <h1 className="text-sm font-bold font-mono tracking-wider text-white/90">ADMIN CONSOLE</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-600">{new Date().toLocaleDateString()}</span>
          <button onClick={() => setShowLogout(!showLogout)} className="text-[10px] px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-mono">Logout</button>
          {showLogout && (
            <div className="absolute top-14 right-5 bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-2xl z-50">
              <p className="text-[10px] text-zinc-500 mb-2 font-mono">Sure?</p>
              <button onClick={handleLogout} className="text-[10px] px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 font-mono w-full">Yes, logout</button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl space-y-4">
          {/* Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Gateway</p>
              <p className={`text-sm font-semibold ${status?.status === 'running' ? 'text-emerald-400' : 'text-yellow-400'}`}>{status?.status || '...'}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Uptime</p>
              <p className="text-sm font-semibold text-zinc-300">{status ? `${Math.floor(status.uptime / 60)}m ${status.uptime % 60}s` : '...'}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Memory</p>
              <p className="text-sm font-semibold text-zinc-300">{status ? `${Math.round(status.memoryUsage / 1024 / 1024)}MB` : '...'}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Gateway Controls</p>
            <div className="flex gap-2">
              <button onClick={restartGateway} className="px-4 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono">Restart Gateway</button>
              <button onClick={() => window.location.href = '/'} className="px-4 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono">← Back</button>
              <button onClick={() => window.location.href = '/dev-console'} className="px-4 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono">Dev Console</button>
            </div>
          </div>

          {/* Announcements */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Announcements</p>
            <div className="flex gap-2 mb-3">
              <input value={announceInput} onChange={e => setAnnounceInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && postAnnouncement()} placeholder="New announcement..." className="flex-1 h-8 rounded-lg bg-black border border-zinc-800 px-3 text-xs text-white outline-none focus:border-zinc-600 placeholder-zinc-600" />
              <button onClick={postAnnouncement} className="px-4 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono">Post</button>
            </div>
            {announcements.length === 0 ? (
              <p className="text-[10px] text-zinc-700 font-mono">No announcements.</p>
            ) : (
              announcements.map((a: any, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-black/50 mb-1">
                  <p className="text-[10px] text-zinc-400 flex-1">{a.message}</p>
                  <span className="text-[8px] text-zinc-700 font-mono">{new Date(a.time).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== TIKTOK CLONE ====================
function TikTokClone() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    fetch('/api/tiktok/trending')
      .then(r => r.json())
      .then(data => {
        if (data.videos && data.videos.length > 0) setVideos(data.videos);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const current = videos[currentIndex];

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Mobile frame */}
      <div className="relative w-full max-w-[400px] h-full max-h-[700px] bg-black overflow-hidden">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
          <button onClick={() => window.location.href = '/'} className="text-white/80 text-sm">✕</button>
          <div className="flex items-center gap-1">
            <span className="text-white text-xs font-semibold">Following</span>
            <span className="text-white/50 text-xs mx-2">|</span>
            <span className="text-white text-xs font-semibold">For You</span>
          </div>
          <div className="w-6" />
        </div>

        {/* Video area */}
        <div className="h-full w-full flex items-center justify-center bg-zinc-950">
          {loading ? (
            <div className="text-white/30 text-xs font-mono animate-pulse">Loading...</div>
          ) : current ? (
            <div className="relative h-full w-full flex flex-col items-center justify-center">
              {/* Video placeholder */}
              <div className="h-full w-full flex items-center justify-center bg-zinc-900 relative">
                <div className="text-center">
                  <div className="text-5xl mb-2 text-white/10">▶</div>
                  <p className="text-white/40 text-xs font-mono">{current.desc || current.title || 'No description'}</p>
                  <p className="text-white/20 text-[10px] font-mono mt-1">@{current.author || 'unknown'}</p>
                </div>
              </div>

              {/* Side controls */}
              <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-10">
                <button className="flex flex-col items-center gap-1">
                  <Heart size={28} className="text-white" />
                  <span className="text-[10px] text-white font-mono">{current.likes || '0'}</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <MessageCircle size={28} className="text-white" />
                  <span className="text-[10px] text-white font-mono">{current.comments || '0'}</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <Share2 size={28} className="text-white" />
                  <span className="text-[10px] text-white font-mono">Share</span>
                </button>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-16 left-4 right-16 z-10">
                <p className="text-white text-sm font-bold mb-1">@{current.author || 'user'}</p>
                <p className="text-white/80 text-xs">{current.desc || current.title || ''}</p>
              </div>

              {/* Sound button */}
              <button onClick={() => setMuted(!muted)} className="absolute bottom-4 right-4 z-10 text-white/60">
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              {/* Nav buttons */}
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 flex justify-between z-10 pointer-events-none">
                <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="pointer-events-auto p-2 bg-black/30 rounded-full text-white/60 hover:text-white disabled:opacity-20">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setCurrentIndex(i => Math.min(videos.length - 1, i + 1))} disabled={currentIndex === videos.length - 1} className="pointer-events-auto p-2 bg-black/30 rounded-full text-white/60 hover:text-white disabled:opacity-20">
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Index indicator */}
              <div className="absolute top-14 left-0 right-0 flex justify-center gap-1 z-10">
                {videos.slice(0, Math.min(videos.length, 10)).map((_, i) => (
                  <div key={i} className={`w-1 h-1 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-white/30">
              <p className="text-xs font-mono">No videos available</p>
              <button onClick={() => window.location.href = '/'} className="text-[10px] mt-4 px-3 py-1.5 rounded bg-white/10 text-white/60 font-mono">Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
