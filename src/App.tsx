import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send, Shield, Bug, Cpu, Terminal, Users, Bell, RefreshCw, Star, Search, Heart, MessageCircle, Share2, Moon, LogOut, Trash2, ExternalLink, Play, Pause, Volume2, VolumeX, AlertTriangle } from "lucide-react";

// ==================== ENCODING ====================
function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c === "+" ? "-" : c === "/" ? "_" : ""); } catch { return encodeURIComponent(v); }
}
function b64d(v: string): string {
  try { let t = v.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; return decodeURIComponent(escape(atob(t))); } catch { return v; }
}

// ==================== PROXY MODES ====================
const PROXY_MODES = [
  { id: "rv", name: "RV", fullName: "Reverse Proxy", desc: "Server-side reverse proxy (Default)", badge: "REVERSE", latency: "~18ms" },
  { id: "sw", name: "SW", fullName: "Service Worker Engine", desc: "Client-side SW interception", badge: "SW ENGINE", latency: "~12ms" },
  { id: "bss", name: "BSS", fullName: "Binary Stream Sandbox", desc: "Streaming binary content", badge: "BINARY OS", latency: "~24ms" },
  { id: "xt", name: "XT", fullName: "X-Treme Ultimate Proxy", desc: "Deep rewrite + DOM bridge", badge: "ULTIMATE", latency: "~32ms" }
];

const DDG_OPTIONS: Record<string, { name: string; url: string; note: string }> = {
  ddg1: { name: "DuckDuckGo Standard", url: "https://duckduckgo.com/?q=", note: "Standard DDG — may refuse iframe embedding" },
  ddg2: { name: "DuckDuckGo HTML (No JS)", url: "https://html.duckduckgo.com/html/?q=", note: "Lightweight HTML version, works in proxies" },
  ddg3: { name: "DuckDuckGo Lite", url: "https://lite.duckduckgo.com/lite/?q=", note: "Minimal version, best for proxied iframes" },
  ddg4: { name: "Startpage (DDG alt)", url: "https://www.startpage.com/sp/search?query=", note: "Privacy-focused alternative" },
  ddg5: { name: "Bing Fallback", url: "https://www.bing.com/search?q=", note: "Last resort fallback search engine" }
};

const FUN_FACTS = [
  "The first computer virus was created in 1983",
  "There are over 1.8 billion websites on the internet",
  "The first 1GB hard drive weighed over 500 pounds in 1980",
  "Google processes over 8.5 billion searches per day",
  "The first email was sent by Ray Tomlinson in 1971",
  "More than 90% of the world's data was created in the last 2 years",
  "The first website is still online at info.cern.ch",
  "Over 500 hours of video are uploaded to YouTube every minute",
  "Python is named after Monty Python's Flying Circus",
  "The first iPhone had no copy and paste functionality",
  "Linux runs 90% of the world's cloud infrastructure",
  "The QWERTY keyboard was designed to slow typists down",
  "The first webcam was created to monitor a coffee pot",
  "CAPTCHA stands for Completely Automated Public Turing test",
  "The first computer bug was an actual moth found in a computer",
  "Fun Fact Number 16 - The hashtag symbol is officially called an octothorpe",
  "The first domain name ever registered was Symbolics.com",
  "The original name for Windows was Interface Manager",
  "NASA is still using some technology from the 1970s on spacecraft",
  "The 404 error code was named after a room number at CERN where the web was born",
  "The first alarm clock could only ring at one time: 4 a.m.",
  "The world's first digital clock was invented in 1956",
  "The total weight of all the electricity running the internet is about 50 grams",
  "The first mobile phone call was made in New York City in 1973",
  "The original PlayStation was meant to be a Nintendo console plugin",
  "Amazon was almost named Cadabra, as in Abracadabra",
  "The first item ever scanned with a barcode was a pack of Wrigley's Juicy Fruit gum",
  "Firefox is actually named after the red panda, not a fox",
  "The first smartphone was created by IBM in 1992 and was called Simon",
  "Fun Fact Number 30 - Android was originally developed as an operating system for digital cameras",
  "The first computer mouse was made of wood by Douglas Engelbart",
  "In 1999, PayPal was voted one of the worst business ideas of the year",
  "The Nokia tune is actually based on a 19th-century guitar work called Gran Vals",
  "Over 300 billion emails are sent and received every single day",
  "The first text message ever sent said Merry Christmas",
  "A single Google search uses more computing power than it took to send Apollo 11 to the moon",
  "The original Twitter bird logo is named Larry, after basketball player Larry Bird",
  "Super Mario Bros. was so small it fit onto a 256-kilobit cartridge",
  "The first Apple logo featured Sir Isaac Newton sitting under an apple tree",
  "Wi-Fi doesn't actually stand for Wireless Fidelity; it's a made-up marketing term",
  "The average computer user blinks only 7 times a minute, instead of the usual 20",
  "The term robot comes from a Czech word meaning forced labor",
  "More people own a mobile phone than a toothbrush globally",
  "JPEG stands for Joint Photographic Experts Group",
  "The first banner ad went live in 1994 and had a 44% click-through rate",
  "GPS is owned and operated by the United States government",
  "Ebay was originally called AuctionWeb when it launched in 1995",
  "The first video ever uploaded to YouTube is called Me at the zoo",
  "Fun Fact Number 40 - Bluetooth was named after a 10th-century Scandinavian king who united Scandinavia",
  "The first commercial compact disc was pressed in 1982 and featured ABBA music",
  "Nearly 50% of all internet traffic comes from automated bots, not humans",
  "The founders of Google were willing to sell it to Excite for $1 million in 1999",
  "The first hard drive available for a home computer had a capacity of just 5 megabytes",
  "Siri was originally an independent app for iOS before Apple bought it",
  "The classic game Tetris was created in Soviet Russia by Alexey Pajitnov",
  "The first hard drive to cross the 1 terabyte mark was released by Hitachi in 2007",
  "The term spam for junk email comes from a Monty Python comedy sketch",
  "There are more active mobile connections in the world than there are people",
  "The world's first programmable computer was the Z1, built in 1936",
  "The first music video played on MTV was Video Killed the Radio Star by The Buggles",
  "The original name for Yahoo! was Jerry and David's Guide to the World Wide Web",
  "A petabyte is enough data to store 3.4 years of 24/7 4K video",
  "The save icon used in most software is a 3.5-inch floppy disk, which holds 1.44MB",
  "The first video game ever created was called Tennis for Two in 1958",
  "The spacebar is the most used key on a standard computer keyboard",
  "Netflix was founded in 1997, originally operating as a DVD-by-mail service",
  "The first laser was built in 1960 using a synthetic ruby crystal",
  "Fun Fact Number 57 - The original URL for Google was google.stanford.edu",
  "The world's first webcam image was a 128x128 grayscale picture of a coffee pot",
  "Macintosh computers were named after a variety of apple favored by the creator",
  "The first MP3 player was released in 1997 and could hold about 8 songs",
  "A single standard fiber optic cable can transmit the entire library of congress in seconds",
  "The blue color of Facebook is because Mark Zuckerberg is red-green colorblind",
  "The first 3D movie was released in theaters in 1922 and required green and red glasses",
  "The concept of the internet was envisioned by Nikola Tesla as early as 1900",
  "Over 90% of global currency exists only on computers as digital money",
  "The first digital camera was invented by an engineer at Kodak in 1975",
  "The term podcast is a blend of the words iPod and broadcast",
  "In 1995, the domain registration process for websites was completely free",
  "The first 4G cellular network was launched in South Korea in 2006",
  "The term bug was used to describe engineering glitches long before computers existed",
  "The world's most expensive domain name, Voice.com, sold for $30 million in 2019",
  "The first computer mouse required two wheels to track horizontal and vertical movement",
  "The original iPhone development team was kept so secret they called it Project Purple",
  "The first SMS message ever sent on a commercial network happened in December 1992",
  "The total amount of digital data in the world is measured in zettabytes",
  "The code that ran the Apollo 11 guidance computer was written by Margaret Hamilton",
  "The first consumer drones were available in the early 2010s",
  "The QWERTY layout was patented by Christopher Sholes in 1878",
  "The first virtual reality headset was created in 1968 and was called The Sword of Damocles",
  "Fun Fact Number 83 - The first commercial SMS text message was sent over the Vodafone GSM network",
  "The word emoji comes from the Japanese words for picture and character",
  "The first microprocessor was the Intel 4004, released in 1971",
  "The standard aspect ratio of 16:9 for modern screens was chosen as a compromise",
  "The first consumer version of Windows 95 sold 1 million copies in just 4 days",
  "The original concept of Wikipedia allowed anyone to edit without creating an account",
  "The first USB flash drives were introduced in 2000 with a capacity of 8 megabytes",
  "The word pixel is a combination of the words picture and element",
  "The first mechanical computer was designed by Charles Babbage in the 1830s",
  "The programming language JavaScript was famously written in just 10 days",
  "The first color photograph was taken by physicist James Clerk Maxwell in 1861",
  "The blue light emitted by screens can disrupt melatonin production and sleep patterns",
  "The first web browser capable of displaying images inline with text was Mosaic",
  "The world's first smartphone had a touchscreen, calendar, and fax capability",
  "The original mascot for Linux is a penguin named Tux",
  "The first Apple computer went on sale for the specific price of $666.66",
  "The first commercial cellular network was launched in Japan by NTT in 1979",
  "The word algorithm originates from the name of a 9th-century Persian mathematician",
  "The first solid-state drive for consumer PCs was introduced in the early 1991",
  "Fun Fact Number 100 - The Earth has more than 1 trillion species of microbes"
];

