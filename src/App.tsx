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
  ddg2: { name: 'DuckDuckGo HTML (No JS)', url: 'https://html.duckduckgo.com/html/?q=', note: 'Lightweight HTML version, works in proxies' },
  ddg3: { name: 'DuckDuckGo Lite', url: 'https://lite.duckduckgo.com/lite/?q=', note: 'Minimal version, best for proxied iframes' },
  ddg4: { name: 'Startpage (DDG alt)', url: 'https://www.startpage.com/sp/search?query=', note: 'Privacy-focused alternative' },
  ddg5: { name: 'Bing Fallback', url: 'https://www.bing.com/search?q=', note: 'Last resort fallback' }
};

// ==================== FUN FACTS ====================
const FUN_FACTS = [
  'The first computer virus was created in 1983',
  'Not a fun fact but no ads. Ever!',
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
  'The hashtag symbol is officially called an octothorpe',
'The first domain name ever registered was Symbolics.com',
'The original name for Windows was Interface Manager',
'NASA is still using some technology from the 1970s on spacecraft',
'The 404 error code was named after a room number at CERN where the web was born',
'The first alarm clock could only ring at one time: 4 a.m.',
'The world’s first digital clock was invented in 1956',
'The total weight of all the electricity running the internet is about 50 grams',
'The first mobile phone call was made in New York City in 1973',
'The original PlayStation was meant to be a Nintendo console plugin',
'Amazon was almost named Cadabra, as in Abracadabra',
'The first item ever scanned with a barcode was a pack of Wrigley’s Juicy Fruit gum',
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
'Wi-Fi doesn’t actually stand for Wireless Fidelity; it’s a made-up marketing term',
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
'The world’s first programmable computer was the Z1, built in 1936',
'The first music video played on MTV was Video Killed the Radio Star by The Buggles',
'The original name for Yahoo! was Jerry and David's Guide to the World Wide Web',
'A petabyte is enough data to store 3.4 years of 24/7 4K video',
'The save icon used in most software is a 3.5-inch floppy disk, which holds 1.44MB',
'The first video game ever created was called Tennis for Two in 1958',
'The spacebar is the most used key on a standard computer keyboard',
'Netflix was founded in 1997, originally operating as a DVD-by-mail service',
'The first laser was built in 1960 using a synthetic ruby crystal',
'Im fun fact number 56',
'The original URL for Google was google.stanford.edu',
'The world’s first webcam image was a 128x128 grayscale picture of a coffee pot',
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
'The world’s most expensive domain name, Voice.com, sold for $30 million in 2019',
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
'The world’s first smartphone had a touchscreen, calendar, and fax capability',
'The original mascot for Linux is a penguin named Tux',
'The first Apple computer went on sale for the specific price of $666.66',
'The first commercial cellular network was launched in Japan by NTT in 1979',
'The word algorithm originates from the name of a 9th-century Persian mathematician',
'The first solid-state drive for consumer PCs was introduced in the early 1991',
'Im fun fact number 100'
];

