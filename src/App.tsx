import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send, Activity, Shield, Bug, Cpu, Terminal, Users, Bell, RefreshCw, Star, Search, Heart, MessageCircle, Share2 } from "lucide-react";

// ==================== ENCODING ====================
function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c==="+"?"-":c==="/"?"_":""); } catch { return encodeURIComponent(v); }
}
function b64d(v: string): string {
  try { let t=v.replace(/-/g,"+").replace(/_/g,"/"); while(t.length%4) t+="="; return decodeURIComponent(escape(atob(t))); } catch { return v; }
}

// ==================== PROXY MODES ====================
const PROXY_MODES = [
  { id:"sw", name:"Service Worker Proxy", badge:"SW ENGINE", latency:"~12ms" },
  { id:"rev", name:"Reverse Proxy", badge:"REVERSE", latency:"~18ms" },
  { id:"bin", name:"Binary Stream Sandbox", badge:"BINARY OS", latency:"~24ms" }
];

// ==================== 5 DDG SOLUTIONS ====================
const DDG_OPTIONS: Record<string, {name:string,url:string,note:string}> = {
  ddg1: { name: "DuckDuckGo Standard", url: "https://duckduckgo.com/?q=", note: "Standard DDG — may refuse iframe embedding" },
  ddg2: { name: "DuckDuckGo HTML (No JS)", url: "https://html.duckduckgo.com/html/?q=", note: "Lightweight HTML version, works in proxies" },
  ddg3: { name: "DuckDuckGo Lite", url: "https://lite.duckduckgo.com/lite/?q=", note: "Minimal version, best for proxied iframes" },
  ddg4: { name: "Startpage (DDG alt)", url: "https://www.startpage.com/sp/search?query=", note: "Privacy-focused alternative" },
  ddg5: { name: "Bing Fallback", url: "https://www.bing.com/search?q=", note: "Bing search engine as fallback" }
};

// ==================== FUN FACTS ====================
const funFacts = [
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than a year on Venus.",
  "Honey never spoils — 3000-year-old honey found still edible.",
  "The Eiffel Tower grows 6 inches taller in summer.",
  "A group of flamingos is called a 'flamboyance'.",
  "Wombat poop is cube-shaped so it doesn't roll away.",
  "There are more trees on Earth than stars in the Milky Way.",
  "Hot water freezes faster than cold water (Mpemba effect).",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The shortest war in history was 38 minutes.",
  "A day on Pluto lasts 6.4 Earth days.",
  "Cows have best friends and get stressed when separated.",
  "The universe's color is 'Cosmic Latte' — a beige color.",
  "Cleopatra lived closer to the moon landing than to the pyramids.",
  "Scotland has 421 words for 'snow'."
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
    const r=()=>{c.width=c.parentElement?.clientWidth||innerWidth;c.height=c.parentElement?.clientHeight||innerHeight;};
    r(); addEventListener("resize",r);
    const s=Array.from({length:80},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.5+0.3,a:Math.random(),s:Math.random()*0.015+0.003,d:Math.random()>0.5?1:-1}));
    const d=()=>{ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#fff";s.forEach(st=>{st.a+=st.s*st.d;if(st.a>=1){st.a=1;st.d=-1}else if(st.a<=0.1){st.a=0.1;st.d=1}ctx.globalAlpha=st.a;ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill();});anim=requestAnimationFrame(d);};
    d();
    return()=>{removeEventListener("resize",r);cancelAnimationFrame(anim);};
  },[]);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none z-0" />;
}