// ==================== HELPERS ====================
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDomain(u: string): string {
  try { return new URL(u).hostname.replace("www.", ""); } catch { return "Web"; }
}

function isUrl(t: string): boolean {
  if (!t.trim()) return false;
  if (/^https?:\/\//i.test(t)) return true;
  return /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t);
}

function normalizeInput(engine: string, input: string): string {
  const r = input.trim();
  if (!r) return "";
  if (/^https?:\/\//i.test(r)) return r;
  if (isUrl(r)) return `https://${r}`;
  const enc = encodeURIComponent(r);
  return `https://lite.duckduckgo.com/lite/?q=${enc}`;
}

function getProxyUrl(u: string, mode: string): string {
  if (!u) return "";
  if (u.startsWith("/") || u.startsWith("http://localhost") || u.startsWith("http://127.0.0.1")) return u;
  return `/${mode}/${b64e(u)}`;
}

// ==================== STAR BACKGROUND ====================
function StarryBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let anim: number;
    const resize = () => { c.width = c.parentElement?.clientWidth || innerWidth; c.height = c.parentElement?.clientHeight || innerHeight; };
    resize();
    addEventListener("resize", resize);
    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      r: Math.random() * 1.2 + 0.3, a: Math.random(), s: Math.random() * 0.015 + 0.003,
      d: Math.random() > 0.5 ? 1 : -1
    }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#fff";
      stars.forEach(st => {
        st.a += st.s * st.d;
        if (st.a >= 1) { st.a = 1; st.d = -1; } else if (st.a <= 0.1) { st.a = 0.1; st.d = 1; }
        ctx.globalAlpha = st.a;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      anim = requestAnimationFrame(draw);
    };
    draw();
    return () => { removeEventListener("resize", resize); cancelAnimationFrame(anim); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none z-0" />;
}

// ==================== TYPES ====================
interface Tab { id: string; title: string; url: string; proxyUrl: string; }
interface ChatMessage { sender: "user" | "ai"; text: string; timestamp: string; }
interface Report { id: string; kind: "bug" | "suggestion"; title: string; url?: string; details: string; important?: boolean; }

// ==================== DEV CONSOLE COMPONENT ====================
function DevConsole({ onClose, reports }: { onClose: () => void; reports: Report[] }) {
  const [ddgMode, setDdgMode] = useState(() => localStorage.getItem("xena_ddg_mode") || "ddg3");
  const [ddgQuery, setDdgQuery] = useState("youtube");
  const [ddgResult, setDdgResult] = useState<string | null>(null);

  const testDdg = (key: string) => {
    const o = DDG_OPTIONS[key];
    if (!o) return;
    setDdgResult(`Testing: ${o.name}\nURL: ${o.url}${encodeURIComponent(ddgQuery)}\n\nOpened in new tab.`);
    window.open("/fetch/" + b64e(o.url + encodeURIComponent(ddgQuery)), "_blank");
  };
  const setDefault = (key: string) => {
    setDdgMode(key);
    localStorage.setItem("xena_ddg_mode", key);
    setDdgResult(`✅ Default DDG mode set to: ${DDG_OPTIONS[key].name}`);
  };

  return (
    <div className="w-full min-h-screen bg-[#060a18] text-white overflow-y-auto">
      <header className="bg-gradient-to-r from-[#0a1030] via-[#0d1540] to-[#0a1030] border-b border-[#1a2850] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs tracking-[0.2em] font-mono">
              <Cpu className="w-4 h-4" /> DEVELOPER CONSOLE
            </div>
            <button onClick={onClose} className="px-4 py-2 bg-[#1a2850]/50 border border-[#2a3870] rounded-lg text-blue-300 hover:text-white text-sm font-mono hover:bg-[#1a2850]/80 transition-all">✕ CLOSE</button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-10 h-10 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <h1 className="text-5xl font-bold text-white">{getGreeting()} <span className="text-cyan-400">G</span></h1>
          </div>
          <p className="text-blue-300/50 font-mono text-sm">XENA Neural Engine v2.0 • Full System Access</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Bug Reports</p>
            <p className="text-4xl font-bold text-white">{reports.length}</p>
            <div className="flex gap-3 mt-2 text-[10px] font-mono">
              <span className="text-red-400/60">{reports.filter(r => r.kind === "bug").length} bugs</span>
              <span className="text-cyan-400/60">{reports.filter(r => r.kind === "suggestion").length} suggestions</span>
            </div>
          </div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Active Sessions</p>
            <p className="text-4xl font-bold text-white">3</p>
            <p className="text-[10px] text-blue-300/40 font-mono mt-2">2 tabs • 1 admin</p>
          </div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">System Uptime</p>
            <p className="text-4xl font-bold text-white">{Math.floor(performance.now() / 1000 / 60)}m</p>
            <p className="text-[10px] text-blue-300/40 font-mono mt-2">RV Engine • Active</p>
          </div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Memory Heap</p>
            <p className="text-4xl font-bold text-white">~64MB</p>
            <p className="text-[10px] text-blue-300/40 font-mono mt-2">Stable • Normal load</p>
          </div>
        </div>

        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-white">DuckDuckGo Proxy Configuration</h2>
              <p className="text-sm text-blue-300/50 font-mono">Test which DDG mode works, then set as default</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="text"
                value={ddgQuery}
                onChange={e => setDdgQuery(e.target.value)}
                placeholder="Test query"
                className="px-3 py-2 bg-[#060a18] border border-[#1a2850] rounded-lg text-xs text-white w-40 outline-none focus:border-cyan-500/50"
              />
              <span className="text-blue-400/40 text-xs font-mono">
                default: <span className="text-cyan-400">{DDG_OPTIONS[ddgMode]?.name || "Lite"}</span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(DDG_OPTIONS).map(([k, o]) => (
              <div
                key={k}
                className={`bg-[#060a18] border rounded-lg p-4 transition-all ${ddgMode === k ? "border-cyan-500/50 ring-1 ring-cyan-500/20" : "border-[#1a2850] hover:border-cyan-700/30"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{o.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => testDdg(k)} className="text-[10px] px-3 py-1 bg-[#1a2850]/50 border border-[#2a3870] rounded text-blue-300 hover:text-white transition-all font-mono">Test</button>
                    <button onClick={() => setDefault(k)} className={`text-[10px] px-3 py-1 rounded transition-all font-mono ${ddgMode === k ? "bg-cyan-900/30 text-cyan-300 border border-cyan-700/30" : "bg-[#1a2850]/30 border border-[#1a2850] text-blue-300/60 hover:text-white"}`}>{ddgMode === k ? "✓ Default" : "Set Default"}</button>
                  </div>
                </div>
                <p className="text-xs text-blue-300/60 mb-1">{o.note}</p>
                <p className="text-[9px] text-blue-400/30 font-mono truncate">{o.url}your+search</p>
              </div>
            ))}
          </div>
          {ddgResult && (
            <div className="mt-4 p-3 bg-[#060a18] border border-[#1a2850] rounded-lg">
              <p className="text-xs text-cyan-400 font-mono whitespace-pre-wrap">{ddgResult}</p>
            </div>
          )}
        </div>

        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bug className="w-5 h-5 text-red-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Bug Reports & Insights</h2>
              <p className="text-sm text-blue-300/50 font-mono">{reports.length} total submissions</p>
            </div>
          </div>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-blue-300/30">
              <Bug className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-mono">No bug reports yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {reports.map(rep => (
                <div key={rep.id} className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${rep.kind === "bug" ? "bg-red-500/20 text-red-300" : "bg-cyan-500/20 text-cyan-300"}`}>
                    {rep.kind === "bug" ? "BUG" : "IDEA"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{rep.title}</span>
                      {rep.important && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <p className="text-xs text-blue-300/60">{rep.details}</p>
                    {rep.url && <p className="text-[10px] text-cyan-400/50 mt-1 font-mono truncate">{rep.url}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Known Issues & Fixes</h2>
          </div>
          <div className="space-y-3">
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-mono text-red-300">ERR_SW_FETCH</p>
                <p className="text-xs text-blue-300/60 mt-1">Service Worker failed. Reload page or switch to Reverse Proxy mode.</p>
              </div>
            </div>
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-mono text-yellow-300">ERR_IFRAME_BLOCK</p>
                <p className="text-xs text-blue-300/60 mt-1">X-Frame-Options blocked. XENA strips these headers automatically.</p>
              </div>
            </div>
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-mono text-cyan-300">ERR_DDG_EMBED</p>
                <p className="text-xs text-blue-300/60 mt-1">DDG refuses iframe. Try different DDG modes below or use Google/Bing.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ADMIN CONSOLE COMPONENT ====================
function AdminConsole({ onClose, reports, onLogout }: { onClose: () => void; reports: Report[]; onLogout: () => void }) {
  const [announceMsg, setAnnounceMsg] = useState("");
  const toggleImportant = (id: string) => {
    const u = reports.map(r => r.id === id ? { ...r, important: !r.important } : r);
    localStorage.setItem("xena_reports", JSON.stringify(u));
    window.location.reload();
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0606] text-white overflow-y-auto">
      <header className="bg-gradient-to-r from-[#1a0808] via-[#2a1010] to-[#1a0808] border-b border-[#502020] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs tracking-[0.2em] font-mono">
              <Users className="w-4 h-4" /> ADMIN CONSOLE
            </div>
            <div className="flex gap-2">
              <button onClick={onLogout} className="px-4 py-2 bg-[#2a1414]/50 border border-[#502020] rounded-lg text-red-300 hover:text-white text-sm font-mono hover:bg-[#2a1414]/80 transition-all flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-[#2a1414]/50 border border-[#502020] rounded-lg text-amber-300 hover:text-white text-sm font-mono hover:bg-[#2a1414]/80 transition-all">✕ CLOSE</button>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-1">Sup <span className="text-amber-400">G</span></h1>
          <p className="text-amber-300/50 font-mono text-sm">XENA Gateway Administration • Access Level: ADMIN</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Bug Reports</p>
            <p className="text-4xl font-bold text-white">{reports.length}</p>
            <p className="text-[10px] text-amber-300/40 font-mono mt-2">{reports.filter(r => r.important).length} marked important</p>
          </div>
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Announcements</p>
            <p className="text-4xl font-bold text-white">0</p>
            <p className="text-[10px] text-amber-300/40 font-mono mt-2">active broadcasts</p>
          </div>
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Active Tabs</p>
            <p className="text-4xl font-bold text-white">2</p>
            <p className="text-[10px] text-amber-300/40 font-mono mt-2">browser sessions</p>
          </div>
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Gateway</p>
            <p className="text-4xl font-bold text-emerald-400">●</p>
            <p className="text-[10px] text-amber-300/40 font-mono mt-2">online · stable</p>
          </div>
        </div>

        <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bug className="w-5 h-5 text-red-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Bug Reports</h2>
              <p className="text-sm text-amber-300/50 font-mono">Click ★ to mark as important (forwarded to developer)</p>
            </div>
          </div>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-amber-300/30">
              <Bug className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-mono">No bug reports yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {reports.map(rep => (
                <div key={rep.id} className="border rounded-lg p-4 flex items-start gap-3 bg-[#060404] border-[#502020] hover:border-amber-700/50 transition-all">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${rep.kind === "bug" ? "bg-red-500/20 text-red-300" : "bg-cyan-500/20 text-cyan-300"}`}>
                    {rep.kind === "bug" ? "BUG" : "IDEA"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{rep.title}</span>
                      {rep.important && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <p className="text-xs text-amber-300/60">{rep.details}</p>
                    {rep.url && <p className="text-[10px] text-cyan-400/50 mt-1 font-mono truncate">{rep.url}</p>}
                  </div>
                  <button onClick={() => toggleImportant(rep.id)} className="text-amber-400/60 hover:text-amber-300 text-lg shrink-0">★</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Send Announcement</h2>
              <p className="text-sm text-amber-300/50 font-mono">Broadcast a message to all XENA users</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={announceMsg}
              onChange={e => setAnnounceMsg(e.target.value)}
              placeholder="Announcement message..."
              className="w-full h-10 rounded-lg border border-[#502020] bg-[#0a0606] px-4 text-sm text-white outline-none focus:border-amber-700/50 placeholder-amber-800/50"
            />
            <button
              onClick={() => { alert("Announcement broadcasted!"); setAnnounceMsg(""); }}
              className="w-full py-3 rounded-lg bg-amber-800/20 border border-amber-700/30 hover:bg-amber-800/40 text-amber-300 text-sm font-mono font-bold tracking-wider transition-all"
            >
              📢 Broadcast Announcement
            </button>
          </div>
        </div>

        <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="w-5 h-5 text-red-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Gateway Controls</h2>
              <p className="text-sm text-amber-300/50 font-mono">Manage XENA server operations</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => window.location.reload()} className="py-4 rounded-lg bg-red-900/20 border border-red-800/30 hover:bg-red-900/40 text-red-300 text-sm font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-3">
              <RefreshCw className="w-5 h-5" /> Restart Gateway
            </button>
            <button onClick={() => window.location.reload()} className="py-4 rounded-lg bg-amber-900/20 border border-amber-800/30 hover:bg-amber-900/40 text-amber-300 text-sm font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-3">
              <RefreshCw className="w-5 h-5" /> Reload Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== TIKTOK COMPONENT ====================
function TikTokClone({ onBack }: { onBack: () => void }) {
  const vref = useRef<(HTMLVideoElement | null)[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);

  const vids = [
    { id: '1', user: '@xena', desc: 'XENA Browser - Browse anything securely 🚀', music: 'original sound - XENA', avatar: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&auto=format', likes: '1.2K', comments: '89', shares: '45', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    { id: '2', user: '@sandbox', desc: 'Streaming through XENA proxy 🌐', music: 'Electronic Vibes', avatar: 'https://images.unsplash.com/photo-1531746790095-e5cb1579be01?w=100&auto=format', likes: '856', comments: '34', shares: '12', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    { id: '3', user: '@techguy', desc: 'This is how XENA loads TikTok 👀', music: 'original sound - techguy', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format', likes: '2.3K', comments: '156', shares: '78', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
    { id: '4', user: '@xena', desc: 'TikTok through XENA sandbox browser 🛡️', music: 'Chill Beats', avatar: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&auto=format', likes: '3.1K', comments: '203', shares: '95', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
  ];

  useEffect(() => {
    const f = feedRef.current;
    if (!f) return;
    const handler = () => {
      const sc = f.scrollTop + innerHeight / 2;
      vref.current.forEach((v, i) => {
        if (!v) return;
        const r = v.getBoundingClientRect();
        const vc = r.top + r.height / 2;
        if (vc > innerHeight * 0.25 && vc < innerHeight * 0.75) {
          v.play().catch(() => { });
          setPlaying(vids[i]?.id || null);
        } else {
          v.pause();
        }
      });
    };
    f.addEventListener("scroll", handler);
    setTimeout(handler, 500);
    return () => f.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden flex flex-col">
      <div className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white text-xl">←</button>
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.74 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.8 15.43a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.74a8.29 8.29 0 004.77 1.49v-3.5a4.83 4.83 0 01-1.66-.04z" />
          </svg>
        </div>
        <button onClick={() => setMuted(!muted)} className="p-2 text-white/70 hover:text-white">
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
      <div ref={feedRef} className="flex-1 overflow-y-scroll snap-y snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {vids.map((v, i) => (
          <div key={v.id} className="snap-start h-screen w-full relative flex items-center justify-center bg-black">
            <video
              ref={el => { vref.current[i] = el; }}
              src={"/fetch/" + b64e(v.src)}
              loop
              muted={muted}
              playsInline
              className="w-full h-full object-cover absolute inset-0"
              onClick={() => {
                const vv = vref.current[i];
                if (vv) {
                  if (vv.paused) { vv.play(); setPlaying(v.id); } else { vv.pause(); setPlaying(null); }
                }
              }}
            />
            {playing === v.id && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <Play className="w-16 h-16 text-white/50" />
              </div>
            )}
            <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
                <img src={v.avatar} className="w-full h-full object-cover" alt="" />
              </div>
              <button className="flex flex-col items-center gap-1 text-white">
                <Heart className="w-7 h-7 drop-shadow-lg" fill="white" />
                <span className="text-xs font-bold drop-shadow-lg">{v.likes}</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white">
                <MessageCircle className="w-7 h-7 drop-shadow-lg" fill="white" />
                <span className="text-xs font-bold drop-shadow-lg">{v.comments}</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white">
                <Share2 className="w-7 h-7 drop-shadow-lg" />
                <span className="text-xs font-bold drop-shadow-lg">{v.shares}</span>
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/70 to-transparent z-10">
              <p className="font-bold text-sm mb-1">{v.user} <span className="font-normal text-white/60 text-xs">{v.user.replace('@', '')}</span></p>
              <p className="text-sm mb-2">{v.desc}</p>
              <div className="flex items-center gap-2 text-xs text-white/70">💿 {v.music}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== ACCESS CODE MODAL ====================
function AccessCodeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (code: string) => Promise<boolean> }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    const success = await onSubmit(code.trim());
    setLoading(false);
    if (!success) setError("Invalid access code");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 w-full max-w-md mx-4">
        <div className="flex items-center gap
        import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send, Shield, Bug, Cpu, Terminal, Users, Bell, RefreshCw, Star, Search, Heart, MessageCircle, Share2, Moon, LogOut, Trash2, ExternalLink, Play, Pause, Volume2, VolumeX, AlertTriangle } from "lucide-react";

// ==================== ENCODING ====================
function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c === "+" ? "-" : c === "/" ? "_" : ""); } catch { return encodeURIComponent(v); }
}
function b64d(v: string): string {
  try { let t = v.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; return decodeURIComponent(escape(atob(t))); } catch { return v; }
}

// ==================== PROXY MODES ====================
const PROXY_MODES = [
  { id: "rv", name: "RV", fullName: "Reverse Proxy", desc: "Server-side reverse proxy (Default)", badge: "REVERSE", latency: "~18ms" },
  { id: "sw", name: "SW", fullName: "Service Worker Engine", desc: "Client-side SW interception", badge: "SW ENGINE", latency: "~12ms" },
  { id: "bss", name: "BSS", fullName: "Binary Stream Sandbox", desc: "Streaming binary content", badge: "BINARY OS", latency: "~24ms" },
  { id: "xt", name: "XT", fullName: "X-Treme Ultimate Proxy", desc: "Deep rewrite + DOM bridge", badge: "ULTIMATE", latency: "~32ms" }
];

const DDG_OPTIONS: Record<string, { name: string; url: string; note: string }> = {
  ddg1: { name: "DuckDuckGo Standard", url: "https://duckduckgo.com/?q=", note: "Standard DDG — may refuse iframe embedding" },
  ddg2: { name: "DuckDuckGo HTML (No JS)", url: "https://html.duckduckgo.com/html/?q=", note: "Lightweight HTML version, works in proxies" },
  ddg3: { name: "DuckDuckGo Lite", url: "https://lite.duckduckgo.com/lite/?q=", note: "Minimal version, best for proxied iframes" },
  ddg4: { name: "Startpage (DDG alt)", url: "https://www.startpage.com/sp/search?query=", note: "Privacy-focused alternative" },
  ddg5: { name: "Bing Fallback", url: "https://www.bing.com/search?q=", note: "Last resort fallback search engine" }
};
        const FUN_FACTS = [
  "The first computer virus was created in 1983",
  "There are over 1.8 billion websites on the internet",
  "The first 1GB hard drive weighed over 500 pounds in 1980",
  "Google processes over 8.5 billion searches per day",
  "The first email was sent by Ray Tomlinson in 1971",
  "More than 90% of the world's data was created in the last 2 years",
  "The first website is still online at info.cern.ch",
  "Over 500 hours of video are uploaded to YouTube every minute",
  "Python is named after Monty Python's Flying Circus",
  "The first iPhone had no copy and paste functionality",
  "Linux runs 90% of the world's cloud infrastructure",
  "The QWERTY keyboard was designed to slow typists down",
  "The first webcam was created to monitor a coffee pot",
  "CAPTCHA stands for Completely Automated Public Turing test",
  "The first computer bug was an actual moth found in a computer",
  "Fun Fact Number 16 - The hashtag symbol is officially called an octothorpe",
  "The first domain name ever registered was Symbolics.com",
  "The original name for Windows was Interface Manager",
  "NASA is still using some technology from the 1970s on spacecraft",
  "The 404 error code was named after a room number at CERN where the web was born",
  "The first alarm clock could only ring at one time: 4 a.m.",
  "The world's first digital clock was invented in 1956",
  "The total weight of all the electricity running the internet is about 50 grams",
  "The first mobile phone call was made in New York City in 1973",
  "The original PlayStation was meant to be a Nintendo console plugin",
  "Amazon was almost named Cadabra, as in Abracadabra",
  "The first item ever scanned with a barcode was a pack of Wrigley's Juicy Fruit gum",
  "Firefox is actually named after the red panda, not a fox",
  "The first smartphone was created by IBM in 1992 and was called Simon",
  "Fun Fact Number 30 - Android was originally developed as an operating system for digital cameras",
  "The first computer mouse was made of wood by Douglas Engelbart",
  "In 1999, PayPal was voted one of the worst business ideas of the year",
  "The Nokia tune is actually based on a 19th-century guitar work called Gran Vals",
  "Over 300 billion emails are sent and received every single day",
  "The first text message ever sent said Merry Christmas",
  "A single Google search uses more computing power than it took to send Apollo 11 to the moon",
  "The original Twitter bird logo is named Larry, after basketball player Larry Bird",
  "Super Mario Bros. was so small it fit onto a 256-kilobit cartridge",
  "The first Apple logo featured Sir Isaac Newton sitting under an apple tree",
  "Wi-Fi doesn't actually stand for Wireless Fidelity; it's a made-up marketing term",
  "The average computer user blinks only 7 times a minute, instead of the usual 20",
  "The term robot comes from a Czech word meaning forced labor",
  "More people own a mobile phone than a toothbrush globally",
  "JPEG stands for Joint Photographic Experts Group",
  "The first banner ad went live in 1994 and had a 44% click-through rate",
  "GPS is owned and operated by the United States government",
  "Ebay was originally called AuctionWeb when it launched in 1995",
  "The first video ever uploaded to YouTube is called Me at the zoo",
  "Fun Fact Number 40 - Bluetooth was named after a 10th-century Scandinavian king who united Scandinavia",
  "The first commercial compact disc was pressed in 1982 and featured ABBA music",
  "Nearly 50% of all internet traffic comes from automated bots, not humans",
  "The founders of Google were willing to sell it to Excite for $1 million in 1999",
  "The first hard drive available for a home computer had a capacity of just 5 megabytes",
  "Siri was originally an independent app for iOS before Apple bought it",
  "The classic game Tetris was created in Soviet Russia by Alexey Pajitnov",
  "The first hard drive to cross the 1 terabyte mark was released by Hitachi in 2007",
  "The term spam for junk email comes from a Monty Python comedy sketch",
  "There are more active mobile connections in the world than there are people",
  "The world's first programmable computer was the Z1, built in 1936",
  "The first music video played on MTV was Video Killed the Radio Star by The Buggles",
  "The original name for Yahoo! was Jerry and David's Guide to the World Wide Web",
  "A petabyte is enough data to store 3.4 years of 24/7 4K video",
  "The save icon used in most software is a 3.5-inch floppy disk, which holds 1.44MB",
  "The first video game ever created was called Tennis for Two in 1958",
  "The spacebar is the most used key on a standard computer keyboard",
  "Netflix was founded in 1997, originally operating as a DVD-by-mail service",
  "The first laser was built in 1960 using a synthetic ruby crystal",
  "Fun Fact Number 57 - The original URL for Google was google.stanford.edu",
  "The world's first webcam image was a 128x128 grayscale picture of a coffee pot",
  "Macintosh computers were named after a variety of apple favored by the creator",
  "The first MP3 player was released in 1997 and could hold about 8 songs",
  "A single standard fiber optic cable can transmit the entire library of congress in seconds",
  "The blue color of Facebook is because Mark Zuckerberg is red-green colorblind",
  "The first 3D movie was released in theaters in 1922 and required green and red glasses",
  "The concept of the internet was envisioned by Nikola Tesla as early as 1900",
  "Over 90% of global currency exists only on computers as digital money",
  "The first digital camera was invented by an engineer at Kodak in 1975",
  "The term podcast is a blend of the words iPod and broadcast",
  "In 1995, the domain registration process for websites was completely free",
  "The first 4G cellular network was launched in South Korea in 2006",
  "The term bug was used to describe engineering glitches long before computers existed",
  "The world's most expensive domain name, Voice.com, sold for $30 million in 2019",
  "The first computer mouse required two wheels to track horizontal and vertical movement",
  "The original iPhone development team was kept so secret they called it Project Purple",
  "The first SMS message ever sent on a commercial network happened in December 1992",
  "The total amount of digital data in the world is measured in zettabytes",
  "The code that ran the Apollo 11 guidance computer was written by Margaret Hamilton",
  "The first consumer drones were available in the early 2010s",
  "The QWERTY layout was patented by Christopher Sholes in 1878",
  "The first virtual reality headset was created in 1968 and was called The Sword of Damocles",
  "Fun Fact Number 83 - The first commercial SMS text message was sent over the Vodafone GSM network",
  "The word emoji comes from the Japanese words for picture and character",
  "The first microprocessor was the Intel 4004, released in 1971",
  "The standard aspect ratio of 16:9 for modern screens was chosen as a compromise",
  "The first consumer version of Windows 95 sold 1 million copies in just 4 days",
  "The original concept of Wikipedia allowed anyone to edit without creating an account",
  "The first USB flash drives were introduced in 2000 with a capacity of 8 megabytes",
  "The word pixel is a combination of the words picture and element",
  "The first mechanical computer was designed by Charles Babbage in the 1830s",
  "The programming language JavaScript was famously written in just 10 days",
  "The first color photograph was taken by physicist James Clerk Maxwell in 1861",
  "The blue light emitted by screens can disrupt melatonin production and sleep patterns",
  "The first web browser capable of displaying images inline with text was Mosaic",
  "The world's first smartphone had a touchscreen, calendar, and fax capability",
  "The original mascot for Linux is a penguin named Tux",
  "The first Apple computer went on sale for the specific price of $666.66",
  "The first commercial cellular network was launched in Japan by NTT in 1979",
  "The word algorithm originates from the name of a 9th-century Persian mathematician",
  "The first solid-state drive for consumer PCs was introduced in the early 1991",
  "Fun Fact Number 100 - The Earth has more than 1 trillion species of microbes"
];

// ==================== HELPERS ====================
function getGreeting(): string { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening"; }
function getDomain(u: string): string { try { return new URL(u).hostname.replace("www.", ""); } catch { return "Web"; } }
function isUrl(t: string): boolean { if (!t.trim()) return false; if (/^https?:\/\//i.test(t)) return true; return /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t); }

function normalizeInput(engine: string, input: string): string {
  const r = input.trim();
  if (!r) return "";
  if (/^https?:\/\//i.test(r)) return r;
  if (isUrl(r)) return `https://${r}`;
  const enc = encodeURIComponent(r);
  return `https://lite.duckduckgo.com/lite/?q=${enc}`;
}

function getProxyUrl(u: string, mode: string): string {
  if (!u) return "";
  if (u.startsWith("/") || u.startsWith("http://localhost") || u.startsWith("http://127.0.0.1")) return u;
  return `/${mode}/${b64e(u)}`;
}

// ==================== STAR BG ====================
function StarryBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let anim: number;
    const r = () => { c.width = c.parentElement?.clientWidth || innerWidth; c.height = c.parentElement?.clientHeight || innerHeight; };
    r(); addEventListener("resize", r);
    const s = Array.from({ length: 60 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.2 + 0.3, a: Math.random(), s: Math.random() * 0.015 + 0.003, d: Math.random() > 0.5 ? 1 : -1 }));
    const d = () => { ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = "#fff"; s.forEach(st => { st.a += st.s * st.d; if (st.a >= 1) { st.a = 1; st.d = -1 } else if (st.a <= 0.1) { st.a = 0.1; st.d = 1 } ctx.globalAlpha = st.a; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill(); }); anim = requestAnimationFrame(d); };
    d();
    return () => { removeEventListener("resize", r); cancelAnimationFrame(anim); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none z-0" />;
}

interface Tab { id: string; title: string; url: string; proxyUrl: string; }
interface ChatMessage { sender: "user" | "ai"; text: string; timestamp: string; }
interface Report { id: string; kind: "bug" | "suggestion"; title: string; url?: string; details: string; important?: boolean; }
interface Shortcut { id: string; name: string; url: string; icon: string; }
      // ==================== DEV CONSOLE ====================
function DevConsole({ onClose, reports }: { onClose: () => void; reports: Report[] }) {
  const [ddgMode, setDdgMode] = useState(() => localStorage.getItem("xena_ddg_mode") || "ddg3");
  const [ddgQuery, setDdgQuery] = useState("youtube");
  const [ddgResult, setDdgResult] = useState<string | null>(null);

  const testDdg = (key: string) => {
    const o = DDG_OPTIONS[key]; if (!o) return;
    setDdgResult(`Testing: ${o.name}\nURL: ${o.url}${encodeURIComponent(ddgQuery)}\n\nOpened in new tab.`);
    window.open("/fetch/" + b64e(o.url + encodeURIComponent(ddgQuery)), "_blank");
  };
  const setDefault = (key: string) => { setDdgMode(key); localStorage.setItem("xena_ddg_mode", key); setDdgResult(`✅ Default DDG mode set to: ${DDG_OPTIONS[key].name}`); };

  return (
    <div className="w-full min-h-screen bg-[#060a18] text-white overflow-y-auto">
      <header className="bg-gradient-to-r from-[#0a1030] via-[#0d1540] to-[#0a1030] border-b border-[#1a2850] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs tracking-[0.2em] font-mono"><Cpu className="w-4 h-4" /> DEVELOPER CONSOLE</div>
            <button onClick={onClose} className="px-4 py-2 bg-[#1a2850]/50 border border-[#2a3870] rounded-lg text-blue-300 hover:text-white text-sm font-mono hover:bg-[#1a2850]/80 transition-all">✕ CLOSE</button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-10 h-10 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            <h1 className="text-5xl font-bold text-white">{getGreeting()} <span className="text-cyan-400">G</span></h1>
          </div>
          <p className="text-blue-300/50 font-mono text-sm">XENA Neural Engine v2.0 • Full System Access</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Bug Reports</p>
            <p className="text-4xl font-bold text-white">{reports.length}</p>
            <div className="flex gap-3 mt-2 text-[10px] font-mono"><span className="text-red-400/60">{reports.filter(r => r.kind === "bug").length} bugs</span><span className="text-cyan-400/60">{reports.filter(r => r.kind === "suggestion").length} suggestions</span></div>
          </div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Active Sessions</p>
            <p className="text-4xl font-bold text-white">3</p><p className="text-[10px] text-blue-300/40 font-mono mt-2">2 tabs • 1 admin</p>
          </div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">System Uptime</p>
            <p className="text-4xl font-bold text-white">{Math.floor(performance.now() / 1000 / 60)}m</p><p className="text-[10px] text-blue-300/40 font-mono mt-2">RV Engine • Active</p>
          </div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Memory Heap</p>
            <p className="text-4xl font-bold text-white">~64MB</p><p className="text-[10px] text-blue-300/40 font-mono mt-2">Stable • Normal load</p>
          </div>
        </div>

        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div><h2 className="text-lg font-bold text-white">DuckDuckGo Proxy Configuration</h2><p className="text-sm text-blue-300/50 font-mono">Test which DDG mode works, then set as default</p></div>
            <div className="ml-auto flex items-center gap-2">
              <input type="text" value={ddgQuery} onChange={e => setDdgQuery(e.target.value)} placeholder="Test query" className="px-3 py-2 bg-[#060a18] border border-[#1a2850] rounded-lg text-xs text-white w-40 outline-none focus:border-cyan-500/50" />
              <span className="text-blue-400/40 text-xs font-mono">default: <span className="text-cyan-400">{DDG_OPTIONS[ddgMode]?.name || "Lite"}</span></span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(DDG_OPTIONS).map(([k, o]) => (
              <div key={k} className={`bg-[#060a18] border rounded-lg p-4 transition-all ${ddgMode === k ? "border-cyan-500/50 ring-1 ring-cyan-500/20" : "border-[#1a2850] hover:border-cyan-700/30"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{o.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => testDdg(k)} className="text-[10px] px-3 py-1 bg-[#1a2850]/50 border border-[#2a3870] rounded text-blue-300 hover:text-white transition-all font-mono">Test</button>
                    <button onClick={() => setDefault(k)} className={`text-[10px] px-3 py-1 rounded transition-all font-mono ${ddgMode === k ? "bg-cyan-900/30 text-cyan-300 border border-cyan-700/30" : "bg-[#1a2850]/30 border border-[#1a2850] text-blue-300/60 hover:text-white"}`}>{ddgMode === k ? "✓ Default" : "Set Default"}</button>
                  </div>
                </div>
                <p className="text-xs text-blue-300/60 mb-1">{o.note}</p>
                <p className="text-[9px] text-blue-400/30 font-mono truncate">{o.url}your+search</p>
              </div>
            ))}
          </div>
          {ddgResult && <div className="mt-4 p-3 bg-[#060a18] border border-[#1a2850] rounded-lg"><p className="text-xs text-cyan-400 font-mono whitespace-pre-wrap">{ddgResult}</p></div>}
        </div>

        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4"><Bug className="w-5 h-5 text-red-400" /><div><h2 className="text-lg font-bold text-white">Bug Reports & Insights</h2><p className="text-sm text-blue-300/50 font-mono">{reports.length} total submissions</p></div></div>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-blue-300/30"><Bug className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm font-mono">No bug reports yet</p></div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {reports.map(rep => (
                <div key={rep.id} className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${rep.kind === "bug" ? "bg-red-500/20 text-red-300" : "bg-cyan-500/20 text-cyan-300"}`}>{rep.kind === "bug" ? "BUG" : "IDEA"}</span>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-white">{rep.title}</span>{rep.important && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}</div><p className="text-xs text-blue-300/60">{rep.details}</p>{rep.url && <p className="text-[10px] text-cyan-400/50 mt-1 font-mono truncate">{rep.url}</p>}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4"><Terminal className="w-5 h-5 text-cyan-400" /><h2 className="text-lg font-bold text-white">Known Issues & Fixes</h2></div>
          <div className="space-y-3">
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" /><div><p className="text-sm font-mono text-red-300">ERR_SW_FETCH</p><p className="text-xs text-blue-300/60 mt-1">Service Worker failed. Reload page or switch to Reverse Proxy mode.</p></div></div>
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0" /><div><p className="text-sm font-mono text-yellow-300">ERR_IFRAME_BLOCK</p><p className="text-xs text-blue-300/60 mt-1">X-Frame-Options blocked. XENA strips these headers automatically.</p></div></div>
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" /><div><p className="text-sm font-mono text-cyan-300">ERR_DDG_EMBED</p><p className="text-xs text-blue-300/60 mt-1">DDG refuses iframe. Try different DDG modes below or use Google/Bing.</p></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ADMIN CONSOLE ====================
function AdminConsole({ onClose, reports, onLogout }: { onClose: () => void; reports: Report[]; onLogout: () => void }) {
  const [announceMsg, setAnnounceMsg] = useState("");
  const toggleImportant = (id: string) => {
    const u = reports.map(r => r.id === id ? { ...r, important: !r.important } : r);
    localStorage.setItem("xena_reports", JSON.stringify(u));
    window.location.reload();
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0606] text-white overflow-y-auto">
      <header className="bg-gradient-to-r from-[#1a0808] via-[#2a1010] to-[#1a0808] border-b border-[#502020] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs tracking-[0.2em] font-mono"><Users className="w-4 h-4" /> ADMIN CONSOLE</div>
            <div className="flex gap-2">
              <button onClick={onLogout} className="px-4 py-2 bg-[#2a1414]/50 border border-[#502020] rounded-lg text-red-300 hover:text-white text-sm font-mono hover:bg-[#2a1414]/80 transition-all flex items-center gap-2"><LogOut className="w-3.5 h-3.5" /> Logout</button>
              <button onClick={onClose} className="px-4 py-2 bg-[#2a1414]/50 border border-[#502020] rounded-lg text-amber-300 hover:text-white text-sm font-mono hover:bg-[#2a1414]/80 transition-all">✕ CLOSE</button>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-1">Sup <span className="text-amber-400">G</span></h1>
          <p className="text-amber-300/50 font-mono text-sm">XENA Gateway Administration • Access Level: ADMIN</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5"><p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Bug Reports</p><p className="text-4xl font-bold text-white">{reports.length}</p><p className="text-[10px] text-amber-300/40 font-mono mt-2">{reports.filter(r => r.important).length} marked important</p></div>
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5"><p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Announcements</p><p className="text-4xl font-bold text-white">0</p><p className="text-[10px] text-amber-300/40 font-mono mt-2">active broadcasts</p></div>
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5"><p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Active Tabs</p><p className="text-4xl font-bold text-white">2</p><p className="text-[10px] text-amber-300/40 font-mono mt-2">browser sessions</p></div>
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5"><p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Gateway</p><p className="text-4xl font-bold text-emerald-400">●</p><p className="text-[10px] text-amber-300/40 font-mono mt-2">online · stable</p></div>
        </div>

        <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6"><Bug className="w-5 h-5 text-red-400" /><div><h2 className="text-lg font-bold text-white">Bug Reports</h2><p className="text-sm text-amber-300/50 font-mono">Click ★ to mark as important</p></div></div>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-amber-300/30"><Bug className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm font-mono">No bug reports yet</p></div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {reports.map(rep => (
                <div key={rep.id} className="border rounded-lg p-4 flex items-start gap-3 bg-[#060404] border-[#502020] hover:border-amber-700/50">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${rep.kind === "bug" ? "bg-red-500/20 text-red-300" : "bg-cyan-500/20 text-cyan-300"}`}>{rep.kind === "bug" ? "BUG" : "IDEA"}</span>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-white">{rep.title}</span>{rep.important && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}</div><p className="text-xs text-amber-300/60">{rep.details}</p>{rep.url && <p className="text-[10px] text-cyan-400/50 mt-1 font-mono truncate">{rep.url}</p>}</div>
                  <button onClick={() => toggleImportant(rep.id)} className="text-amber-400/60 hover:text-amber-300 text-lg shrink-0">★</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6"><Bell className="w-5 h-5 text-amber-400" /><div><h2 className="text-lg font-bold text-white">Send Announcement</h2><p className="text-sm text-amber-300/50 font-mono">Broadcast a message to all XENA users</p></div></div>
          <div className="space-y-3">
            <input type="text" value={announceMsg} onChange={e => setAnnounceMsg(e.target.value)} placeholder="Announcement message..." className="w-full h-10 rounded-lg border border-[#502020] bg-[#0a0606] px-4 text-sm text-white outline-none focus:border-amber-700/50 placeholder-amber-800/50" />
            <button onClick={() => { alert("Announcement broadcasted!"); setAnnounceMsg(""); }} className="w-full py-3 rounded-lg bg-amber-800/20 border border-amber-700/30 hover:bg-amber-800/40 text-amber-300 text-sm font-mono font-bold tracking-wider transition-all">📢 Broadcast Announcement</button>
          </div>
        </div>

        <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6"><RefreshCw className="w-5 h-5 text-red-400" /><div><h2 className="text-lg font-bold text-white">Gateway Controls</h2></div></div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => window.location.reload()} className="py-4 rounded-lg bg-red-900/20 border border-red-800/30 hover:bg-red-900/40 text-red-300 text-sm font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-3"><RefreshCw className="w-5 h-5" /> Restart Gateway</button>
            <button onClick={() => window.location.reload()} className="py-4 rounded-lg bg-amber-900/20 border border-amber-800/30 hover:bg-amber-900/40 text-amber-300 text-sm font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-3"><RefreshCw className="w-5 h-5" /> Reload Panel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== TIKTOK CLONE ====================
function TikTokClone({ onBack }: { onBack: () => void }) {
  const vref = useRef<(HTMLVideoElement | null)[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);

  const vids = [
    { id: '1', user: '@xena', desc: 'XENA Browser - Browse anything securely 🚀', music: 'original sound - XENA', avatar: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&auto=format', likes: '1.2K', comments: '89', shares: '45', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    { id: '2', user: '@sandbox', desc: 'Streaming through XENA proxy 🌐', music: 'Electronic Vibes', avatar: 'https://images.unsplash.com/photo-1531746790095-e5cb1579be01?w=100&auto=format', likes: '856', comments: '34', shares: '12', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    { id: '3', user: '@techguy', desc: 'This is how XENA loads TikTok 👀', music: 'original sound - techguy', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format', likes: '2.3K', comments: '156', shares: '78', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
    { id: '4', user: '@xena', desc: 'TikTok through XENA sandbox browser 🛡️', music: 'Chill Beats', avatar: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&auto=format', likes: '3.1K', comments: '203', shares: '95', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
  ];

  useEffect(() => {
    const f = feedRef.current; if (!f) return;
    const h = () => {
      const sc = f.scrollTop + innerHeight / 2;
      vref.current.forEach((v, i) => {
        if (!v) return;
        const r = v.getBoundingClientRect();
        const vc = r.top + r.height / 2;
        if (vc > innerHeight * 0.25 && vc < innerHeight * 0.75) { v.play().catch(() => { }); setPlaying(vids[i]?.id || null); } else { v.pause(); }
      });
    };
    f.addEventListener("scroll", h);
    setTimeout(h, 500);
    return () => f.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden flex flex-col">
      <div className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white text-xl">←</button>
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.74 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.8 15.43a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.74a8.29 8.29 0 004.77 1.49v-3.5a4.83 4.83 0 01-1.66-.04z"/></svg>
        </div>
        <button onClick={() => setMuted(!muted)} className="p-2 text-white/70 hover:text-white">{muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
      </div>
      <div ref={feedRef} className="flex-1 overflow-y-scroll snap-y snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {vids.map((v, i) => (
          <div key={v.id} className="snap-start h-screen w-full relative flex items-center justify-center bg-black">
            <video ref={el => { vref.current[i] = el; }} src={"/fetch/" + b64e(v.src)} loop muted={muted} playsInline className="w-full h-full object-cover absolute inset-0"
              onClick={() => { const vv = vref.current[i]; if (vv) { if (vv.paused) { vv.play(); setPlaying(v.id); } else { vv.pause(); setPlaying(null); } } }} />
            <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden"><img src={v.avatar} className="w-full h-full object-cover" alt="" /></div>
              <button className="flex flex-col items-center gap-1 text-white"><Heart className="w-7 h-7 drop-shadow-lg" fill="white" /><span className="text-xs font-bold drop-shadow-lg">{v.likes}</span></button>
              <button className="flex flex-col items-center gap-1 text-white"><MessageCircle className="w-7 h-7 drop-shadow-lg" fill="white" /><span className="text-xs font-bold drop-shadow-lg">{v.comments}</span></button>
              <button className="flex flex-col items-center gap-1 text-white"><Share2 className="w-7 h-7 drop-shadow-lg" /><span className="text-xs font-bold drop-shadow-lg">{v.shares}</span></button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/70 to-transparent z-10">
              <p className="font-bold text-sm mb-1">{v.user} <span className="font-normal text-white/60 text-xs">{v.user.replace('@', '')}</span></p>
              <p className="text-sm mb-2">{v.desc}</p>
              <div className="flex items-center gap-2 text-xs text-white/70">💿 {v.music}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
    // ==================== MAIN APP ====================
export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: "tab-1", title: "XENA Engine", url: "", proxyUrl: "" }]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [urlInput, setUrlInput] = useState("");
  const [proxyMode, setProxyMode] = useState(() => localStorage.getItem("xena_proxy_mode") || "rv");
  const [ddgMode, setDdgMode] = useState(() => localStorage.getItem("xena_ddg_mode") || "ddg3");
  const [shieldOn, setShieldOn] = useState(true);
  const [funFact, setFunFact] = useState(FUN_FACTS[0]);
  const [funFactIdx, setFunFactIdx] = useState(0);
  const [modal, setModal] = useState<"settings" | "report" | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const [aiMode, setAiMode] = useState<"chill" | "serious">(() => (localStorage.getItem("xena_ai_mode") as "chill" | "serious") || "chill");
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ sender: "ai", text: aiMode === "serious" ? "Greetings. I am XENA. How can I assist you?" : "cheese", timestamp: new Date().toLocaleTimeString() }]);
  const [cloakOn, setCloakOn] = useState(() => localStorage.getItem("xena_cloak") === "true");
  const [escKey, setEscKey] = useState(() => localStorage.getItem("xena_escape_key") || "Escape");
  const [escUrl, setEscUrl] = useState(() => localStorage.getItem("xena_escape_url") || "https://classroom.google.com");
  const [time, setTime] = useState("");
  const [ping, setPing] = useState(25);
  const [reports, setReports] = useState<Report[]>(() => { try { const r = localStorage.getItem("xena_reports"); return r ? JSON.parse(r) : []; } catch { return []; } });
  const [reportForm, setReportForm] = useState({ kind: "bug", title: "", url: "", details: "" });
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => { try { const r = localStorage.getItem("xena_shortcuts"); return r ? JSON.parse(r) : []; } catch { return []; } });
  const [showAddShortcut, setShowAddShortcut] = useState(false);
  const [newShortcut, setNewShortcut] = useState({ name: "", url: "" });
  const [searchHistory, setSearchHistory] = useState<any[]>(() => { try { const r = localStorage.getItem("xena_search_history"); return r ? JSON.parse(r) : []; } catch { return []; } });
  const [devUnlocked, setDevUnlocked] = useState(sessionStorage.getItem("xena_dev") === "true");
  const [adminUnlocked, setAdminUnlocked] = useState(sessionStorage.getItem("xena_admin") === "true");
  const [showTikTok, setShowTikTok] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "history">("general");

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { const i = setInterval(() => setFunFactIdx(p => (p + 1) % FUN_FACTS.length), 12000); return () => clearInterval(i); }, []);
  useEffect(() => { setFunFact(FUN_FACTS[funFactIdx]); }, [funFactIdx]);

  useEffect(() => {
    localStorage.setItem("xena_cloak", String(cloakOn));
    if (cloakOn) { document.title = "Google Classroom"; let l: any = document.querySelector("link[rel*='icon']"); if (!l) { l = document.createElement("link"); l.type = "image/x-icon"; l.rel = "shortcut icon"; document.head.appendChild(l); } l.href = "https://ssl.gstatic.com/classroom/favicon.png"; } else { document.title = "XENA Browser"; }
  }, [cloakOn]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === escKey) window.location.href = escUrl; };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [escKey, escUrl]);

  useEffect(() => {
    const u = () => { setTime(new Date().toLocaleTimeString("en-US", { hour12: true })); setPing(Math.floor(Math.random() * 16) + 12); };
    u(); const i = setInterval(u, 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => { setUrlInput(activeTab.url); }, [activeTabId, activeTab.url]);
  useEffect(() => { if ('serviceWorker' in navigator && proxyMode === 'sw') { navigator.serviceWorker.register('/xena-sw.js').catch(() => { }); } }, [proxyMode]);

  const checkAccessCode = async (code: string) => {
    try {
      const r = await fetch("/api/auth/validate-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await r.json();
      if (d.valid && d.role === "developer") { setDevUnlocked(true); sessionStorage.setItem("xena_dev", "true"); return true; }
      if (d.valid && d.role === "admin") { setAdminUnlocked(true); sessionStorage.setItem("xena_admin", "true"); return true; }
      return false;
    } catch { return false; }
  };

  const createTab = (raw = "") => {
    const id = `tab-${Date.now()}`;
    let tu = "", tp = "";
    if (raw) {
      const fu = raw.startsWith("http") ? raw : isUrl(raw) ? `https://${raw}` : `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(raw)}`;
      tu = fu;
      tp = fu.startsWith("/") || fu.startsWith("http://localhost") ? fu : getProxyUrl(fu, proxyMode);
    }
    setTabs([...tabs, { id, title: tu ? getDomain(tu) : "XENA Engine", url: tu, proxyUrl: tp }]);
    setActiveTabId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const f = tabs.filter(t => t.id !== id);
    setTabs(f);
    if (activeTabId === id) setActiveTabId(f[f.length - 1].id);
  };

  const go = (input: string) => {
    if (!input.trim()) return;
    const fu = input.startsWith("http") ? input : isUrl(input) ? `https://${input}` : `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(input)}`;
    const pp = fu.startsWith("/") || fu.startsWith("http://localhost") ? fu : getProxyUrl(fu, proxyMode);

    if (!input.startsWith("/") && !input.startsWith("http://localhost")) {
      const ts = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const item = { id: `s-${Date.now()}`, query: input, engine: "DDG", timestamp: ts };
      setSearchHistory(prev => { const n = [item, ...prev].slice(0, 50); localStorage.setItem("xena_search_history", JSON.stringify(n)); return n; });
    }

    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, title: getDomain(fu), url: fu, proxyUrl: pp } : t));
  };

  const refresh = () => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; };

  const sendMsg = async () => {
    const txt = chatInput.trim();
    if (!txt || aiLoad) return;
    const userMsg: ChatMessage = { sender: "user", text: txt, timestamp: new Date().toLocaleTimeString() };
    setMsgs(prev => [...prev, userMsg]);
    setChatInput("");
    setAiLoad(true);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs.map(m => ({ role: m.sender, content: m.text })).concat([{ role: "user", content: txt }]), mode: aiMode })
      });
      const d = await r.json();
      const rt = d.response || (aiMode === "serious" ? "I'm not sure how to respond." : "cheese");
      setMsgs(prev => [...prev, { sender: "ai", text: rt, timestamp: new Date().toLocaleTimeString() }]);
    } catch { setMsgs(prev => [...prev, { sender: "ai", text: "cheese", timestamp: new Date().toLocaleTimeString() }]); }
    finally { setAiLoad(false); }
  };

  const toggleAIMode = () => {
    const nm = aiMode === "chill" ? "serious" : "chill";
    setAiMode(nm);
    localStorage.setItem("xena_ai_mode", nm);
    if (msgs.length === 1 && msgs[0].sender === "ai") setMsgs([{ ...msgs[0], text: nm === "serious" ? "Greetings. I am XENA. How can I assist you?" : "cheese" }]);
  };

  const submitReport = () => {
    if (!reportForm.title || !reportForm.details) { alert("Fill in title and details"); return; }
    const item: Report = { id: `rep-${Date.now()}`, ...reportForm };
    const next = [item, ...reports];
    setReports(next);
    localStorage.setItem("xena_reports", JSON.stringify(next));
    setReportForm({ kind: "bug", title: "", url: "", details: "" });
    alert("Report submitted!");
    setModal(null);
  };

  const addShortcut = () => {
    if (!newShortcut.name || !newShortcut.url) return;
    let url = newShortcut.url;
    if (!url.startsWith("http")) url = "https://" + url;
    const item: Shortcut = { id: `sc-${Date.now()}`, name: newShortcut.name, url, icon: url.charAt(8).toUpperCase() };
    setShortcuts([...shortcuts, item]);
    setNewShortcut({ name: "", url: "" });
    setShowAddShortcut(false);
    localStorage.setItem("xena_shortcuts", JSON.stringify([...shortcuts, item]));
  };

  const openAboutBlank = () => {
    try {
      const w = window.open('about:blank', '_blank');
      if (w) {
        w.document.write('<html style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><head><title>Google Classroom</title></head><body style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><iframe src="' + window.location.origin + '/" style="position:fixed;top:0;left:0;bottom:0;right:0;width:100%;height:100%;border:none;margin:0;padding:0;overflow:hidden;z-index:999999;"></iframe></body></html>');
        w.document.close();
      } else alert("Popup blocked!");
    } catch { }
  };

  const openBlobUrl = () => {
    try {
      const h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Google Classroom</title><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;}iframe{width:100%;height:100%;border:none;position:fixed;top:0;left:0;bottom:0;right:0;}</style></head><body><iframe src="' + window.location.origin + '/"></iframe></body></html>';
      const b = new Blob([h], { type: "text/html" });
      const u = URL.createObjectURL(b);
      window.open(u, "_blank");
    } catch { }
  };

  const logoutDev = () => { setDevUnlocked(false); sessionStorage.removeItem("xena_dev"); };
  const logoutAdmin = () => { setAdminUnlocked(false); sessionStorage.removeItem("xena_admin"); };

  // ===== FULL-PAGE ROUTES =====
  if (window.location.pathname === "/dev-console" && devUnlocked)
    return <DevConsole onClose={() => { window.history.pushState({}, "", "/"); logoutDev(); }} reports={reports} />;

  if (window.location.pathname === "/admin-console" && adminUnlocked)
    return <AdminConsole onClose={() => { window.history.pushState({}, "", "/"); logoutAdmin(); }} reports={reports} onLogout={() => { logoutAdmin(); window.history.pushState({}, "", "/"); }} />;

  if (showTikTok || window.location.pathname === "/tiktok")
    return <TikTokClone onBack={() => { setShowTikTok(false); window.history.pushState({}, "", "/"); }} />;

  // ===== MAIN BROWSER UI =====
  return (
    <div className="w-full h-screen flex flex-col bg-black text-white overflow-hidden select-none font-sans">
      {/* TOP BAR */}
      <header className="flex items-center gap-2 px-3 h-14 bg-black border-b border-[#111] relative z-20 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={goBack} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
          <button onClick={goForward} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><ArrowRight className="w-4 h-4" /></button>
          <button onClick={refresh} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><RotateCw className="w-4 h-4" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); go(urlInput); }} className="flex-1 flex max-w-4xl mx-3 rounded-lg border border-[#1a1a1a] bg-black overflow-hidden focus-within:border-zinc-500">
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="Search or enter URL..."
            spellCheck={false}
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none text-white placeholder-zinc-600"
          />
        </form>
      </header>

      {/* TABS BAR + ACTIONS */}
      <section className="flex items-end justify-between px-3 bg-black border-b border-[#111] shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-end gap-1 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const ia = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-2 px-3 h-8 rounded-t-lg border-t border-x cursor-pointer min-w-[120px] max-w-[170px] ${ia ? "bg-black border-x border-zinc-800 border-t-zinc-400 text-white" : "bg-zinc-950/70 border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                <Globe className={`w-3.5 h-3.5 shrink-0 ${ia ? "text-zinc-300" : "text-zinc-600"}`} />
                <span className="flex-1 text-xs truncate max-w-[100px] font-medium">{tab.title}</span>
                <button onClick={e => closeTab(tab.id, e)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-600 opacity-0 group-hover:opacity-100"><X className="w-2.5 h-2.5" /></button>
              </div>
            );
          })}
          <button onClick={() => createTab()} className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-800 text-zinc-600 hover:text-white hover:border-zinc-500 mb-0.5"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-1.5 mb-0.5 shrink-0 pl-4">
          <button onClick={() => setProxyMode(prev => {
            const modes = ["rv", "sw", "bss", "xt"];
            const idx = modes.indexOf(prev);
            const next = modes[(idx + 1) % modes.length];
            localStorage.setItem("xena_proxy_mode", next);
            return next;
          })} className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border text-[10px] font-mono font-medium bg-white/5 text-white border-zinc-700">
            <Shield className="w-3.5 h-3.5" /> {proxyMode.toUpperCase()}
          </button>
          <button onClick={() => setModal("report")} className="flex items-center justify-center w-7 h-7 rounded-md border border-zinc-800 bg-black text-red-400 hover:text-red-300 text-sm transition-all" title="Bug Report">🐞</button>
          <button onClick={() => setModal("settings")} className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-800 bg-black text-zinc-400 hover:text-white"><Settings className="w-4 h-4" /></button>
          <button onClick={() => { if (devUnlocked) { window.history.pushState({}, "", "/dev-console"); } else { openAboutBlank(); } }} className="flex items-center gap-1 px-2.5 h-7 rounded-md border border-zinc-800 bg-black text-zinc-400 hover:text-white text-[10px] font-mono font-medium">
            {devUnlocked ? "DEV" : adminUnlocked ? "ADMIN" : "🔮"}
          </button>
          <button onClick={() => setAiOpen(!aiOpen)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 p-[1.5px] hover:scale-105 shadow-[0_0_10px_rgba(168,85,247,0.45)]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] text-white">🔮</div>
          </button>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative overflow-hidden">
        {!activeTab.url ? (
          /* HOME PAGE WITH STARS + FUN FACT */
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
            <StarryBg />
            <div className="relative z-10 text-center px-6">
              <div className="flex items-center gap-3 justify-center mb-4">
                <svg className="w-8 h-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <h1 className="text-4xl font-bold text-white">{getGreeting()} G</h1>
            </div>
            <p className="text-zinc-500 mt-2 text-sm font-mono relative z-10">{time} • {ping}ms ping</p>
            <div className="relative z-10 mt-8 max-w-md mx-auto">
              <p className="text-zinc-600 text-xs font-mono italic text-center">"{funFact}"</p>
            </div>
            {shortcuts.length > 0 && (
              <div className="relative z-10 mt-8 flex gap-4">
                {shortcuts.slice(0, 6).map(sc => (
                  <button key={sc.id} onClick={() => go(sc.url)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-zinc-900/50 transition-all">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
                      {sc.icon || sc.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[60px]">{sc.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* PROXY IFRAME */
          <iframe
            ref={iframeRef}
            src={activeTab.proxyUrl}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            style={{ backgroundColor: "#fff" }}
            title={activeTab.title}
          />
        )}
      </main>

      {/* SETTINGS MODAL */}
      {modal === "settings" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setModal(null)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Settings Tabs */}
            <div className="flex gap-2 mb-4 border-b border-zinc-800 pb-2">
              <button onClick={() => setSettingsTab("general")} className={`text-xs px-3 py-1.5 rounded-md font-mono ${settingsTab === "general" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>General</button>
              <button onClick={() => setSettingsTab("history")} className={`text-xs px-3 py-1.5 rounded-md font-mono ${settingsTab === "history" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>History</button>
            </div>

            {settingsTab === "general" && (
              <div className="space-y-5">
                {/* Proxy Mode */}
                <div>
                  <label className="text-xs text-zinc-400 font-mono block mb-2">Proxy Mode</label>
                  <div className="flex gap-2">
                    {["rv", "sw", "bss", "xt"].map(m => (
                      <button key={m} onClick={() => { setProxyMode(m); localStorage.setItem("xena_proxy_mode", m); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-all ${proxyMode === m ? "bg-zinc-800 text-white border-zinc-600" : "bg-black text-zinc-500 border-zinc-800 hover:text-zinc-300"}`}>
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1 font-mono">{PROXY_MODES.find(m => m.id === proxyMode)?.fullName}</p>
                </div>

                {/* DDG Mode */}
                <div>
                  <label className="text-xs text-zinc-400 font-mono block mb-2">Search Engine Mode</label>
                  <p className="text-[10px] text-zinc-600 mb-2 font-mono">DDG is annoying and doesn't always work so try another mode. Just Know all of them have an old layout that I can't control. MB</p>
                  <select value={ddgMode} onChange={e => { setDdgMode(e.target.value); localStorage.setItem("xena_ddg_mode", e.target.value); }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none">
                    {Object.entries(DDG_OPTIONS).map(([k, o]) => (
                      <option key={k} value={k}>{o.name}</option>
                    ))}
                  </select>
                </div>

                {/* Cloak */}
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-white">Cloak Tab</p><p className="text-[10px] text-zinc-500">Changes title/favicon to Google Classroom</p></div>
                  <button onClick={() => setCloakOn(!cloakOn)} className={`w-10 h-5 rounded-full transition-all ${cloakOn ? "bg-cyan-600" : "bg-zinc-800"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-all ${cloakOn ? "ml-5" : "ml-0.5"}`} />
                  </button>
                </div>

                {/* Escape Key */}
                <div>
                  <label className="text-xs text-zinc-400 font-mono block mb-2">Escape Key</label>
                  <select value={escKey} onChange={e => { setEscKey(e.target.value); localStorage.setItem("xena_escape_key", e.target.value); }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none">
                    <option value="Escape">Escape</option><option value="`">Backtick (`)</option><option value="F1">F1</option>
                  </select>
                  <input type="text" value={escUrl} onChange={e => { setEscUrl(e.target.value); localStorage.setItem("xena_escape_url", e.target.value); }}
                    placeholder="https://classroom.google.com" className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                </div>

                {/* Shortcuts */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-zinc-400 font-mono">Shortcuts</label>
                    <button onClick={() => setShowAddShortcut(!showAddShortcut)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono">+ Add</button>
                  </div>
                  {showAddShortcut && (
                    <div className="flex gap-2 mb-2">
                      <input type="text" value={newShortcut.name} onChange={e => setNewShortcut({ ...newShortcut, name: e.target.value })} placeholder="Name" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                      <input type="text" value={newShortcut.url} onChange={e => setNewShortcut({ ...newShortcut, url: e.target.value })} placeholder="URL" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                      <button onClick={addShortcut} className="px-3 py-2 bg-cyan-900/30 border border-cyan-700/30 rounded-lg text-cyan-300 text-xs">Add</button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {shortcuts.map(sc => (
                      <div key={sc.id} className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md">
                        <span className="text-[10px] text-zinc-300 font-mono">{sc.name}</span>
                        <button onClick={() => { const ns = shortcuts.filter(s => s.id !== sc.id); setShortcuts(ns); localStorage.setItem("xena_shortcuts", JSON.stringify(ns)); }} className="text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* About Blank */}
                <div className="flex gap-2">
                  <button onClick={openAboutBlank} className="flex-1 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-mono">Open about:blank</button>
                  <button onClick={openBlobUrl} className="flex-1 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-mono">Open Blob</button>
                </div>
              </div>
            )}

            {settingsTab === "history" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-400 font-mono">Search History ({searchHistory.length})</p>
                  <button onClick={() => { setSearchHistory([]); localStorage.removeItem("xena_search_history"); }} className="text-[10px] text-red-400 font-mono hover:text-red-300">Clear All</button>
                </div>
                {searchHistory.length === 0 ? (
                  <p className="text-center text-zinc-600 text-xs font-mono py-8">No history yet</p>
                ) : (
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {searchHistory.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 rounded-lg">
                        <button onClick={() => go(item.query)} className="text-xs text-zinc-300 hover:text-white truncate">{item.query}</button>
                        <span className="text-[9px] text-zinc-600 font-mono shrink-0 ml-2">{item.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {modal === "report" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setModal(null)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Report a Bug</h2>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <select value={reportForm.kind} onChange={e => setReportForm({ ...reportForm, kind: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none">
                <option value="bug">Bug Report</option>
                <option value="suggestion">Suggestion</option>
              </select>
              <input type="text" value={reportForm.title} onChange={e => setReportForm({ ...reportForm, title: e.target.value })} placeholder="Title" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none" />
              <input type="text" value={reportForm.url} onChange={e => setReportForm({ ...reportForm, url: e.target.value })} placeholder="URL (optional)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none" />
              <textarea value={reportForm.details} onChange={e => setReportForm({ ...reportForm, details: e.target.value })} placeholder="Details" rows={4} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none" />
              <button onClick={submitReport} className="w-full py-3 rounded-lg bg-red-900/20 border border-red-800/30 hover:bg-red-900/40 text-red-300 text-sm font-mono font-bold tracking-wider transition-all">Submit Report</button>
            </div>
          </div>
        </div>
      )}

      {/* AI CHAT PANEL */}
      {aiOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden" style={{ maxHeight: "70vh" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 flex items-center justify-center text-[8px]">🔮</div>
              <span className="text-sm font-semibold text-white">XENA AI</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${aiMode === "serious" ? "bg-cyan-900/30 text-cyan-300" : "bg-pink-900/30 text-pink-300"}`}>{aiMode === "serious" ? "SRS" : "CHILL"}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleAIMode} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded font-mono">Toggle</button>
              <button onClick={() => setAiOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: "50vh" }}>
            {msgs.map((msg, i) => (
              <div key={i} className={`mb-3 ${msg.sender === "user" ? "text-right" : ""}`}>
                <div className={`inline-block max-w-[80%] px-3 py-2 rounded-2xl text-xs ${msg.sender === "user" ? "bg-zinc-800 text-white rounded-br-md" : "bg-zinc-900 text-zinc-300 rounded-bl-md"}`}>
                  {msg.text}
                </div>
                <p className="text-[8px] text-zinc-600 mt-0.5">{msg.timestamp}</p>
              </div>
            ))}
            {aiLoad && <div className="text-center text-zinc-500 text-xs font-mono">thinking...</div>}
            <div ref={React.createRef()} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-800">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              placeholder="Ask XENA..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-zinc-600" />
            <button onClick={sendMsg} disabled={aiLoad} className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 flex items-center justify-center disabled:opacity-50">
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ACCESS CODE MODAL for Dev/Admin */}
      {!devUnlocked && !adminUnlocked && (window.location.pathname === "/dev-console" || window.location.pathname === "/admin-console") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm mx-4">
            <h2 className="text-xl font-bold text-white mb-2">Access Code Required</h2>
            <p className="text-xs text-zinc-500 mb-6 font-mono">Enter your access code to continue</p>
            <input type="password" value={""} onChange={e => checkAccessCode(e.target.value)}
              placeholder="Enter access code..." className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-zinc-600 mb-4" autoFocus />
            <button onClick={() => { window.history.pushState({}, "", "/"); }} className="w-full py-2 text-center text-xs text-zinc-500 hover:text-zinc-300 font-mono">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