export default function App() {
  // === STATE ===
  const [url, setUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [proxyMode, setProxyMode] = useState(() => localStorage.getItem('xena_proxy_mode') || 'rv');
  const [ddgMode, setDdgMode] = useState(() => localStorage.getItem('xena_ddg_mode') || 'ddg3');
  const [searchHistory, setSearchHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('xena_search_history') || '[]'); } catch { return []; }
  });
  const [bookmarks, setBookmarks] = useState<{ name: string; url: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('xena_bookmarks') || '[]'); } catch { return []; }
  });
  const [time, setTime] = useState('');
  const [ping, setPing] = useState(0);
  const [funFact, setFunFact] = useState(FUN_FACTS[0]);
  const [funFactIdx, setFunFactIdx] = useState(0);
  const [modal, setModal] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<'general' | 'history'>('general');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'serious' | 'chill'>('serious');
  const [aiMsgs, setAiMsgs] = useState<{ role: string; text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoad, setAiLoad] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tiktokVideos, setTiktokVideos] = useState<any[]>([]);
  const [tiktokLoad, setTiktokLoad] = useState(false);
  const [cloakOn, setCloakOn] = useState(() => localStorage.getItem('xena_cloak') === 'on');
  const [escKey, setEscKey] = useState(() => localStorage.getItem('xena_escape_key') || 'Escape');
  const [escUrl, setEscUrl] = useState(() => localStorage.getItem('xena_escape_url') || 'https://classroom.google.com');
  const [showAddShortcut, setShowAddShortcut] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState('');
  const [newShortcutUrl, setNewShortcutUrl] = useState('');
  const [aiHistory, setAiHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('xena_ai_history') || '[]'); } catch { return []; }
  });
  const [screen, setScreen] = useState<'browser' | 'dev' | 'admin'>('browser');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingScreen, setPendingScreen] = useState<'dev' | 'admin' | null>(null);
  const [bugReports, setBugReports] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('xena_bug_reports') || '[]'); } catch { return []; }
  });
  const [reportForm, setReportForm] = useState({ kind: 'bug', title: '', url: '', details: '' });
  const [ddgSettingsOpen, setDdgSettingsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [adminMsg, setAdminMsg] = useState('');
  const [adminStatus, setAdminStatus] = useState<any>(null);
  const [tiktokMuted, setTiktokMuted] = useState(true);
  const [tiktokPlaying, setTiktokPlaying] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // === EFFECTS ===
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const ti = setInterval(updateTime, 10000);
    return () => clearInterval(ti);
  }, []);

  useEffect(() => {
    const pi = setInterval(() => setPing(Math.floor(Math.random() * 30) + 5), 5000);
    return () => clearInterval(pi);
  }, []);

  useEffect(() => {
    const fi = setInterval(() => {
      setFunFactIdx(i => {
        const next = (i + 1) % FUN_FACTS.length;
        setFunFact(FUN_FACTS[next]);
        return next;
      });
    }, 12000);
    return () => clearInterval(fi);
  }, []);

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMsgs]);

  useEffect(() => {
    if (cloakOn) {
      document.title = 'Google Classroom';
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (link) link.href = 'https://ssl.gstatic.com/classroom/favicon.png';
    } else {
      document.title = 'XENA Browser';
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (link) link.href = '/vite.svg';
    }
  }, [cloakOn]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === escKey && escUrl) {
        window.location.href = escUrl;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [escKey, escUrl]);

  // === HANDLERS ===
  function getProxyUrl(target: string): string {
    const encoded = b64e(target);
    return `/${proxyMode}/${encoded}`;
  }

  function go(query: string) {
    if (!query.trim()) return;
    setIsLoading(true);
    setError('');

    // Check if it's a URL
    let finalUrl = query.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        // It's a search query
        const ddg = DDG_OPTIONS[ddgMode] || DDG_OPTIONS.ddg3;
        const encodedQuery = encodeURIComponent(finalUrl);
        const proxyUrl = ddg.url + encodedQuery;
        setCurrentUrl(proxyUrl);
        // Save history
        const entry = { query: finalUrl, engine: ddg.name, timestamp: new Date().toLocaleString(), url: proxyUrl };
        const newHistory = [entry, ...searchHistory.slice(0, 99)];
        setSearchHistory(newHistory);
        localStorage.setItem('xena_search_history', JSON.stringify(newHistory));
        setUrl(finalUrl);
        setIsLoading(false);
        return;
      }
    }

    const proxyUrl = getProxyUrl(finalUrl);
    setCurrentUrl(finalUrl);
    // Save history
    const entry = { query: finalUrl, engine: 'Direct URL', timestamp: new Date().toLocaleString(), url: finalUrl };
    const newHistory = [entry, ...searchHistory.slice(0, 99)];
    setSearchHistory(newHistory);
    localStorage.setItem('xena_search_history', JSON.stringify(newHistory));
    setUrl(finalUrl);
    setIsLoading(false);
  }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    go(url);
  }

  function goBack() {
    const iframe = iframeRef.current;
    try { if (iframe?.contentWindow?.history?.length) iframe.contentWindow.history.back(); } catch {}
  }
  function goForward() {
    const iframe = iframeRef.current;
    try { if (iframe?.contentWindow?.history?.length) iframe.contentWindow.history.forward(); } catch {}
  }
  function refresh() {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.src = iframe.src;
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 1000);
    }
  }

  async function checkAccessCode(code: string) {
    try {
      const resp = await fetch('/api/auth/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await resp.json();
      if (data.valid) {
        setUserRole(data.role);
        if (data.role === 'developer') { setDevUnlocked(true); localStorage.setItem('xena_dev_code', code); }
        if (data.role === 'admin') { setAdminUnlocked(true); localStorage.setItem('xena_admin_code', code); }
        setShowPasswordModal(false);
        return true;
      }
      return false;
    } catch { return false; }
  }

  async function openConsole(type: 'dev' | 'admin') {
    if (type === 'dev' && devUnlocked) { setScreen('dev'); return; }
    if (type === 'admin' && adminUnlocked) { setScreen('admin'); return; }
    setPendingScreen(type);
    setPasswordInput('');
    setShowPasswordModal(true);
  }

  async function handlePasswordSubmit() {
    const success = await checkAccessCode(passwordInput);
    if (success && pendingScreen) {
      setScreen(pendingScreen);
    }
  }

  async function sendAiMsg() {
    if (!aiInput.trim() || aiLoad) return;
    const msg = aiInput.trim();
    setAiInput('');
    setAiMsgs(prev => [...prev, { role: 'user', text: msg }]);
    setAiLoad(true);

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...aiMsgs.map(m => ({ role: m.role, content: m.text })), { role: 'user', content: msg }], mode: aiMode })
      });
      const data = await resp.json();
      if (data.response) {
        setAiMsgs(prev => [...prev, { role: 'assistant', text: data.response }]);
        const entry = { mode: aiMode, message: msg, response: data.response.slice(0, 100), timestamp: new Date().toLocaleString() };
        const newHistory = [entry, ...aiHistory.slice(0, 49)];
        setAiHistory(newHistory);
        localStorage.setItem('xena_ai_history', JSON.stringify(newHistory));
      } else {
        setAiMsgs(prev => [...prev, { role: 'assistant', text: 'Error: ' + (data.error || 'No response') }]);
      }
    } catch (err: any) {
      setAiMsgs(prev => [...prev, { role: 'assistant', text: 'Network error: ' + err.message }]);
    }
    setAiLoad(false);
  }

  async function loadTikTok() {
    setTiktokLoad(true);
    try {
      const resp = await fetch('/api/tiktok/trending?count=20');
      const data = await resp.json();
      if (data.videos && data.videos.length > 0) {
        setTiktokVideos(data.videos);
      }
    } catch { setTiktokVideos([]); }
    setTiktokLoad(false);
  }

  useEffect(() => { loadTikTok(); }, []);

  function addBookmark() {
    if (!currentUrl) return;
    const name = prompt('Bookmark name:') || currentUrl;
    const newBookmarks = [...bookmarks, { name, url: currentUrl }];
    setBookmarks(newBookmarks);
    localStorage.setItem('xena_bookmarks', JSON.stringify(newBookmarks));
  }

  function removeBookmark(idx: number) {
    const newBookmarks = bookmarks.filter((_, i) => i !== idx);
    setBookmarks(newBookmarks);
    localStorage.setItem('xena_bookmarks', JSON.stringify(newBookmarks));
  }

  function addShortcut() {
    if (!newShortcutName.trim() || !newShortcutUrl.trim()) return;
    const newBookmarks = [...bookmarks, { name: newShortcutName.trim(), url: newShortcutUrl.trim() }];
    setBookmarks(newBookmarks);
    localStorage.setItem('xena_bookmarks', JSON.stringify(newBookmarks));
    setNewShortcutName('');
    setNewShortcutUrl('');
    setShowAddShortcut(false);
  }

  function submitReport() {
    if (!reportForm.title.trim()) return;
    const report = { ...reportForm, id: Date.now(), time: new Date().toISOString() };
    const newReports = [report, ...bugReports];
    setBugReports(newReports);
    localStorage.setItem('xena_bug_reports', JSON.stringify(newReports));
    setReportForm({ kind: 'bug', title: '', url: '', details: '' });
    setModal(null);
  }

  function logout() {
    setDevUnlocked(false);
    setAdminUnlocked(false);
    setUserRole(null);
    setScreen('browser');
    localStorage.removeItem('xena_dev_code');
    localStorage.removeItem('xena_admin_code');
  }

  const activeMode = PROXY_MODES.find(m => m.id === proxyMode) || PROXY_MODES[0];

  // ==================== RENDER ====================

  // === DEV CONSOLE ===
  if (screen === 'dev') {
    return (
      <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {/* Moon + Greeting */}
        <div className="relative px-6 pt-8 pb-4" style={{ background: 'linear-gradient(180deg, #0a0e27 0%, #000000 100%)' }}>
          <div className="flex items-center gap-4 mb-6">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#4a6cf7" strokeWidth="1.5">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Good evening G</h1>
              <p className="text-[10px] text-blue-400/60 tracking-widest uppercase">Developer Console</p>
            </div>
            <button onClick={logout} className="ml-auto px-3 py-1.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] hover:bg-blue-600/30">Logout</button>
          </div>
        </div>

        {/* Dev Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30">
              <p className="text-[9px] text-blue-400/60 uppercase tracking-wider">System Status</p>
              <p className="text-green-400 text-sm mt-1">● Proxy Server ONLINE</p>
              <p className="text-zinc-400 text-[10px] mt-0.5">Uptime: -- · Active Users: --</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30">
              <p className="text-[9px] text-blue-400/60 uppercase tracking-wider">Version</p>
              <p className="text-white text-sm mt-1 font-bold">v3.0.0</p>
              <p className="text-zinc-400 text-[10px] mt-0.5">Node {navigator.userAgent.includes('Chrome') ? '22' : '--'}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-900/30">
            <p className="text-[9px] text-blue-400/60 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setScreen('browser')} className="px-3 py-1.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] hover:bg-blue-600/30">Open XENA</button>
              <button onClick={() => setAiOpen(true)} className="px-3 py-1.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] hover:bg-blue-600/30">AI Chat</button>
              <button onClick={() => { localStorage.removeItem('xena_cache'); refresh(); }} className="px-3 py-1.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] hover:bg-blue-600/30">Clear Cache</button>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-900/30">
            <p className="text-[9px] text-blue-400/60 uppercase tracking-wider mb-3">Bug Reports ({bugReports.length})</p>
            <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
              {bugReports.length === 0 ? <p className="text-zinc-500 text-[10px]">No reports</p> : 
                bugReports.slice(0, 10).map(r => (
                  <div key={r.id} className="p-2 rounded bg-black/40 border border-zinc-800 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${r.kind === 'bug' ? 'bg-red-500/10 text-red-400' : 'bg-cyan-500/10 text-cyan-400'}`}>{r.kind}</span>
                    <span className="text-zinc-300 ml-1">{r.title}</span>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-900/30">
            <p className="text-[9px] text-blue-400/60 uppercase tracking-wider mb-3">HackerAI.co Self-Repair Engine</p>
            <p className="text-zinc-400 text-[10px] mb-3">Dynamic proxy core evaluation & rewrite script adjustment</p>
            <button onClick={refresh} className="px-4 py-2 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] hover:bg-blue-600/30">⟳ RUN AUTO-FIX</button>
          </div>
        </div>
      </div>
    );
  }

  // === ADMIN CONSOLE ===
  if (screen === 'admin') {
    return (
      <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <div className="relative px-6 pt-8 pb-4" style={{ background: 'linear-gradient(180deg, #1a0a0a 0%, #000000 100%)' }}>
          <div className="flex items-center gap-4 mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <div>
              <h1 className="text-xl font-bold text-amber-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Sup G</h1>
              <p className="text-[10px] text-amber-500/60 tracking-widest uppercase">Administrator Panel</p>
            </div>
            <button onClick={logout} className="ml-auto px-3 py-1.5 rounded bg-amber-600/20 border border-amber-500/30 text-amber-400 text-[10px] hover:bg-amber-600/30">Logout</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
          {/* Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/30">
              <p className="text-[9px] text-amber-400/60 uppercase">Gateway</p>
              <p className="text-green-400 text-sm mt-1">● Running</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/30">
              <p className="text-[9px] text-amber-400/60 uppercase">Version</p>
              <p className="text-white text-sm mt-1 font-bold">v3.0.0</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/30">
              <p className="text-[9px] text-amber-400/60 uppercase">Reports</p>
              <p className="text-amber-400 text-sm mt-1 font-bold">{bugReports.length}</p>
            </div>
          </div>

          {/* Send Announcement */}
          <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/30">
            <p className="text-[9px] text-amber-400/60 uppercase tracking-wider mb-2">Send Announcement</p>
            <div className="flex gap-2">
              <input value={adminMsg} onChange={e => setAdminMsg(e.target.value)} placeholder="Type announcement..." 
                className="flex-1 h-8 rounded bg-black/60 border border-amber-800/50 px-3 text-xs text-white outline-none focus:border-amber-500" />
              <button onClick={async () => {
                if (!adminMsg.trim()) return;
                const code = localStorage.getItem('xena_admin_code');
                await fetch('/api/admin/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': code || '' }, body: JSON.stringify({ message: adminMsg }) });
                setAdminMsg('');
              }} className="px-3 rounded bg-amber-600/20 border border-amber-500/30 text-amber-400 text-[10px]">Send</button>
            </div>
          </div>

          {/* Bug Reports */}
          <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/30">
            <p className="text-[9px] text-amber-400/60 uppercase tracking-wider mb-2">Bug Reports ({bugReports.length})</p>
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {bugReports.length === 0 ? <p className="text-zinc-500 text-[10px]">No reports</p> :
                bugReports.map(r => (
                  <div key={r.id} className="p-2 rounded bg-black/40 border border-zinc-800 text-[10px] flex items-start gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 mt-0.5 ${r.kind === 'bug' ? 'bg-red-500/10 text-red-400' : 'bg-cyan-500/10 text-cyan-400'}`}>{r.kind}</span>
                    <div>
                      <p className="text-zinc-200 font-semibold">{r.title}</p>
                      {r.url && <p className="text-zinc-500 truncate max-w-[300px]">{r.url}</p>}
                      {r.details && <p className="text-zinc-400 mt-0.5">{r.details}</p>}
                    </div>
                    <button onClick={() => {
                      const nb = bugReports.filter((_, i) => _ !== r);
                      setBugReports(nb);
                      localStorage.setItem('xena_bug_reports', JSON.stringify(nb));
                    }} className="ml-auto text-zinc-600 hover:text-amber-400"><Trash2 size={12} /></button>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Restart Gateway */}
          <button onClick={async () => {
            const code = localStorage.getItem('xena_admin_code');
            await fetch('/api/admin/restart-gateway', { method: 'POST', headers: { 'x-access-code': code || '' } });
          }} className="w-full p-3 rounded-lg bg-red-900/10 border border-red-800/30 text-red-400 text-[10px] hover:bg-red-900/20">
            ⚠ RESTART GATEWAY
          </button>
        </div>
      </div>
    );
  }

  // ==================== MAIN BROWSER ====================
  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-11 bg-black border-b border-zinc-900 flex items-center px-2 gap-1.5 shrink-0 z-30">
        <button onClick={goBack} className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-500 hover:text-white"><ArrowLeft size={14} /></button>
        <button onClick={goForward} className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-500 hover:text-white"><ArrowRight size={14} /></button>
        <button onClick={refresh} className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-500 hover:text-white"><RotateCw size={13} className={isLoading ? 'animate-spin' : ''} /></button>

        <div className="flex-1 flex items-center gap-1.5 bg-zinc-950 border border-zinc-900 rounded-lg px-3 h-8 mx-1">
          {proxyMode === 'rv' && <Shield size={10} className="text-emerald-500 shrink-0" />}
          {proxyMode === 'sw' && <Cpu size={10} className="text-blue-500 shrink-0" />}
          {proxyMode === 'bss' && <Activity size={10} className="text-purple-500 shrink-0" />}
          {proxyMode === 'xt' && <Sparkles size={10} className="text-orange-500 shrink-0" />}
          <form onSubmit={handleUrlSubmit} className="flex-1">
            <input ref={urlInputRef} value={url} onChange={e => setUrl(e.target.value)} placeholder={funFact}
              className="w-full bg-transparent text-xs text-zinc-300 outline-none placeholder-zinc-700 truncate" />
          </form>
        </div>

        <button onClick={() => setAiOpen(!aiOpen)} className={`w-7 h-7 flex items-center justify-center rounded ${aiOpen ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-zinc-900 text-zinc-500 hover:text-white'}`}>
          <Sparkles size={13} />
        </button>
        <button onClick={() => setModal('settings')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-500 hover:text-white">
          <Settings size={13} />
        </button>

        {/* Tiny + for shortcuts */}
        <div className="flex items-center gap-0.5">
          {bookmarks.slice(0, 2).map((b, i) => (
            <button key={i} onClick={() => go(b.url)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-500 hover:text-white text-[9px] font-mono truncate max-w-[28px]">
              {b.name.charAt(0).toUpperCase()}
            </button>
          ))}
          {showAddShortcut ? (
            <div className="absolute top-12 right-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 z-40 w-64">
              <p className="text-[10px] font-mono text-zinc-400 mb-2">Add Shortcut</p>
              <input value={newShortcutName} onChange={e => setNewShortcutName(e.target.value)} placeholder="Name" className="w-full h-7 rounded bg-black border border-zinc-800 px-2 text-xs mb-1 outline-none" />
              <input value={newShortcutUrl} onChange={e => setNewShortcutUrl(e.target.value)} placeholder="URL" className="w-full h-7 rounded bg-black border border-zinc-800 px-2 text-xs mb-2 outline-none" />
              <div className="flex gap-1">
                <button onClick={addShortcut} className="flex-1 h-7 rounded bg-zinc-800 text-white text-[10px] hover:bg-zinc-700">Save</button>
                <button onClick={() => setShowAddShortcut(false)} className="h-7 px-2 rounded bg-zinc-900 text-zinc-500 text-[10px]">X</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddShortcut(true)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-600 hover:text-white">
              <Plus size={13} />
            </button>
          )}
        </div>

        {devUnlocked && <button onClick={() => openConsole('dev')} className="px-1.5 py-0.5 rounded bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[8px] font-mono">DEV</button>}
        {adminUnlocked && <button onClick={() => openConsole('admin')} className="px-1.5 py-0.5 rounded bg-amber-600/20 border border-amber-500/30 text-amber-400 text-[8px] font-mono">ADMIN</button>}

        <span className="text-[9px] text-zinc-700 font-mono">{time}</span>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Iframe - full width */}
        <iframe ref={iframeRef} src={currentUrl ? getProxyUrl(currentUrl) : undefined}
          className="flex-1 bg-white border-0" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />

        {/* If no URL loaded, show landing */}
        {!currentUrl && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <h1 className="text-5xl font-bold tracking-tighter text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                XENA
                <svg className="absolute -top-2 -right-6 w-8 h-8 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M3 3l18 18M21 3L3 21" />
                </svg>
              </h1>
              <p className="text-[10px] text-zinc-600 tracking-[0.3em] uppercase mt-1 text-center font-mono">Neural Engine Emulator</p>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-600 font-mono">{activeMode.badge} · {ping}ms</span>
            </div>
            <div className="w-full max-w-xl px-4">
              <form onSubmit={handleUrlSubmit} className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 rounded-xl px-4 h-12">
                {proxyMode === 'rv' && <Shield size={14} className="text-emerald-500 shrink-0" />}
                {proxyMode === 'sw' && <Cpu size={14} className="text-blue-500 shrink-0" />}
                {proxyMode === 'bss' && <Activity size={14} className="text-purple-500 shrink-0" />}
                {proxyMode === 'xt' && <Sparkles size={14} className="text-orange-500 shrink-0" />}
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder={funFact}
                  className="flex-1 bg-transparent text-sm text-zinc-300 outline-none placeholder-zinc-700 font-mono" />
                <button type="submit" className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800">
                  <Search size={14} className="text-zinc-500" />
                </button>
              </form>
            </div>

            {/* TikTok Feed */}
            <div className="mt-8 w-full max-w-3xl px-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs text-zinc-500 font-mono tracking-wider uppercase">Trending on TikTok</h2>
                <button onClick={loadTikTok} className="text-[10px] text-zinc-600 hover:text-zinc-400 font-mono">
                  <RefreshCw size={12} className="inline mr-1" />Refresh
                </button>
              </div>
              {tiktokLoad ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
                </div>
              ) : tiktokVideos.length === 0 ? (
                <p className="text-zinc-700 text-[10px] text-center font-mono py-4">No videos loaded. Try refreshing.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {tiktokVideos.slice(0, 8).map((v, i) => (
                    <div key={v.id || i} className="relative group rounded-lg overflow-hidden bg-zinc-950 border border-zinc-900 aspect-[9/16]">
                      {v.video?.cover ? (
                        <img src={v.video.cover} alt={v.desc || 'TikTok video'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                          <Heart size={20} className="text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-[9px] text-white font-medium truncate">{v.desc || 'Video'}</p>
                        <p className="text-[8px] text-zinc-400 mt-0.5">{v.author?.nickname || v.author?.uniqueId || 'tiktok'}</p>
                        <div className="flex items-center gap-2 mt-1 text-[8px] text-zinc-400">
                          <span>❤ {v.stats?.diggCount || 0}</span>
                          <span>💬 {v.stats?.commentCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Sidebar */}
        {aiOpen && (
          <div className="w-72 bg-zinc-950 border-l border-zinc-900 flex flex-col shrink-0">
            <div className="h-11 border-b border-zinc-900 flex items-center justify-between px-3">
              <span className="text-xs font-mono text-zinc-400"><Sparkles size={11} className="inline mr-1 text-indigo-400" />XENA AI</span>
              <div className="flex items-center gap-1">
                <button onClick={() => { setAiMode(aiMode === 'serious' ? 'chill' : 'serious'); localStorage.setItem('xena_ai_mode', aiMode === 'serious' ? 'chill' : 'serious'); }}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${aiMode === 'serious' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-orange-600/20 text-orange-400'}`}>
                  {aiMode === 'serious' ? 'Serious' : 'Chill'}
                </button>
                <button onClick={() => setAiOpen(false)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-600"><X size={12} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
              {aiMsgs.length === 0 && <p className="text-zinc-700 text-[10px] text-center font-mono mt-4">Ask me anything.</p>}
              {aiMsgs.map((m, i) => (
                <div key={i} className={`p-2 rounded-lg text-[11px] ${m.role === 'user' ? 'bg-indigo-900/20 border border-indigo-800/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                  <span className={`text-[8px] font-bold uppercase tracking-wider ${m.role === 'user' ? 'text-indigo-400' : 'text-zinc-500'}`}>{m.role}</span>
                  <p className="text-zinc-300 mt-0.5 leading-relaxed">{m.text}</p>
                </div>
              ))}
              {aiLoad && <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800"><p className="text-zinc-600 text-[11px] animate-pulse">thinking...</p></div>}
              <div ref={aiEndRef} />
            </div>
            <div className="p-2 border-t border-zinc-900 flex gap-1">
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendAiMsg()}
                placeholder="Ask anything..." className="flex-1 h-8 rounded bg-black border border-zinc-800 px-2 text-xs outline-none focus:border-zinc-600 placeholder-zinc-700" />
              <button onClick={sendAiMsg} disabled={aiLoad} className="w-8 h-8 flex items-center justify-center rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 disabled:opacity-50">
                <Send size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="h-7 bg-black border-t border-zinc-900 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[9px] text-zinc-600 font-mono">
            <Shield size={9} className="text-emerald-500" />SECURE
          </span>
          <span className="text-zinc-800">|</span>
          <span className="text-[9px] text-zinc-600 font-mono">{activeMode.badge}</span>
          {devUnlocked && <span className="text-[9px] text-blue-500 font-mono font-bold">DEV</span>}
          {adminUnlocked && <span className="text-[9px] text-amber-500 font-mono font-bold">ADMIN</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-zinc-700 font-mono">{ping}ms</span>
          <span className="text-zinc-800">|</span>
          <span className="text-[9px] text-zinc-700 font-mono">{time}</span>
        </div>
      </footer>

      {/* Settings Modal */}
      {modal === 'settings' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-[420px] max-h-[80vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-900">
              <h2 className="text-sm font-bold font-mono text-white">Settings</h2>
              <button onClick={() => setModal(null)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-900 text-zinc-500"><X size={14} /></button>
            </div>
            <div className="flex border-b border-zinc-900">
              {['general', 'history'].map(t => (
                <button key={t} onClick={() => setSettingsTab(t as any)}
                  className={`flex-1 py-2.5 text-[10px] font-mono tracking-wider uppercase border-b-2 text-center transition-all ${settingsTab === t ? 'border-white text-white font-bold' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                  {t === 'general' ? 'Stealth' : 'History'}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-4">
              {settingsTab === 'general' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-mono">Classroom Cloak</span>
                    <button onClick={() => { setCloakOn(!cloakOn); localStorage.setItem('xena_cloak', cloakOn ? 'off' : 'on'); }}
                      className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider font-mono ${cloakOn ? 'bg-white/10 text-white border border-zinc-700' : 'bg-zinc-950 text-zinc-600 border border-zinc-800'}`}>
                      {cloakOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-mono mb-1">Panic Escape</p>
                    <p className="text-[9px] text-zinc-700 mb-1">Key: {escKey}</p>
                    <input value={escKey} onChange={e => { setEscKey(e.target.value); localStorage.setItem('xena_escape_key', e.target.value); }}
                      className="w-full h-8 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-mono text-white outline-none focus:border-zinc-500 mb-1" />
                    <input value={escUrl} onChange={e => { setEscUrl(e.target.value); localStorage.setItem('xena_escape_url', e.target.value); }}
                      className="w-full h-8 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-mono mb-2">Proxy Engine</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PROXY_MODES.map(mode => {
                        const isActive = proxyMode === mode.id;
                        const icons: Record<string, React.ReactNode> = { rv: <Shield size={14} />, sw: <Cpu size={14} />, bss: <Activity size={14} />, xt: <Sparkles size={14} /> };
                        return (
                          <button key={mode.id} onClick={() => { setProxyMode(mode.id); localStorage.setItem('xena_proxy_mode', mode.id); }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all text-left ${isActive ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {icons[mode.id]}<span className="text-[11px] font-bold">{mode.name}</span>
                            </div>
                            <p className="text-[9px] text-zinc-500">{mode.desc}</p>
                            <div className="flex gap-2 mt-1 text-[8px]">
                              <span className="text-zinc-600">{mode.badge}</span>
                              <span className="text-zinc-700">{mode.latency}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-mono mb-2">Search Engine</p>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(DDG_OPTIONS).map(([k, o]) => (
                        <button key={k} onClick={() => { setDdgMode(k); localStorage.setItem('xena_ddg_mode', k); }}
                          className={`px-2 py-1 rounded text-[9px] font-mono border ${ddgMode === k ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                          {o.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-[8px] text-zinc-700 mt-1">DDG is annoying and doesn't always work so try another mode. Just know all of them have an old layout I can't control. MB</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-mono mb-1">Access Codes</p>
                    <div className="flex gap-1">
                      <input value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())} placeholder="Enter code..." maxLength={5}
                        className="flex-1 h-8 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-mono text-white outline-none focus:border-zinc-500 uppercase tracking-widest" />
                      <button onClick={async () => { const ok = await checkAccessCode(accessCode); if (!ok) alert('Invalid code'); }}
                        className="h-8 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-semibold font-mono">Unlock</button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { const w = window.open('about:blank', '_blank'); if (w) { w.document.write('<html><body></body></html>'); } }}
                      className="flex-1 h-8 rounded-lg border border-zinc-800 bg-black text-[10px] text-zinc-500 hover:text-white font-mono">About:Blank</button>
                    <button onClick={() => { try { const b = new Blob(['<html><body></body></html>'], { type: 'text/html' }); window.open(URL.createObjectURL(b)); } catch {} }}
                      className="flex-1 h-8 rounded-lg border border-zinc-800 bg-black text-[10px] text-zinc-500 hover:text-white font-mono">Blob:URL</button>
                  </div>
                </>
              )}
              {settingsTab === 'history' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-zinc-500 font-mono">Search History ({searchHistory.length})</span>
                      {searchHistory.length > 0 && (
                        <button onClick={() => { setSearchHistory([]); localStorage.removeItem('xena_search_history'); }}
                          className="text-[8px] font-mono uppercase bg-zinc-950 px-1.5 py-0.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded">Clear</button>
                      )}
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                      {searchHistory.length === 0 ? <p className="text-zinc-700 text-[10px] font-mono">No search history.</p> :
                        searchHistory.slice(0, 20).map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-1.5 rounded bg-zinc-950 border border-zinc-900">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-zinc-400 truncate">{item.query}</p>
                              <p className="text-[8px] text-zinc-700">{item.engine} · {item.timestamp}</p>
                            </div>
                            <button onClick={() => { go(item.query); setModal(null); }}
                              className="text-[9px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-white rounded font-mono hover:bg-zinc-800 shrink-0 ml-2">Go</button>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-zinc-500 font-mono">AI History ({aiHistory.length})</span>
                      {aiHistory.length > 0 && (
                        <button onClick={() => { setAiHistory([]); localStorage.removeItem('xena_ai_history'); }}
                          className="text-[8px] font-mono uppercase bg-zinc-950 px-1.5 py-0.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded">Clear</button>
                      )}
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                      {aiHistory.length === 0 ? <p className="text-zinc-700 text-[10px] font-mono">No AI conversations yet.</p> :
                        aiHistory.slice(0, 15).map((item, i) => (
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
                  </div>
                </>
              )}
            </div>
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
              className="w-full h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold font-mono">Unlock</button>
          </div>
        </div>
      )}
    </div>
  );
}