// ==================== HELPERS ====================
function getGreeting(): string { const h=new Date().getHours(); if(h<12) return "Good morning"; if(h<17) return "Good afternoon"; return "Good evening"; }
function getYtId(u:string):string|null {
  try { const url=new URL(u); if(url.hostname.includes("youtube.com")||url.hostname.includes("youtu.be")){let v=url.searchParams.get("v");if(!v&&url.hostname.includes("youtu.be")) v=url.pathname.replace(/^\//,"").split("?")[0];return v;} } catch { const m=u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/i); if(m) return m[1]; } return null;
}
function isUrl(t:string):boolean { if(!t.trim()) return false; if(/^https?:\/\//i.test(t)) return true; return /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t); }
function getDomain(u:string):string { try { return new URL(u).hostname.replace("www.",""); } catch { return "Web"; } }

function searchUrl(e:string, q:string):string {
  const enc=encodeURIComponent(q);
  const dm = localStorage.getItem("xena_ddg_mode") || "ddg3";
  if(e==="google") return `https://www.google.com/search?q=${enc}`;
  if(e==="bing") return `https://www.bing.com/search?q=${enc}`;
  return (DDG_OPTIONS[dm]?.url||"https://lite.duckduckgo.com/lite/?q=")+enc;
}

function normalizeInput(e:string,i:string):string {
  const r=i.trim(); if(!r) return searchUrl(e,"");
  if(/^https?:\/\//i.test(r)) return r;
  if(isUrl(r)) return `https://${r}`;
  return searchUrl(e,r);
}

function getProxyUrl(u:string,m:string):string {
  if(!u) return ""; if(u.startsWith("/")||u.startsWith("http://localhost")||u.startsWith("http://127.0.0.1")) return u;
  const yt=getYtId(u); if(yt) return `/view?v=${encodeURIComponent(yt)}`;
  return `/${m}/${b64e(u)}`;
}

// ==================== TIKTOK CLONE ====================
function TikTokClone({onBack}:{onBack:()=>void}) {
  const vref=useRef<(HTMLVideoElement|null)[]>([]);
  const feedRef=useRef<HTMLDivElement>(null);
  const vids = [
    {id:'1',user:'@xena',desc:'XENA Browser - Browse anything securely 🚀',music:'original sound - XENA',avatar:'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&auto=format',likes:'1.2K',comments:'89',shares:'45',src:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'},
    {id:'2',user:'@sandbox',desc:'Streaming through XENA proxy 🌐',music:'Electronic Vibes',avatar:'https://images.unsplash.com/photo-1531746790095-e5cb1579be01?w=100&auto=format',likes:'856',comments:'34',shares:'12',src:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'},
    {id:'3',user:'@techguy',desc:'This is how XENA loads TikTok 👀',music:'original sound - techguy',avatar:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format',likes:'2.3K',comments:'156',shares:'78',src:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'},
    {id:'4',user:'@xena',desc:'TikTok through XENA sandbox browser 🛡️',music:'Chill Beats',avatar:'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&auto=format',likes:'3.1K',comments:'203',shares:'95',src:'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'},
  ];
  useEffect(()=>{
    const f=feedRef.current; if(!f) return;
    const h=()=>{const sc=f.scrollTop+innerHeight/2;vref.current.forEach((v,i)=>{if(!v)return;const r=v.getBoundingClientRect();const vc=r.top+r.height/2;if(vc>innerHeight*0.25&&vc<innerHeight*0.75){v.play().catch(()=>{})}else{v.pause()}});};
    f.addEventListener("scroll",h); return ()=>f.removeEventListener("scroll",h);
  },[]);
  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden flex flex-col">
      <div className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white text-xl">←</button>
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.74 2.89 2.89 0 01-2.88-2.89 2.89 2.89 0 012.88-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.8 15.43a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.74a8.29 8.29 0 004.77 1.49v-3.5a4.83 4.83 0 01-1.66-.04z"/></svg>
        </div>
        <div className="flex items-center gap-4"><Search className="w-5 h-5 text-white/70"/><button className="text-sm font-bold px-4 py-1.5 rounded-full border border-white/20 text-white">Log in</button></div>
      </div>
      <div ref={feedRef} className="flex-1 overflow-y-scroll snap-y snap-mandatory" style={{scrollbarWidth:'none'}}>
        {vids.map((v,i)=>(
          <div key={v.id} className="snap-start h-screen w-full relative flex items-center justify-center bg-black">
            <video ref={el=>{vref.current[i]=el;}} src={"/fetch/"+b64e(v.src)} loop muted playsInline className="w-full h-full object-cover absolute inset-0" onClick={()=>{const vv=vref.current[i];if(vv){if(vv.paused)vv.play();else vv.pause();}}}/>
            <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden"><img src={v.avatar} className="w-full h-full object-cover"/></div>
              <button className="flex flex-col items-center gap-1 text-white"><Heart className="w-7 h-7 drop-shadow-lg" fill="white"/><span className="text-xs font-bold drop-shadow-lg">{v.likes}</span></button>
              <button className="flex flex-col items-center gap-1 text-white"><MessageCircle className="w-7 h-7 drop-shadow-lg" fill="white"/><span className="text-xs font-bold drop-shadow-lg">{v.comments}</span></button>
              <button className="flex flex-col items-center gap-1 text-white"><Share2 className="w-7 h-7 drop-shadow-lg"/><span className="text-xs font-bold drop-shadow-lg">{v.shares}</span></button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 bg-gradient-to-t from-black/70 to-transparent z-10">
              <p className="font-bold text-sm mb-1">{v.user} <span className="font-normal text-white/60 text-xs">{v.user.replace('@','')}</span></p>
              <p className="text-sm mb-2">{v.desc}</p>
              <div className="flex items-center gap-2 text-xs text-white/70">💿 {v.music}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#121212] border-t border-white/10 flex items-center justify-around z-40">
        <Home className="w-6 h-6 text-white" fill="white"/><Search className="w-6 h-6 text-white/50"/>
        <div className="relative -top-3"><div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl">+</div></div>
        <MessageCircle className="w-6 h-6 text-white/50"/><div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">👤</div>
      </div>
    </div>
  );
}
const Home = () => null;

// ==================== FULL-PAGE DEV CONSOLE ====================
function DevConsole({onClose,reports}:{onClose:()=>void,reports:Report[]}) {
  const [ddgMode,setDdgMode]=useState(()=>localStorage.getItem("xena_ddg_mode")||"ddg3");
  const [ddgQuery,setDdgQuery]=useState("youtube");
  const [ddgResult,setDdgResult]=useState<string|null>(null);
  const testDdg=(key:string)=>{const o=DDG_OPTIONS[key];if(!o)return;setDdgResult(`Testing: ${o.name}\nURL: ${o.url}${encodeURIComponent(ddgQuery)}\n\nOpened in new tab.`);window.open("/fetch/"+b64e(o.url+encodeURIComponent(ddgQuery)),"_blank");};
  const setDefault=(key:string)=>{setDdgMode(key);localStorage.setItem("xena_ddg_mode",key);setDdgResult(`✅ Default DDG mode set to: ${DDG_OPTIONS[key].name}`);};
  return (
    <div className="w-full min-h-screen bg-[#060a18] text-white overflow-y-auto">
      <header className="bg-gradient-to-r from-[#0a1030] via-[#0d1540] to-[#0a1030] border-b border-[#1a2850] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs tracking-[0.2em] font-mono"><Cpu className="w-4 h-4"/> DEVELOPER CONSOLE</div>
            <button onClick={onClose} className="px-4 py-2 bg-[#1a2850]/50 border border-[#2a3870] rounded-lg text-blue-300 hover:text-white text-sm font-mono hover:bg-[#1a2850]/80 transition-all">✕ CLOSE</button>
          </div>
          <h1 className="text-5xl font-bold text-white mb-1">{getGreeting()} <span className="text-cyan-400">G</span></h1>
          <p className="text-blue-300/50 font-mono text-sm">XENA Neural Engine v2.0 • Full System Access</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5"><p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Bug Reports</p><p className="text-4xl font-bold text-white">{reports.length}</p><div className="flex gap-3 mt-2 text-[10px] font-mono"><span className="text-red-400/60">{reports.filter(r=>r.kind==="bug").length} bugs</span><span className="text-cyan-400/60">{reports.filter(r=>r.kind==="suggestion").length} suggestions</span></div></div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5"><p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Active Sessions</p><p className="text-4xl font-bold text-white">3</p><p className="text-[10px] text-blue-300/40 font-mono mt-2">2 tabs • 1 admin</p></div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5"><p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">System Uptime</p><p className="text-4xl font-bold text-white">{Math.floor(performance.now()/1000/60)}m</p><p className="text-[10px] text-blue-300/40 font-mono mt-2">SW Engine • Active</p></div>
          <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-5"><p className="text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-mono mb-2">Memory Heap</p><p className="text-4xl font-bold text-white">~64MB</p><p className="text-[10px] text-blue-300/40 font-mono mt-2">Stable • Normal load</p></div>
        </div>
        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="w-5 h-5 text-cyan-400"/>
            <div><h2 className="text-lg font-bold text-white">DuckDuckGo Proxy Configuration</h2><p className="text-sm text-blue-300/50 font-mono">Test which DDG mode works, then set as default</p></div>
            <div className="ml-auto flex items-center gap-2"><input type="text" value={ddgQuery} onChange={e=>setDdgQuery(e.target.value)} placeholder="Test query" className="px-3 py-2 bg-[#060a18] border border-[#1a2850] rounded-lg text-xs text-white w-40 outline-none focus:border-cyan-500/50"/><span className="text-blue-400/40 text-xs font-mono">default: <span className="text-cyan-400">{DDG_OPTIONS[ddgMode]?.name||"Lite"}</span></span></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(DDG_OPTIONS).map(([k,o])=>(
              <div key={k} className={`bg-[#060a18] border rounded-lg p-4 transition-all ${ddgMode===k?'border-cyan-500/50 ring-1 ring-cyan-500/20':'border-[#1a2850] hover:border-cyan-700/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{o.name}</span>
                  <div className="flex gap-2">
                    <button onClick={()=>testDdg(k)} className="text-[10px] px-3 py-1 bg-[#1a2850]/50 border border-[#2a3870] rounded text-blue-300 hover:text-white transition-all font-mono">Test</button>
                    <button onClick={()=>setDefault(k)} className={`text-[10px] px-3 py-1 rounded transition-all font-mono ${ddgMode===k?'bg-cyan-900/30 text-cyan-300 border border-cyan-700/30':'bg-[#1a2850]/30 border border-[#1a2850] text-blue-300/60 hover:text-white'}`}>{ddgMode===k?'✓ Default':'Set Default'}</button>
                  </div>
                </div>
                <p className="text-xs text-blue-300/60 mb-1">{o.note}</p>
                <p className="text-[9px] text-blue-400/30 font-mono truncate">{o.url}your+search</p>
              </div>
            ))}
          </div>
          {ddgResult&&<div className="mt-4 p-3 bg-[#060a18] border border-[#1a2850] rounded-lg"><p className="text-xs text-cyan-400 font-mono whitespace-pre-wrap">{ddgResult}</p></div>}
        </div>
        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4"><Bug className="w-5 h-5 text-red-400"/><div><h2 className="text-lg font-bold text-white">Bug Reports & Insights</h2><p className="text-sm text-blue-300/50 font-mono">{reports.length} total submissions</p></div></div>
          {reports.length===0?<div className="text-center py-12 text-blue-300/30"><Bug className="w-12 h-12 mx-auto mb-3 opacity-30"/><p className="text-sm font-mono">No bug reports yet</p></div>:<div className="space-y-2 max-h-96 overflow-y-auto pr-2">{reports.map(rep=>(<div key={rep.id} className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${rep.kind==="bug"?"bg-red-500/20 text-red-300":"bg-cyan-500/20 text-cyan-300"}`}>{rep.kind==="bug"?"BUG":"IDEA"}</span><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-white">{rep.title}</span>{rep.important&&<Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"/>}</div><p className="text-xs text-blue-300/60">{rep.details}</p>{rep.url&&<p className="text-[10px] text-cyan-400/50 mt-1 font-mono truncate">{rep.url}</p>}</div></div>))}</div>}
        </div>
        <div className="bg-[#0a1030]/80 border border-[#1a2850] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4"><Terminal className="w-5 h-5 text-cyan-400"/><h2 className="text-lg font-bold text-white">Known Issues & Fixes</h2></div>
          <div className="space-y-3">
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0"/><div><p className="text-sm font-mono text-red-300">ERR_SW_FETCH</p><p className="text-xs text-blue-300/60 mt-1">Service Worker failed. Reload page or switch to Reverse Proxy mode.</p></div></div>
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0"/><div><p className="text-sm font-mono text-yellow-300">ERR_IFRAME_BLOCK</p><p className="text-xs text-blue-300/60 mt-1">X-Frame-Options blocked. XENA strips these headers automatically.</p></div></div>
            <div className="bg-[#060a18] border border-[#1a2850] rounded-lg p-4 flex items-start gap-3"><span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0"/><div><p className="text-sm font-mono text-cyan-300">ERR_DDG_EMBED</p><p className="text-xs text-blue-300/60 mt-1">DDG refuses iframe. Try different DDG modes above or use Google/Bing.</p></div></div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-[#0a1030] via-[#0d1540] to-[#0a1030] border border-emerald-800/30 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center shrink-0"><Sparkles className="w-7 h-7 text-emerald-400"/></div>
            <div className="flex-1"><h2 className="text-xl font-bold text-white">HackerAI.co</h2><p className="text-sm text-blue-300/60 mt-1">AI penetration testing assistant — integrated into XENA</p></div>
            <a href="https://hackerai.co" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-emerald-900/30 border border-emerald-700/30 rounded-lg text-emerald-300 hover:bg-emerald-900/50 transition-all font-mono text-sm font-bold">Launch →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== FULL-PAGE ADMIN CONSOLE ====================
function AdminConsole({onClose,reports}:{onClose:()=>void,reports:Report[]}) {
  const [announceMsg,setAnnounceMsg]=useState(""); const [announceLink,setAnnounceLink]=useState("");
  const sendAnnouncement=async()=>{if(!announceMsg)return;await fetch("/api/admin/announcement",{method:"POST",headers:{"Content-Type":"application/json","x-admin-code":sessionStorage.getItem("xena_admin_code")||""},body:JSON.stringify({message:announceMsg,link:announceLink})});setAnnounceMsg("");setAnnounceLink("");alert("Announcement broadcasted!");};
  const restartServer=async()=>{if(confirm("Restart XENA Gateway?")){await fetch("/api/admin/restart",{method:"POST",headers:{"x-admin-code":sessionStorage.getItem("xena_admin_code")||""}});}};
  const toggleImportant=(id:string)=>{const u=reports.map(r=>r.id===id?{...r,important:!r.important}:r);localStorage.setItem("xena_reports",JSON.stringify(u));window.location.reload();};
  return (
    <div className="w-full min-h-screen bg-[#0a0606] text-white overflow-y-auto">
      <header className="bg-gradient-to-r from-[#1a0808] via-[#2a1010] to-[#1a0808] border-b border-[#502020] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2 text-amber-400 text-xs tracking-[0.2em] font-mono"><Users className="w-4 h-4"/> ADMIN CONSOLE</div><button onClick={onClose} className="px-4 py-2 bg-[#2a1414]/50 border border-[#502020] rounded-lg text-amber-300 hover:text-white text-sm font-mono hover:bg-[#2a1414]/80 transition-all">✕ CLOSE</button></div>
          <h1 className="text-5xl font-bold text-white mb-1">Sup <span className="text-amber-400">G</span></h1>
          <p className="text-amber-300/50 font-mono text-sm">XENA Gateway Administration • Access Level: ADMIN</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5"><p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Bug Reports</p><p className="text-4xl font-bold text-white">{reports.length}</p><p className="text-[10px] text-amber-300/40 font-mono mt-2">{reports.filter(r=>r.important).length} marked important</p></div>
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5"><p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Announcements</p><p className="text-4xl font-bold text-white">0</p><p className="text-[10px] text-amber-300/40 font-mono mt-2">active broadcasts</p></div>
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5"><p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Active Tabs</p><p className="text-4xl font-bold text-white">2</p><p className="text-[10px] text-amber-300/40 font-mono mt-2">browser sessions</p></div>
          <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-5"><p className="text-[10px] text-amber-400/60 uppercase tracking-[0.15em] font-mono mb-2">Gateway</p><p className="text-4xl font-bold text-emerald-400">●</p><p className="text-[10px] text-amber-300/40 font-mono mt-2">online · stable</p></div>
        </div>
        <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6"><Bug className="w-5 h-5 text-red-400"/><div><h2 className="text-lg font-bold text-white">Bug Reports</h2><p className="text-sm text-amber-300/50 font-mono">Click ★ to mark as important (forwarded to developer)</p></div></div>
          {reports.length===0?<div className="text-center py-12 text-amber-300/30"><Bug className="w-12 h-12 mx-auto mb-3 opacity-30"/><p className="text-sm font-mono">No bug reports yet</p></div>:<div className="space-y-2 max-h-80 overflow-y-auto pr-2">{reports.map(rep=>(<div key={rep.id} onClick={()=>toggleImportant(rep.id)} className={`border rounded-lg p-4 flex items-start gap-3 cursor-pointer transition-all ${rep.important?'bg-red-900/10 border-red-500/50':'bg-[#060404] border-[#502020] hover:border-amber-700/50'}`}><span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${rep.kind==="bug"?"bg-red-500/20 text-red-300":"bg-cyan-500/20 text-cyan-300"}`}>{rep.kind==="bug"?"BUG":"IDEA"}</span><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-white">{rep.title}</span>{rep.important&&<Star className="w-4 h-4 text-yellow-400 fill-yellow-400"/>}</div><p className="text-xs text-amber-300/60">{rep.details}</p>{rep.url&&<p className="text-[10px] text-cyan-400/50 mt-1 font-mono truncate">{rep.url}</p>}</div><button className="text-amber-400/60 hover:text-amber-300 text-lg shrink-0" onClick={(e)=>{e.stopPropagation();toggleImportant(rep.id);}}>★</button></div>))}</div>}
        </div>
        <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6"><Bell className="w-5 h-5 text-amber-400"/><div><h2 className="text-lg font-bold text-white">Send Announcement</h2><p className="text-sm text-amber-300/50 font-mono">Broadcast a message to all XENA users</p></div></div>
          <div className="space-y-3"><input type="text" value={announceMsg} onChange={e=>setAnnounceMsg(e.target.value)} placeholder="Announcement message..." className="w-full h-10 rounded-lg border border-[#502020] bg-[#0a0606] px-4 text-sm text-white outline-none focus:border-amber-700/50 placeholder-amber-800/50"/><input type="text" value={announceLink} onChange={e=>setAnnounceLink(e.target.value)} placeholder="Optional link URL..." className="w-full h-10 rounded-lg border border-[#502020] bg-[#0a0606] px-4 text-sm text-white outline-none focus:border-amber-700/50 placeholder-amber-800/50"/><button onClick={sendAnnouncement} className="w-full py-3 rounded-lg bg-amber-800/20 border border-amber-700/30 hover:bg-amber-800/40 text-amber-300 text-sm font-mono font-bold tracking-wider transition-all">📢 Broadcast Announcement</button></div>
        </div>
        <div className="bg-[#0a0606]/80 border border-[#502020] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6"><RefreshCw className="w-5 h-5 text-red-400"/><div><h2 className="text-lg font-bold text-white">Gateway Controls</h2><p className="text-sm text-amber-300/50 font-mono">Manage XENA server operations</p></div></div>
          <div className="grid grid-cols-2 gap-4"><button onClick={restartServer} className="py-4 rounded-lg bg-red-900/20 border border-red-800/30 hover:bg-red-900/40 text-red-300 text-sm font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-3"><RefreshCw className="w-5 h-5"/>Restart Gateway</button><button onClick={()=>window.location.reload()} className="py-4 rounded-lg bg-amber-900/20 border border-amber-800/30 hover:bg-amber-900/40 text-amber-300 text-sm font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-3"><RefreshCw className="w-5 h-5"/>Reload Panel</button></div>
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
  const [aiMode,setAiMode]=useState<"chill"|"serious">(()=>(localStorage.getItem("xena_ai_mode")as"chill"|"serious")||"chill");
  const [msgs,setMsgs]=useState<ChatMessage[]>([{sender:"ai",text:aiMode==="serious"?"Greetings. I am XENA. How can I assist you?":"cheese",timestamp:new Date().toLocaleTimeString()}]);
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

  useEffect(() => { if (window.location.pathname === "/tiktok") setShowTikTok(true); }, []);
  useEffect(()=>{localStorage.setItem("xena_engine",engine);},[engine]);
  useEffect(()=>{localStorage.setItem("xena_proxy_mode",proxyMode);},[proxyMode]);
  useEffect(()=>{localStorage.setItem("xena_ai_mode",aiMode);},[aiMode]);
  useEffect(()=>{localStorage.setItem("xena_shortcuts",JSON.stringify(shortcuts));},[shortcuts]);
  useEffect(()=>{localStorage.setItem("xena_ddg_mode",ddgMode);},[ddgMode]);
  useEffect(()=>{const i=setInterval(()=>setFactIndex(p=>(p+1)%funFacts.length),12000);return ()=>clearInterval(i);},[]);

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
      const r=await fetch("/api/auth/validate-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
      const d=await r.json();
      if(d.valid&&d.level==="developer"){setDevUnlocked(true);sessionStorage.setItem("xena_dev","true");window.history.pushState({},"","/dev-console");setAccessCodeInput("");}
      else if(d.valid&&d.level==="admin"){setAdminUnlocked(true);sessionStorage.setItem("xena_admin","true");sessionStorage.setItem("xena_admin_code",code);window.history.pushState({},"","/admin-console");setAccessCodeInput("");}
      else alert("Invalid access code");
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
    const userMsg:ChatMessage={sender:"user",text:txt,timestamp:new Date().toLocaleTimeString()};
    setMsgs(prev=>[...prev,userMsg]);setChatInput("");setAiLoad(true);
    try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:txt,mode:aiMode})});const d=await r.json();const rt=d.response||(aiMode==="serious"?"I'm not sure how to respond.":"cheese");setMsgs(prev=>[...prev,{sender:"ai",text:rt,timestamp:new Date().toLocaleTimeString()}]);const hItem:AIHistoryItem={id:`ai-${Date.now()}`,message:txt,response:rt,mode:aiMode,timestamp:new Date().toLocaleTimeString()};setAiHistory(prev=>{const n=[hItem,...prev].slice(0,100);localStorage.setItem("xena_ai_history",JSON.stringify(n));return n;});}catch{setMsgs(prev=>[...prev,{sender:"ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}]);}finally{setAiLoad(false);}
  };
  const toggleAIMode=()=>{const nm=aiMode==="chill"?"serious":"chill";setAiMode(nm);if(msgs.length===1&&msgs[0].sender==="ai"){setMsgs([{...msgs[0],text:nm==="serious"?"Greetings. I am XENA. How can I assist you?":"cheese"}]);}};
  const submitReport=()=>{if(!reportForm.title||!reportForm.details){alert("Fill in title and details");return;}const item:Report={id:`rep-${Date.now()}`,...reportForm};const next=[item,...reports];setReports(next);localStorage.setItem("xena_reports",JSON.stringify(next));fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reportForm)}).catch(()=>{});setReportForm({kind:"bug",title:"",url:"",details:""});alert("Report submitted!");setModal(null);};
  const addShortcut=()=>{if(!newShortcut.name||!newShortcut.url)return;let url=newShortcut.url;if(!url.startsWith("http"))url="https://"+url;const item:Shortcut={id:`sc-${Date.now()}`,name:newShortcut.name,url,icon:url.charAt(8).toUpperCase()};setShortcuts([...shortcuts,item]);setNewShortcut({name:"",url:""});setShowAddShortcut(false);};

  const openAboutBlank=()=>{try{const w=window.open('about:blank','_blank');if(w){w.document.write(`<html style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><head><title>Google Classroom</title></head><body style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><iframe src="${window.location.origin}/" style="position:fixed;top:0;left:0;bottom:0;right:0;width:100%;height:100%;border:none;margin:0;padding:0;overflow:hidden;z-index:999999;"></iframe></body></html>`);w.document.close();}else alert("Popup blocked!");}catch{}};
  const openBlobUrl=()=>{try{const h='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Google Classroom</title><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;}iframe{width:100%;height:100%;border:none;position:fixed;top:0;left:0;bottom:0;right:0;}</style></head><body><iframe src="'+window.location.origin+'/"></iframe></body></html>';const b=new Blob([h],{type:"text/html"});const u=URL.createObjectURL(b);window.open(u,"_blank");}catch{}};

  // FULL-PAGE ROUTES
  if(window.location.pathname==="/dev-console"&&devUnlocked)return<DevConsole onClose={()=>{window.history.pushState({},"","/");setDevUnlocked(false);sessionStorage.removeItem("xena_dev");}} reports={reports}/>;
  if(window.location.pathname==="/admin-console"&&adminUnlocked)return<AdminConsole onClose={()=>{window.history.pushState({},"","/");setAdminUnlocked(false);sessionStorage.removeItem("xena_admin");}} reports={reports}/>;
  if(showTikTok||window.location.pathname==="/tiktok")return<TikTokClone onBack={()=>{setShowTikTok(false);window.history.pushState({},"","/");}}/>;

  return (
    <div className="w-full h-screen flex flex-col bg-black text-white overflow-hidden select-none font-sans">
      {/* TOP BAR */}
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

      {/* TABS BAR */}
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
          <button onClick={()=>{if(devUnlocked){window.history.pushState({},"","/dev-console");}else if(adminUnlocked){window.history.pushState({},"","/admin-console");}}} className="flex items-center gap-1 px-2.5 h-7.5 rounded-md border border-zinc-800 bg-black text-zinc-400 hover:text-white hover:border-zinc-500 text-[10px] font-mono font-medium">{devUnlocked?"DEV":adminUnlocked?"ADMIN":"🔮"}</button>
          <button onClick={()=>setAiOpen(!aiOpen)} className="w-7.5 h-7.5 flex items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 p-[1.5px] hover:scale-105 shadow-[0_0_10px_rgba(168,85,247,0.45)]"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] text-white">🔮</div></button>
        </div>
      </section>
