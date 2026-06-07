import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send,
  Activity, ExternalLink, Shield, Bug, ChevronRight,
  Cpu, Terminal, Users, Bell, RefreshCw, Search,
  Heart, MessageCircle, Share2, Music, Home, Star
} from "lucide-react";

// ==================== ENCODING ====================
function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c==="+"?"-":c==="/"?"_":""); } catch { return encodeURIComponent(v); }
}
function b64d(v: string): string {
  try { let t=v.replace(/-/g,"+").replace(/_/g,"/"); while(t.length%4) t+="="; return decodeURIComponent(escape(atob(t))); } catch { return v; }
}

// ==================== PROXY MODES ====================
const PROXY_MODES = [
  { id:"sw", name:"Service Worker Proxy", badge:"SW ENGINE", latency:"~12ms", default: true },
  { id:"rev", name:"Reverse Proxy", badge:"REVERSE", latency:"~18ms", default: false },
  { id:"bin", name:"Binary Stream Sandbox", badge:"BINARY OS", latency:"~24ms", default: false }
];

// ==================== 5 DDG SOLUTIONS ====================
const DDG_OPTIONS: Record<string, {name:string, url:string, note:string}> = {
  ddg1: { name: "DuckDuckGo Standard", url: "https://duckduckgo.com/?q=", note: "Standard DDG — may refuse iframe embedding" },
  ddg2: { name: "DuckDuckGo HTML (No JS)", url: "https://html.duckduckgo.com/html/?q=", note: "Lightweight HTML version, works in proxies" },
  ddg3: { name: "DuckDuckGo Lite", url: "https://lite.duckduckgo.com/lite/?q=", note: "Minimal version, best for proxied iframes" },
  ddg4: { name: "Startpage (DDG alt)", url: "https://www.startpage.com/sp/search?query=", note: "Privacy-focused alternative search engine" },
  ddg5: { name: "Bing Fallback", url: "https://www.bing.com/search?q=", note: "Bing search engine as fallback" }
};

// ==================== URL HELPERS ====================
function getProxyUrl(urlStr: string, mode: string): string {
  if (!urlStr) return "";
  if (urlStr.startsWith("/") || urlStr.startsWith("http://localhost") || urlStr.startsWith("http://127.0.0.1")) return urlStr;
  const ytId = getYtId(urlStr);
  if (ytId) return `/view?v=${encodeURIComponent(ytId)}`;
  return `/${mode}/${b64e(urlStr)}`;
}

function isUrl(t: string): boolean {
  if (!t.trim()) return false;
  if (/^https?:\/\//i.test(t)) return true;
  return /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t);
}

function getYtId(u: string): string|null {
  try {
    const url = new URL(u);
    if (url.hostname.includes("youtube.com")||url.hostname.includes("youtu.be")) {
      let v=url.searchParams.get("v");
      if(!v&&url.hostname.includes("youtu.be")) v=url.pathname.replace(/^\//,"").split("?")[0];
      return v;
    }
  } catch { const m=u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/i); if(m) return m[1]; }
  return null;
}

function searchUrl(e:string, q:string):string {
  const enc=encodeURIComponent(q);
  const ddgMode = localStorage.getItem("xena_ddg_mode") || "ddg3";
  switch(e){
    case"google": return `https://www.google.com/search?q=${enc}`;
    case"bing": return `https://www.bing.com/search?q=${enc}`;
    default: return (DDG_OPTIONS[ddgMode]?.url || "https://lite.duckduckgo.com/lite/?q=") + enc;
  }
}

function normalizeInput(e:string,input:string):string {
  const r=input.trim();
  if(!r) return searchUrl(e,"");
  if(/^https?:\/\//i.test(r)) return r;
  if(isUrl(r)) return `https://${r}`;
  return searchUrl(e,r);
}

function getDomain(u:string):string { try { return new URL(u).hostname.replace("www.",""); } catch { return "Web"; } }

// ==================== FUN FACTS ====================
const funFacts = [
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than a year on Venus.",
  "Bananas are berries, but strawberries aren't.",
  "Honey never spoils. Archaeologists found 3000-year-old honey still edible.",
  "The Eiffel Tower grows 6 inches taller in summer.",
  "A group of flamingos is called a 'flamboyance'.",
  "Wombat poop is cube-shaped so it doesn't roll away.",
  "There are more trees on Earth than stars in the Milky Way.",
  "The human nose can remember 50,000 different scents.",
  "Hot water freezes faster than cold water (Mpemba effect).",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The shortest war in history was 38 minutes.",
  "A day on Pluto lasts 6.4 Earth days.",
  "Cows have best friends and get stressed when separated.",
  "The universe's color is beige, officially named 'Cosmic Latte'."
];

// ==================== TYPES ====================
interface Tab{id:string;title:string;url:string;proxyUrl:string;}
interface ChatMessage{sender:"user"|"ai";text:string;timestamp:string;}
interface Report{id:string;kind:"bug"|"suggestion";title:string;url?:string;details:string;important?:boolean;}
interface Shortcut{id:string;name:string;url:string;icon:string;}
interface SearchHistoryItem{id:string;query:string;engine:string;timestamp:string;}
interface AIHistoryItem{id:string;message:string;response:string;mode:string;timestamp:string;}

// ==================== STAR BG ====================
function StarryBg() {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d"); if(!ctx) return;
    let anim:number;
    const resize=()=>{c.width=c.parentElement?.clientWidth||window.innerWidth;c.height=c.parentElement?.clientHeight||window.innerHeight;};
    resize(); window.addEventListener("resize",resize);
    const stars=Array.from({length:80},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.5+0.3,a:Math.random(),s:Math.random()*0.015+0.003,d:Math.random()>0.5?1:-1}));
    const draw=()=>{
      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle="#fff";
      stars.forEach(st=>{st.a+=st.s*st.d;if(st.a>=1){st.a=1;st.d=-1}else if(st.a<=0.1){st.a=0.1;st.d=1}ctx.globalAlpha=st.a;ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill();});
      anim=requestAnimationFrame(draw);
    };
    draw();
    return()=>{window.removeEventListener("resize",resize);cancelAnimationFrame(anim);};
  },[]);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none z-0" />;
}

// ==================== GET GREETING ====================
function getGreeting(): string {
  const h = new Date().getHours();
  if(h<12) return "Good morning";
  if(h<17) return "Good afternoon";
  return "Good evening";
}

// ==================== TIKTOK CLONE ====================
function TikTokClone({ onBack }: { onBack: () => void }) {
  const videoRefs = useRef<(HTMLVideoElement|null)[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  
  const videos = [
    { id: '1', user: '@xena', desc: 'XENA Browser - Browse anything securely 🚀', music: 'original sound - XENA', avatar: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&auto=format', likes: '1.2K', comments: '89', shares: '45', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    { id: '2', user: '@sandbox', desc: 'Streaming through XENA proxy 🌐', music: 'Electronic Vibes', avatar: 'https://images.unsplash.com/photo-1531746790095-e5cb1579be01?w=100&auto=format', likes: '856', comments: '34', shares: '12', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    { id: '3', user: '@techguy', desc: 'This is how XENA loads TikTok 👀', music: 'original sound - techguy', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format', likes: '2.3K', comments: '156', shares: '78', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
    { id: '4', user: '@xena', desc: 'TikTok through XENA sandbox browser 🛡️', music: 'Chill Beats', avatar: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&auto=format', likes: '3.1K', comments: '203', shares: '95', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
  ];

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const handleScroll = () => {
      const scrollCenter = feed.scrollTop + window.innerHeight / 2;
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        const rect = v.getBoundingClientRect();
        const videoCenter = rect.top + rect.height / 2;
        if (videoCenter > window.innerHeight * 0.25 && videoCenter < window.innerHeight * 0.75) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    };
    feed.addEventListener('scroll', handleScroll);
    setTimeout(() => handleScroll(), 500);
    return () => feed.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden flex flex-col relative">
      <div className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white text-xl">←</button>
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.74 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.8 15.43a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.74a8.29 8.29 0 004.77 1.49v-3.5a4.83 4.83 0 01-1.66-.04z"/></svg>
        </div>
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 text-white/70"/>
          <button className="text-sm font-bold px-4 py-1.5 rounded-full border border-white/20 text-white">Log in</button>
        </div>
      </div>

      <div ref={feedRef} className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-none" style={{scrollbarWidth:'none'}}>
        {videos.map((video, i) => (
          <div key={video.id} className="snap-start h-screen w-full relative flex items-center justify-center bg-black">
            <video
              ref={el => { videoRefs.current[i] = el; }}
              src={"/fetch/" + b64e(video.src)}
              loop muted playsInline
              className="w-full h-full object-cover absolute inset-0"
              onClick={() => { const v = videoRefs.current[i]; if (v) { if (v.paused) v.play(); else v.pause(); } }}
            />
            <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
                <img src={video.avatar} className="w-full h-full object-cover" alt=""/>
              </div>
              <button className="flex flex-col items-center gap-1 text-white"><Heart className="w-7 h-7 drop-shadow-lg" fill="white"/><span className="text-xs font-bold drop-shadow-lg">{video.likes}</span></button>
              <button className="flex flex-col items-center gap-1 text-white"><MessageCircle className="w-7 h-7 drop-shadow-lg" fill="white"/><span className="text-xs font-bold drop-shadow-lg">{video.comments}</span></button>
              <button className="flex flex-col items-center gap-1 text-white"><Share2 className="w-7 h-7 drop-shadow-lg"/><span className="text-xs font-bold drop-shadow-lg">{video.shares}</span></button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/70 to-transparent z-10">
              <p className="font-bold text-sm mb-1">{video.user} <span className="font-normal text-white/60 text-xs">{video.user.replace('@','')}</span></p>
              <p className="text-sm mb-2">{video.desc}</p>
              <div className="flex items-center gap-2 text-xs text-white/70"><Music className="w-3.5 h-3.5"/> {video.music}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#121212] border-t border-white/10 flex items-center justify-around z-40">
        <Home className="w-6 h-6 text-white" fill="white"/>
        <Search className="w-6 h-6 text-white/50"/>
        <div className="relative -top-3"><div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl">+</div></div>
        <MessageCircle className="w-6 h-6 text-white/50"/>
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">👤</div>
      </div>
    </div>
  );
}

// ==================== FULL-PAGE DEVELOPER CONSOLE ====================
function DevConsole({ onClose, reports }: { onClose: () => void, reports: Report[] }) {
  const [ddgMode, setDdgMode] = useState(() => localStorage.getItem("xena_ddg_mode") || "ddg3");
  const [ddgTestUrl, setDdgTestUrl] = useState("youtube");

  const testDdg = (key: string) => {
    const opt = DDG_OPTIONS[key];
    if (!opt) return;
    window.open("/fetch/" + b64e(opt.url + encodeURIComponent(ddgTestUrl)), "_blank");
  };

  const setDefault = (key: string) => {
    setDdgMode(key);
    localStorage.setItem("xena_ddg_mode", key);
  };

  return (
    <div className="w-full min-h-screen bg-[#060a18] text-white overflow-y-auto">
      <header className="bg-gradient-to-r from-[#0a1030] via-[#0d1540] to-[#0a1030] border-b border-[#1a2850] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs tracking-[0.2em] font-mono">
              <Cpu className="w-4 h-4"/> DEVELOPER CONSOLE
            </div>
            <button onClick={onClose} className="px-4 py-2 bg-[#1a2850]/50 border border-[#2a3870] rounded-lg text-blue-300 hover:text-white text-sm font-mono hover:bg-[#1a2850]/80 transition-all">✕ CLOSE</button>
          </div>
          <h1 className="text-5xl font-bold text-white mb-1">{getGreeting()} <span className="text-cyan-400">G</span></h1>
          <p className="text-blue-300/50 font-mono text-sm">XENA Neural Engine v2.0 • Full System Access</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Bug Reports</p>
            <p className="text-4xl font-bold text-white">{reports.length}</p>
            <div className="flex gap-3 mt-2 text-[10px] font-mono"><span className="text-red-400/60">{reports.filter(r=>r.kind==="bug").length} bugs</span><span className="text-cyan-400/60">{reports.filter(r=>r.kind==="suggestion").length} suggestions</span></div>
          </div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Active Sessions</p>
            <p className="text-4xl font-bold text-white">3</p>
            <p className="text-[10px] text-blue-300/40 font-mono mt-2">2 browser tabs</p>
          </div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">System Uptime</p>
            <p className="text-4xl font-bold text-white">{Math.floor(performance.now()/1000/60)}m</p>
            <p className="text-[10px] text-blue-300/40 font-mono mt-2">SW Engine • Active</p>
          </div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Memory Heap</p>
            <p className="text-4xl font-bold text-white">~64MB</p>
            <p className="text-[10px] text-blue-300/40 font-mono mt-2">Stable</p>
          </div>
        </div>

        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="w-5 h-5 text-cyan-400"/>
            <div>
              <h2 className="text-lg font-bold text-white">DuckDuckGo Proxy Configuration</h2>
              <p className="text-sm text-blue-300/50 font-mono">Test which DDG mode works, then set as default</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input type="text" value={ddgTestUrl} onChange={e=>setDdgTestUrl(e.target.value)} placeholder="Test query" className="px-3 py-2 bg-[#060a18] border border-[#1a2850] rounded-lg text-xs text-white w-40 outline-none focus:border-cyan-500/50"/>
              <span className="text-blue-400/40 text-xs font-mono">default: <span className="text-cyan-400">{DDG_OPTIONS[ddgMode]?.name || "Lite"}</span></span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(DDG_OPTIONS).map(([key, opt]) => (
              <div key={key} className={`bg-[#060a18] border rounded-lg p-4 transition-all ${ddgMode===key?'border-cyan-500/50 ring-1 ring-cyan-500/20':'border-[#1a2850] hover:border-cyan-700/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{opt.name}</span>
                  <div className="flex gap-2">
                    <button onClick={()=>testDdg(key)} className="text-[10px] px-3 py-1 bg-[#1a2850]/50 border border-[#2a3870] rounded text-blue-300 hover:text-white hover:bg-[#1a2850] transition-all font-mono">Test</button>
                    <button onClick={()=>setDefault(key)} className={`text-[10px] px-3 py-1 rounded transition-all font-mono ${ddgMode===key?'bg-cyan-900/30 text-cyan-300 border border-cyan-700/30':'bg-[#1a2850]/30 border border-[#1a2850] text-blue-300/60 hover:text-white'}`}>{ddgMode===key?'✓ Default':'Set'}</button>
                  </div>
                </div>
                <p className="text-xs text-blue-300/60 mb-1">{opt.note}</p>
                <p className="text-[9px] text-blue-400/30 font-mono truncate">{opt.url}your+search</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bug className="w-5 h-5 text-red-400"/>
            <div><h2 className="text-lg font-bold text-white">Bug Reports & Insights</h2><p className="text-sm text-blue-300/50 font-mono">{reports.length} total submissions</p></div>
          </div>
          {reports.length===0 ? (
            <div className="text-center py-12 text-blue-300/30"><Bug className="w-12 h-12 mx-auto mb-3 opacity-30"/><p className="text-sm font-mono">No bug reports yet</p></div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {reports.map(rep=>(
                <div key={rep.id} className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${rep.kind==="bug"?"bg-red-500/20 text-red-300":"bg-cyan-500/20 text-cyan-300"}`}>{rep.kind==="bug"?"BUG":"IDEA"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-white">{rep.title}</span>{rep.important&&<Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"/>}</div>
                    <p className="text-xs text-blue-300/60">{rep.details}</p>
                    {rep.url&&<p className="text-[10px] text-cyan-400/50 mt-1 font-mono truncate">{rep.url}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4"><Terminal className="w-5 h-5 text-cyan-400"/><h2 className="text-lg font-bold text-white">Known Issues & Fixes</h2></div>
          <div className="space-y-3">
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0"/><div><p className="text-sm font-mono text-red-300">ERR_SW_FETCH</p><p className="text-xs text-blue-300/60 mt-1">Service Worker failed to fetch. Reload page or switch to Reverse Proxy mode.</p></div></div>
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0"/><div><p className="text-sm font-mono text-yellow-300">ERR_IFRAME_BLOCK</p><p className="text-xs text-blue-300/60 mt-1">Site blocked by X-Frame-Options. Proxy strips these headers automatically.</p></div></div>
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0"/><div><p className="text-sm font-mono text-cyan-300">ERR_DDG_EMBED</p><p className="text-xs text-blue-300/60 mt-1">DuckDuckGo refuses iframe embedding. Try different DDG modes above.</p></div></div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#0a1030] via-[#0d1540] to-[#0a1030] border border-emerald-800/30 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center shrink-0"><Sparkles className="w-7 h-7 text-emerald-400"/></div>
            <div className="flex-1"><h2 className="text-xl font-bold text-white">HackerAI.co</h2><p className="text-sm text-blue-300/60 mt-1">AI penetration testing assistant integrated into XENA</p></div>
            <a href="https://hackerai.co" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-emerald-900/30 border border-emerald-700/30 rounded-lg text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-200 transition-all font-mono text-sm font-bold">Launch →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
export default function App() {
  const [tabs,setTabs]=useState<Tab[]>([{id:"tab-1",title:"XENA Engine",url:"",proxyUrl:""}]);
  const [activeTabId,setActiveTabId]=useState("tab-1");
  const [urlInput,setUrlInput]=useState("");
  const [startInput,setStartInput]=useState("");
  const [engine,setEngine]=useState(()=>localStorage.getItem("xena_engine")||"ddg");
  const [shieldOn,setShieldOn]=useState(true);
  const [proxyMode,setProxyMode]=useState(()=>localStorage.getItem("xena_proxy_mode")||"sw");
  const [factIndex,setFactIndex]=useState(Math.floor(Math.random()*funFacts.length));
  const [modal,setModal]=useState<"settings"|"report"|null>(null);
  const [aiOpen,setAiOpen]=useState(false);
  const [chatInput,setChatInput]=useState("");
  const [aiLoad,setAiLoad]=useState(false);
  const [aiMode,setAiMode]=useState<"chill"|"serious">(()=>(localStorage.getItem("xena_ai_mode") as "chill"|"serious")||"chill");
  const [msgs,setMsgs]=useState<ChatMessage[]>([{sender:"ai",text:aiMode==="serious"?"Greetings. I am XENA.":"cheese",timestamp:new Date().toLocaleTimeString()}]);
  const [cloakOn,setCloakOn]=useState(()=>localStorage.getItem("xena_cloak")==="true");
  const [escKey,setEscKey]=useState(()=>localStorage.getItem("xena_escape_key")||"Escape");
  const [escUrl,setEscUrl]=useState(()=>localStorage.getItem("xena_escape_url")||"https://classroom.google.com");
  const [time,setTime]=useState("");
  const [ping,setPing]=useState(25);
  const [ddgMode,setDdgMode]=useState(()=>localStorage.getItem("xena_ddg_mode")||"ddg3");
  const [settingsTab,setSettingsTab]=useState<"general"|"history"|"ddg">("general");
  const [reports,setReports]=useState<Report[]>(()=>{const r=localStorage.getItem("xena_reports");return r?JSON.parse(r):[];});
  const [reportForm,setReportForm]=useState({kind:"bug",title:"",url:"",details:""});
  const [shortcuts,setShortcuts]=useState<Shortcut[]>(()=>{const r=localStorage.getItem("xena_shortcuts");return r?JSON.parse(r):[];});
  const [showAddShortcut,setShowAddShortcut]=useState(false);
  const [newShortcut,setNewShortcut]=useState({name:"",url:""});
  const [searchHistory,setSearchHistory]=useState<SearchHistoryItem[]>(()=>{const r=localStorage.getItem("xena_search_history");return r?JSON.parse(r):[];});
  const [aiHistory,setAiHistory]=useState<AIHistoryItem[]>(()=>{const r=localStorage.getItem("xena_ai_history");return r?JSON.parse(r):[];});
  const [accessCodeInput,setAccessCodeInput]=useState("");
  const [devUnlocked,setDevUnlocked]=useState(sessionStorage.getItem("xena_dev")==="true");
  const [adminUnlocked,setAdminUnlocked]=useState(sessionStorage.getItem("xena_admin")==="true");
  const [showTikTok,setShowTikTok]=useState(false);

  const activeTab=tabs.find(t=>t.id===activeTabId)||tabs[0];
  const iframeRef=useRef<HTMLIFrameElement>(null);

  useEffect(()=>{if(window.location.pathname==="/tiktok")setShowTikTok(true);},[]);
  useEffect(()=>{localStorage.setItem("xena_engine",engine);},[engine]);
  useEffect(()=>{localStorage.setItem("xena_proxy_mode",proxyMode);},[proxyMode]);
  useEffect(()=>{localStorage.setItem("xena_ai_mode",aiMode);},[aiMode]);
  useEffect(()=>{localStorage.setItem("xena_shortcuts",JSON.stringify(shortcuts));},[shortcuts]);
  useEffect(()=>{localStorage.setItem("xena_ddg_mode",ddgMode);},[ddgMode]);
  useEffect(()=>{const i=setInterval(()=>setFactIndex(prev=>(prev+1)%funFacts.length),12000);return ()=>clearInterval(i);},[]);
  useEffect(()=>{
    localStorage.setItem("xena_cloak",String(cloakOn));
    if(cloakOn){document.title="Google Classroom";let l:any=document.querySelector("link[rel*='icon']");if(!l){l=document.createElement("link");l.type="image/x-icon";l.rel="shortcut icon";document.head.appendChild(l);}l.href="https://ssl.gstatic.com/classroom/favicon.png";}else{document.title="XENA Browser";}
  },[cloakOn]);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key===escKey)window.location.href=escUrl;};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[escKey,escUrl]);
  useEffect(()=>{const u=()=>{setTime(new Date().toLocaleTimeString("en-US",{hour12:true}));setPing(Math.floor(Math.random()*16)+12);};u();const i=setInterval(u,1000);return()=>clearInterval(i);},[]);
  useEffect(()=>{setUrlInput(activeTab.url);},[activeTabId,activeTab.url]);
  useEffect(()=>{if('serviceWorker'in navigator&&proxyMode==='sw'){navigator.serviceWorker.register('/xena-sw.js').catch(()=>{});}},[proxyMode]);

  const checkAccessCode=async(code:string)=>{
    try{
      const resp=await fetch("/api/auth/validate-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
      const data=await resp.json();
      if(data.valid&&data.level==="developer"){setDevUnlocked(true);sessionStorage.setItem("xena_dev","true");window.history.pushState({},"","/dev-console");setAccessCodeInput("");}
      else if(data.valid&&data.level==="admin"){setAdminUnlocked(true);sessionStorage.setItem("xena_admin","true");sessionStorage.setItem("xena_admin_code",code);window.history.pushState({},"","/admin-console");setAccessCodeInput("");}
      else{alert("Invalid access code");}
    }catch{alert("Error validating code");}
  };

  const createTab=(raw="")=>{
    const id=`tab-${Date.now()}`;let tu="",tp="";
    if(raw){if(raw.startsWith("/")||raw.startsWith("http://localhost")||raw.startsWith("http://127.0.0.1")){tu=raw;tp=raw;}else{tu=normalizeInput(engine,raw);tp=getProxyUrl(tu,proxyMode);}}
    setTabs([...tabs,{id,title:tu?getDomain(tu):"XENA Engine",url:tu,proxyUrl:tp}]);setActiveTabId(id);
  };
  const closeTab=(id:string,e:React.MouseEvent)=>{e.stopPropagation();if(tabs.length===1)return;const f=tabs.filter(t=>t.id!==id);setTabs(f);if(activeTabId===id)setActiveTabId(f[f.length-1].id);};
  const go=(input:string)=>{
    if(!input.trim())return;let fu="",pp="";
    if(input.startsWith("/")||input.startsWith("http://localhost")||input.startsWith("http://127.0.0.1")){fu=input;pp=input;}else{fu=normalizeInput(engine,input);pp=getProxyUrl(fu,proxyMode);}
    if(!input.startsWith("/")&&!input.startsWith("http")){const ts=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});const item:SearchHistoryItem={id:`s-${Date.now()}`,query:input,engine,timestamp:ts};setSearchHistory(prev=>{const n=[item,...prev].slice(0,50);localStorage.setItem("xena_search_history",JSON.stringify(n));return n;});}
    setTabs(tabs.map(t=>t.id===activeTabId?{...t,title:getDomain(fu),url:fu,proxyUrl:pp}:t));
  };
  const refresh=()=>{if(iframeRef.current)iframeRef.current.src=iframeRef.current.src;};
  const sendMsg=async()=>{
    const txt=chatInput.trim();if(!txt||aiLoad)return;
    setMsgs(prev=>[...prev,{sender:"user",text:txt,timestamp:new Date().toLocaleTimeString()}]);setChatInput("");setAiLoad(true);
    try{const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:txt,mode:aiMode})});const data=await resp.json();const respText=data.response||(aiMode==="serious"?"I'm not sure.":"cheese");setMsgs(prev=>[...prev,{sender:"ai",text:respText,timestamp:new Date().toLocaleTimeString()}]);const hItem:AIHistoryItem={id:`ai-${Date.now()}`,message:txt,response:respText,mode:aiMode,timestamp:new Date().toLocaleTimeString()};setAiHistory(prev=>{const n=[hItem,...prev].slice(0,100);localStorage.setItem("xena_ai_history",JSON.stringify(n));return n;});}catch{setMsgs(prev=>[...prev,{sender:"ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}]);}finally{setAiLoad(false);}
  };
  const toggleAIMode=()=>{const newMode=aiMode==="chill"?"serious":"chill";setAiMode(newMode);if(msgs.length===1&&msgs[0].sender==="ai")setMsgs([{...msgs[0],text:newMode==="serious"?"Greetings. I am XENA.":"cheese"}]);};
  const submitReport=()=>{
    if(!reportForm.title||!reportForm.details){alert("Fill in title and details");return;}
    const item:Report={id:`rep-${Date.now()}`,...reportForm};const next=[item,...reports];setReports(next);localStorage.setItem("xena_reports",JSON.stringify(next));
    fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reportForm)}).catch(()=>{});setReportForm({kind:"bug",title:"",url:"",details:""});alert("Report submitted!");setModal(null);
  };
  const addShortcut=()=>{
    if(!newShortcut.name||!newShortcut.url)return;let url=newShortcut.url;if(!url.startsWith("http"))url="https://"+url;
    const item:Shortcut={id:`sc-${Date.now()}`,name:newShortcut.name,url,icon:url.charAt(8).toUpperCase()};setShortcuts([...shortcuts,item]);setNewShortcut({name:"",url:""});setShowAddShortcut(false);
  };
  const openAboutBlank=()=>{
    try{const w=window.open('about:blank','_blank');if(w){w.document.write(`<html style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><head><title>Google Classroom</title></head><body style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><iframe src="${window.location.origin}/" style="position:fixed;top:0;left:0;bottom:0;right:0;width:100%;height:100%;border:none;margin:0;padding:0;overflow:hidden;z-index:999999;"></iframe></body></html>`);w.document.close();}else alert("Popup blocked!");}catch{}
  };
  const openBlobUrl=()=>{
    try{const h=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Google Classroom</title><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;}iframe{width:100%;height:100%;border:none;position:fixed;top:0;left:0;bottom:0;right:0;}</style></head><body><iframe src="${window.location.origin}/"></iframe></body></html>`;const b=new Blob([h],{type:"text/html"});const u=URL.createObjectURL(b);window.open(u,"_blank");}catch{}
  };

  if(window.location.pathname==="/dev-console"&&devUnlocked){return <DevConsole onClose={()=>{window.history.pushState({},"","/");setDevUnlocked(false);sessionStorage.removeItem("xena_dev");}} reports={reports}/>;}
  if(window.location.pathname==="/admin-console"&&adminUnlocked){return <DevConsole onClose={()=>{window.history.pushState({},"","/");setAdminUnlocked(false);sessionStorage.removeItem("xena_admin");}} reports={reports}/>;}
  if(showTikTok||window.location.pathname==="/tiktok"){return <TikTokClone onBack={()=>{setShowTikTok(false);window.history.pushState({},"","/");}}/>;}

  return (
    <div className="w-full h-screen flex flex-col bg-black text-white overflow-hidden select-none font-sans">
      <header className="flex items-center gap-2 px-3 h-14 bg-black border-b border-[#111] relative z-20 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={()=>{try{if(iframeRef.current?.contentWindow?.history.back()){}}catch{}}} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><ArrowLeft className="w-4 h-4"/></button>
          <button onClick={()=>{try{if(iframeRef.current?.contentWindow?.history.forward()){}}catch{}}} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><ArrowRight className="w-4 h-4"/></button>
          <button onClick={refresh} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><RotateCw className="w-4 h-4"/></button>
        </div>
        <form onSubmit={e=>{e.preventDefault();go(urlInput);}} className="flex-1 flex max-w-4xl mx-3 h-8.5 rounded-lg border border-[#1a1a1a] bg-black overflow-hidden focus-within:border-zinc-500">
          <select value={engine} onChange={e=>setEngine(e.target.value)} className="px-2 bg-black text-zinc-400 text-xs border-r border-[#1a1a1a] outline-none cursor-pointer focus:text-white">
            <option value="ddg">DDG</option><option value="google">Google</option><option value="bing">Bing</option>
          </select>
          <input type="text" value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="Search or enter URL..." spellCheck={false} className="flex-1 px-3 text-sm bg-transparent outline-none text-white placeholder-zinc-600"/>
        </form>
      </header>

      <section className="flex items-end justify-between px-3 bg-black border-b border-[#111] h-10 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-end gap-1 overflow-x-auto no-scrollbar">
          {tabs.map(tab=>{
            const ia=tab.id===activeTabId;
            return(
              <div key={tab.id} onClick={()=>setActiveTabId(tab.id)} className={`group flex items-center gap-2 px-3 h-8.5 rounded-t-lg border-t border-x cursor-pointer min-w-[120px] max-w-[170px] ${ia?"bg-black border-x border-zinc-800 border-t-zinc-400 text-white":"bg-zinc-950/70 border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                <Globe className={`w-3.5 h-3.5 shrink-0 ${ia?"text-zinc-300":"text-zinc-600"}`}/>
                <span className="flex-1 text-xs truncate max-w-[100px] font-medium">{tab.title}</span>
                <button onClick={e=>closeTab(tab.id,e)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-600 opacity-0 group-hover:opacity-100"><X className="w-2.5 h-2.5"/></button>
              </div>
            );
          })}
          <button onClick={()=>createTab()} className="w-7.5 h-7.5 flex items-center justify-center rounded-md border border-zinc-800 text-zinc-600 hover:text-white hover:border-zinc-500 mb-1"><Plus className="w-4 h-4"/></button>
        </div>
        <div className="flex items-center gap-1.5 mb-1.5 shrink-0 pl-4">
          <button onClick={()=>setShieldOn(!shieldOn)} className={`flex items-center gap-1.5 px-2.5 h-7.5 rounded-md border text-[10px] font-mono font-medium ${shieldOn?"bg-white/5 text-white border-zinc-750":"bg-black text-zinc-500 border-zinc-850"}`}><Shield className="w-3.5 h-3.5"/><span className="hidden sm:inline">AdBlock</span></button>
          <button onClick={()=>setModal("report")} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-red-400 hover:text-red-300 hover:border-red-500/40 text-[14px] transition-all" title="Bug Report">🐞</button>
          <button onClick={()=>setModal("settings")} className="w-7.5 h-7.5 flex items-center justify-center rounded-md border border-zinc-850 bg-black text-zinc-400 hover:text-white"><Settings className="w-4 h-4"/></button>
          <button onClick={()=>{setShowTikTok(true);window.history.pushState({},"","/tiktok");}} className="flex items-center gap-1 px-2.5 h-7.5 rounded-md border border-zinc-800 bg-black text-zinc-400 hover:text-white hover:border-zinc-500 text-[10px] font-mono font-medium">📱 <span className="hidden sm:inline">TikTok</span></button>
          <button onClick={()=>setAiOpen(!aiOpen)} className="w-7.5 h-7.5 flex items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 p-[1.5px] hover:scale-105 shadow-[0_0_10px_rgba(168,85,247,0.45)]"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] text-white">🔮</div></button>
        </div>
      </section>

      <main className="flex-1 relative bg-black overflow-hidden">
        {activeTab.proxyUrl ? (
          <div className="w-full h-full relative z-10">
            <iframe ref={iframeRef} src={activeTab.proxyUrl} 
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; geolocation; microphone; camera" 
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads" 
              className="w-full h-full border-none bg-white" />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-6 overflow-y-auto">
            <StarryBg />
            <div className="max-w-2xl w-full flex flex-col items-center text-center relative z-10 mt-8">
              <div className="mb-6">
                <h1 className="text-5xl font-bold text-white tracking-tight mb-1">XENA</h1>
                <svg className="w-20 h-3 mx-auto text-zinc-500 mt-2 opacity-60" viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12 Q 25 2, 50 12 T 95 12"/></svg>
                <p className="text-[9px] text-zinc-500 tracking-[0.3em] font-mono mt-3 uppercase opacity-70">SECURE SANDBOX BROWSER</p>
              </div>
              <form onSubmit={e=>{e.preventDefault();go(startInput);}} className="w-full max-w-xl flex h-11 rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden focus-within:border-zinc-500 transition-all duration-150 mb-2">
                <select value={engine} onChange={e=>setEngine(e.target.value)} className="px-3 bg-zinc-900 text-zinc-400 text-xs border-r border-zinc-800 outline-none cursor-pointer font-medium">
                  <option value="ddg">DDG</option><option value="google">Google</option><option value="bing">Bing</option>
                </select>
                <input type="text" value={startInput} onChange={e=>setStartInput(e.target.value)} placeholder={`Did you know? ${funFacts[factIndex]}`} spellCheck={false} className="flex-1 px-4 bg-transparent outline-none text-white text-sm placeholder-zinc-500 placeholder-opacity-70"/>
                <button type="submit" className="px-5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold tracking-wider uppercase transition-all">Go</button>
              </form>
              <div className="flex flex-wrap justify-center gap-2 mb-6 mt-4">
                <button onClick={()=>setAiOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 transition-all"><Sparkles className="w-3 h-3 text-purple-400"/>AI</button>
                {shortcuts.map(sc=>(
                  <button key={sc.id} onClick={()=>go(sc.url)} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all group relative">
                    <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-400">{sc.icon}</span><span>{sc.name}</span>
                    <button onClick={e=>{e.stopPropagation();setShortcuts(prev=>prev.filter(s=>s.id!==sc.id));}} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-2 h-2"/></button>
                  </button>
                ))}
                {showAddShortcut ? (
                  <div className="flex items-center gap-1">
                    <input type="text" value={newShortcut.name} onChange={e=>setNewShortcut({...newShortcut,name:e.target.value})} placeholder="Name" className="w-16 h-7 px-1.5 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-white outline-none"/>
                    <input type="text" value={newShortcut.url} onChange={e=>setNewShortcut({...newShortcut,url:e.target.value})} placeholder="URL" className="w-24 h-7 px-1.5 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-white outline-none"/>
                    <button onClick={addShortcut} className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-white">✓</button>
                    <button onClick={()=>setShowAddShortcut(false)} className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-500">✕</button>
                  </div>
                ) : (
                  <button onClick={()=>setShowAddShortcut(true)} className="w-8 h-8 flex items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition-all text-lg leading-none">+</button>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono"><Activity className="w-3 h-3"/>{time} · {ping}ms · {PROXY_MODES.find(m=>m.id===proxyMode)?.badge||"SW ENGINE"} · {DDG_OPTIONS[ddgMode]?.name?.split(" ")[0]||"DDG"}</div>
            </div>
          </div>
        )}
      </main>

      <section className={`fixed top-0 bottom-0 right-0 w-80 bg-black border-l border-zinc-800 z-50 shadow-2xl flex flex-col transition-all duration-300 transform ${aiOpen?"translate-x-0":"translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800">
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-white"/><span className="text-sm font-semibold text-white">XENA AI</span></div>
          <div className="flex items-center gap-2">
            <button onClick={toggleAIMode} className={`text-[9px] font-mono font-bold tracking-widest px-2 py-1 rounded border transition-all ${aiMode==="serious"?"bg-emerald-950/40 text-emerald-400 border-emerald-900/60":"bg-purple-950/40 text-purple-400 border-purple-900/60"}`}>{aiMode==="serious"?"😐 Serious":"😎 Chill"}</button>
            <button onClick={()=>setAiOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {msgs.map((m,i)=>(
            <div key={i} className={`flex ${m.sender==="user"?"justify-end":"justify-start"}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.sender==="user"?"bg-zinc-700 text-white":"bg-zinc-800 text-zinc-200"}`}>{m.text}</div>
            </div>
          ))}
          {aiLoad&&<div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono px-2"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-150"></span><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-300"></span><span>thinking...</span></div>}
        </div>
        <div className="border-t border-zinc-800 p-3">
          <div className="flex gap-2">
            <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder={aiMode==="serious"?"Ask me anything...":"..."} className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-zinc-600 placeholder-zinc-600"/>
            <button onClick={sendMsg} disabled={aiLoad} className="px-3 py-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 disabled:opacity-50"><Send className="w-4 h-4 text-white"/></button>
          </div>
        </div>
      </section>

      {modal==="settings"&&(
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={()=>setModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-zinc-800"><h2 className="text-lg font-bold text-white">Settings</h2><button onClick={()=>setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button></div>
            <div className="flex border-b border-zinc-800 px-2">
              {["general","history","ddg"].map(t=>(
                <button key={t} onClick={()=>setSettingsTab(t as any)} className={`flex-1 py-2.5 text-[10px] font-mono tracking-wider uppercase border-b-2 text-center transition-all ${settingsTab===t?"border-white text-white font-bold":"border-transparent text-zinc-500 hover:text-zinc-300"}`}>{t==="general"?"Stealth":t==="history"?"History":"DDG Mode"}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {settingsTab==="general"&&(
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-black"><div><span className="block text-xs font-semibold text-zinc-200">Classroom Cloak</span><span className="block text-[10px] text-zinc-500 mt-0.5 font-mono">Disguises tab as Google Classroom</span></div><button onClick={()=>setCloakOn(!cloakOn)} className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider font-mono ${cloakOn?"bg-white/10 text-white border border-zinc-700":"bg-zinc-950 text-zinc-600 border border-zinc-800"}`}>{cloakOn?"ON":"OFF"}</button></div>
                  <div className="space-y-2"><span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Panic Escape</span><div className="grid grid-cols-2 gap-2"><div><label className="block text-[9px] text-zinc-600 mb-1 font-mono">KEY</label><input type="text" value={escKey} onChange={e=>{setEscKey(e.target.value);localStorage.setItem("xena_escape_key",e.target.value);}} className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-mono text-white outline-none focus:border-zinc-500"/></div><div><label className="block text-[9px] text-zinc-600 mb-1 font-mono">URL</label><input type="text" value={escUrl} onChange={e=>{setEscUrl(e.target.value);localStorage.setItem("xena_escape_url",e.target.value);}} className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white outline-none focus:border-zinc-500"/></div></div></div>
                  <div><span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase mb-2">Proxy Engine</span><div className="space-y-2">{PROXY_MODES.map(mode=>{const ia=proxyMode===mode.id;return(<div key={mode.id} onClick={()=>{setProxyMode(mode.id);localStorage.setItem("xena_proxy_mode",mode.id);}} className={`p-3 rounded-lg border cursor-pointer transition-all ${ia?"bg-zinc-800 border-zinc-600 text-white":"bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${ia?"bg-emerald-500":"bg-zinc-700"}`}/><span className="text-xs font-semibold">{mode.name}</span></div><span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${ia?"bg-white/15 text-white":"bg-zinc-900 text-zinc-500"}`}>{mode.badge} {mode.latency}</span></div></div>);})}</div></div>
                  <div className="space-y-2 pt-2"><span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Developer Access</span><div className="flex gap-2"><input type="text" value={accessCodeInput} onChange={e=>setAccessCodeInput(e.target.value.toUpperCase())} placeholder="Enter access code..." maxLength={5} className="flex-1 h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-mono text-white outline-none focus:border-zinc-500 uppercase tracking-widest"/><button onClick={()=>checkAccessCode(accessCodeInput)} className="h-9 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold">Unlock</button></div></div>
                  <div className="space-y-2 pt-2"><span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Stealth Launchers</span><div className="grid grid-cols-2 gap-2"><button onClick={openAboutBlank} className="py-2 px-3 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-center transition-all">Open About:Blank</button><button onClick={openBlobUrl} className="py-2 px-3 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-center transition-all">Open Blob:URL</button></div></div>
                </>
              )}
              {settingsTab==="history"&&(
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono font-semibold tracking-wider text-zinc-500 uppercase">Search History</span>
                      {searchHistory.length>0&&<button onClick={()=>{setSearchHistory([]);localStorage.removeItem("xena_search_history");}} className="text-[8px] font-mono uppercase bg-zinc-950 px-1.5 py-0.5 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded">Clear</button>}
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                      {searchHistory.length===0?<div className="text-[10px] text-zinc-600 font-mono py-6 text-center border border-dashed border-zinc-900 rounded-lg">No search history.</div>:
                        searchHistory.slice(0,20).map(item=>(
                          <div key={item.id} className="flex items-center justify-between p-2 rounded border border-zinc-900 bg-black/40 hover:border-zinc-850">
                            <div className="flex flex-col min-w-0 flex-1 mr-2 text-left">
                              <span className="text-xs text-white truncate font-medium">{item.query}</span>
                              <span className="text-[8px] font-mono uppercase text-zinc-550 mt-0.5">{item.engine} • {item.timestamp}</span>
                            </div>
                            <button onClick={()=>{go(item.query);setModal(null);}} className="text-[9px] px-2 py-1 bg-zinc-900 border border-zinc-800 text-white rounded font-mono hover:bg-zinc-800">Search</button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono font-semibold tracking-wider text-zinc-500 uppercase">AI Usage History</span>
                      {aiHistory.length>0&&<button onClick={()=>{setAiHistory([]);localStorage.removeItem("xena_ai_history");}} className="text-[8px] font-mono uppercase bg-zinc-950 px-1.5 py-0.5 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded">Clear</button>}
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                      {aiHistory.length===0?<div className="text-[10px] text-zinc-600 font-mono py-6 text-center border border-dashed border-zinc-900 rounded-lg">No AI conversations yet.</div>:
                        aiHistory.slice(0,15).map(item=>(
                          <div key={item.id} className="p-2 rounded border border-zinc-900 bg-black/40">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${item.mode==="serious"?"bg-emerald-900/30 text-emerald-400":"bg-purple-900/30 text-purple-400"}`}>{item.mode}</span>
                              <span className="text-[8px] text-zinc-500 font-mono">{item.timestamp}</span>
                            </div>
                            <p className="text-[10px] text-zinc-300 truncate">Q: {item.message}</p>
                            <p className="text-[10px] text-zinc-500 truncate">A: {item.response}</p>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              )}

              {settingsTab==="ddg"&&(
                <div className="space-y-3">
                  <span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Search Engine Mode</span>
                  <p className="text-[10px] text-zinc-500 font-mono">DuckDuckGo sometimes refuses iframe embedding. Try different modes:</p>
                  {Object.entries(DDG_OPTIONS).map(([key, opt]) => (
                    <div key={key} onClick={()=>{setDdgMode(key);localStorage.setItem("xena_ddg_mode",key);}} 
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${ddgMode===key?"bg-zinc-800 border-zinc-600":"bg-black border-zinc-800 hover:border-zinc-600"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{opt.name}</span>
                        {ddgMode===key&&<span className="text-[8px] text-emerald-400 font-bold">✓ ACTIVE</span>}
                      </div>
                      <p className="text-[9px] text-zinc-500 mt-1 font-mono">{opt.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modal==="report"&&(
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={()=>setModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">🐞 Bug Report & Suggestions</h2>
              <button onClick={()=>setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">Kind</label>
                  <select value={reportForm.kind} onChange={e=>setReportForm({...reportForm,kind:e.target.value})} className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-2 text-xs text-white focus:border-zinc-500">
                    <option value="bug">🐛 Bug Report</option><option value="suggestion">💡 Suggestion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">Title</label>
                  <input type="text" value={reportForm.title} onChange={e=>setReportForm({...reportForm,title:e.target.value})} placeholder="Summary" className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white outline-none focus:border-zinc-500"/>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">URL (optional)</label>
                <input type="text" value={reportForm.url} onChange={e=>setReportForm({...reportForm,url:e.target.value})} placeholder="https://..." className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white outline-none focus:border-zinc-500"/>
              </div>
              <div>
                <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">Details</label>
                <textarea rows={4} value={reportForm.details} onChange={e=>setReportForm({...reportForm,details:e.target.value})} placeholder="What happened..." className="w-full rounded-lg border border-zinc-800 bg-black p-3 text-xs text-white outline-none resize-none focus:border-zinc-500"/>
              </div>
              <button onClick={submitReport} className="w-full h-10 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all">Submit Report</button>
              {reports.length>0&&(
                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  <span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Your Submissions ({reports.length})</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                    {reports.map(rep=>(
                      <div key={rep.id} className="p-2 border border-zinc-800 bg-black/50 rounded-lg text-[10px]">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mr-1.5 ${rep.kind==="bug"?"bg-red-500/10 text-red-400":"bg-cyan-500/10 text-cyan-400"}`}>{rep.kind==="bug"?"🐛 Bug":"💡 Suggestion"}</span>
                        <strong className="text-zinc-200">{rep.title}</strong>
                        <p className="text-zinc-500 mt-1">{rep.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="h-6 border-t border-zinc-900 bg-black text-[9px] font-mono tracking-wider text-zinc-500 flex items-center justify-between px-3 shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.2 font-bold uppercase text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>SECURE</span>
          <span className="text-zinc-800">|</span>
          <span className="uppercase text-zinc-600">{PROXY_MODES.find(m=>m.id===proxyMode)?.badge||"SW ENGINE"}</span>
          <span className="text-zinc-800">|</span>
          <span className="text-zinc-600">{DDG_OPTIONS[ddgMode]?.name?.split(" ")[0]||"DDG"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{ping}ms</span>
          <span className="text-zinc-800">|</span>
          <span>{time}</span>
        </div>
      </footer>
    </div>
  );
}
