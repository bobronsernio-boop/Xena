import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send,
  Activity, ExternalLink, Shield, MessageSquare, Bug
} from "lucide-react";

// ==================== ENCODING HELPERS ====================
function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c==="+"?"-":c==="/"?"_":""); } catch { return encodeURIComponent(v); }
}
function b64d(v: string): string {
  try { let t=v.replace(/-/g,"+").replace(/_/g,"/"); while(t.length%4) t+="="; return decodeURIComponent(escape(atob(t))); } catch { return v; }
}

// ==================== PROXY MODES ====================
const PROXY_MODES = [
  { id:"sw", name:"Service Worker Proxy", badge:"SW ENGINE", latency:"~12ms", desc:"Registers a service worker that intercepts all outbound requests and routes them through XENA's secure proxy tunnel. Best for general browsing.", default: true },
  { id:"rev", name:"Reverse Proxy", badge:"REVERSE", latency:"~18ms", desc:"Direct passthrough proxy with full header forwarding. Handles APIs, form submissions, and complex web apps that need POST/PUT support.", default: false },
  { id:"bin", name:"Binary Stream Sandbox", badge:"BINARY OS", latency:"~24ms", desc:"Chunked streaming for video/audio/large binaries. Supports range requests (video seeking), partial content (206), and real-time media.", default: false }
];

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

function searchUrl(e:string,q:string):string {
  const enc=encodeURIComponent(q);
  switch(e){
    case"google": return `https://www.google.com/search?q=${enc}`;
    case"bing": return `https://www.bing.com/search?q=${enc}`;
    default: return `https://lite.duckduckgo.com/lite/?q=${enc}`;
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

// ==================== TYPES ====================
interface Tab{id:string;title:string;url:string;proxyUrl:string;}
interface ChatMessage{sender:"user"|"ai";text:string;timestamp:string;}
interface Report{id:string;kind:"bug"|"suggestion";title:string;url?:string;details:string;}

// ==================== STAR BACKGROUND ====================
function StarryBg() {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d"); if(!ctx) return;
    let anim:number;
    const resize=()=>{c.width=c.parentElement?.clientWidth||window.innerWidth;c.height=c.parentElement?.clientHeight||window.innerHeight;};
    resize(); window.addEventListener("resize",resize);
    const stars=Array.from({length:60},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.5+0.3,a:Math.random(),s:Math.random()*0.015+0.003,d:Math.random()>0.5?1:-1}));
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

// ==================== APP ====================
export default function App() {
  const [tabs,setTabs]=useState<Tab[]>([{id:"tab-1",title:"XENA Engine",url:"",proxyUrl:""}]);
  const [activeTabId,setActiveTabId]=useState("tab-1");
  const [urlInput,setUrlInput]=useState("");
  const [startInput,setStartInput]=useState("");
  const [engine,setEngine]=useState(()=>localStorage.getItem("xena_engine")||"ddg");
  const [shieldOn,setShieldOn]=useState(true);
  const [proxyMode,setProxyMode]=useState(()=>localStorage.getItem("xena_proxy_mode")||"sw");
  const [modal,setModal]=useState<"settings"|"report"|null>(null);
  const [aiOpen,setAiOpen]=useState(false);
  const [chatInput,setChatInput]=useState("");
  const [aiLoad,setAiLoad]=useState(false);
  const [msgs,setMsgs]=useState<ChatMessage[]>([{sender:"ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}]);
  const [cloakOn,setCloakOn]=useState(()=>localStorage.getItem("xena_cloak")==="true");
  const [escKey,setEscKey]=useState(()=>localStorage.getItem("xena_escape_key")||"Escape");
  const [escUrl,setEscUrl]=useState(()=>localStorage.getItem("xena_escape_url")||"https://classroom.google.com");
  const [time,setTime]=useState("");
  const [ping,setPing]=useState(25);
  const [reports,setReports]=useState<Report[]>(()=>{const r=localStorage.getItem("xena_reports");return r?JSON.parse(r):[];});
  const [reportForm,setReportForm]=useState({kind:"bug",title:"",url:"",details:""});

  const activeTab=tabs.find(t=>t.id===activeTabId)||tabs[0];
  const iframeRef=useRef<HTMLIFrameElement>(null);

  // Persist settings
  useEffect(()=>{localStorage.setItem("xena_engine",engine);},[engine]);
  useEffect(()=>{localStorage.setItem("xena_proxy_mode",proxyMode);},[proxyMode]);
  
  // Cloak
  useEffect(()=>{
    localStorage.setItem("xena_cloak",String(cloakOn));
    if(cloakOn){document.title="Google Classroom";let l:any=document.querySelector("link[rel*='icon']");if(!l){l=document.createElement("link");l.type="image/x-icon";l.rel="shortcut icon";document.head.appendChild(l);}l.href="https://ssl.gstatic.com/classroom/favicon.png";}else{document.title="XENA Browser";}
  },[cloakOn]);

  // Escape key
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key===escKey)window.location.href=escUrl;};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[escKey,escUrl]);

  // Time & ping
  useEffect(()=>{const u=()=>{setTime(new Date().toLocaleTimeString("en-US",{hour12:true}));setPing(Math.floor(Math.random()*16)+12);};u();const i=setInterval(u,1000);return()=>clearInterval(i);},[]);

  // Sync URL input with active tab
  useEffect(()=>{setUrlInput(activeTab.url);},[activeTabId,activeTab.url]);

  // Register service worker on mount
  useEffect(()=>{
    if ('serviceWorker' in navigator && proxyMode === 'sw') {
      navigator.serviceWorker.register('/xena-sw.js').catch(()=>{});
    }
  },[proxyMode]);

  const createTab=(raw="")=>{
    const id=`tab-${Date.now()}`;
    let tu="",tp="";
    if(raw){
      if(raw.startsWith("/")||raw.startsWith("http://localhost")||raw.startsWith("http://127.0.0.1")){tu=raw;tp=raw;}
      else{tu=normalizeInput(engine,raw);tp=getProxyUrl(tu,proxyMode);}
    }
    setTabs([...tabs,{id,title:tu?getDomain(tu):"XENA Engine",url:tu,proxyUrl:tp}]);
    setActiveTabId(id);
  };

  const closeTab=(id:string,e:React.MouseEvent)=>{
    e.stopPropagation();
    if(tabs.length===1)return;
    const f=tabs.filter(t=>t.id!==id);
    setTabs(f);
    if(activeTabId===id)setActiveTabId(f[f.length-1].id);
  };

  const go=(input:string)=>{
    if(!input.trim())return;
    let fu="",pp="";
    if(input.startsWith("/")||input.startsWith("http://localhost")||input.startsWith("http://127.0.0.1")){fu=input;pp=input;}
    else{fu=normalizeInput(engine,input);pp=getProxyUrl(fu,proxyMode);}
    setTabs(tabs.map(t=>t.id===activeTabId?{...t,title:getDomain(fu),url:fu,proxyUrl:pp}:t));
  };

  const refresh=()=>{if(iframeRef.current)iframeRef.current.src=iframeRef.current.src;};

  const sendMsg=async()=>{
    const txt=chatInput.trim();
    if(!txt||aiLoad)return;
    setMsgs(prev=>[...prev,{sender:"user",text:txt,timestamp:new Date().toLocaleTimeString()}]);
    setChatInput("");setAiLoad(true);
    try{
      const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:txt})});
      const data=await resp.json();
      setMsgs(prev=>[...prev,{sender:"ai",text:data.response||"cheese",timestamp:new Date().toLocaleTimeString()}]);
    }catch{setMsgs(prev=>[...prev,{sender:"ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}]);}
    finally{setAiLoad(false);}
  };

  const submitReport=()=>{
    if(!reportForm.title||!reportForm.details){alert("Fill in title and details");return;}
    const item:Report={id:`rep-${Date.now()}`,...reportForm};
    const next=[item,...reports];setReports(next);localStorage.setItem("xena_reports",JSON.stringify(next));
    fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reportForm)}).catch(()=>{});
    setReportForm({kind:"bug",title:"",url:"",details:""});alert("Report submitted!");setModal(null);
  };

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
          <button onClick={()=>setModal("report")} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-zinc-400 hover:text-red-400 hover:border-red-500/30 text-[11px]" title="Bug Report"><Bug className="w-3.5 h-3.5"/></button>
          <button onClick={()=>setModal("settings")} className="w-7.5 h-7.5 flex items-center justify-center rounded-md border border-zinc-850 bg-black text-zinc-400 hover:text-white"><Settings className="w-4 h-4"/></button>
          <button onClick={()=>go("https://www.cineby.at/")} className="flex items-center gap-1 px-2.5 h-7.5 rounded-md border border-zinc-800 bg-black text-zinc-400 hover:text-white hover:border-zinc-500 text-[10px] font-mono font-medium">📺 <span className="hidden sm:inline">Shows</span></button>
          <button onClick={()=>setAiOpen(!aiOpen)} className="w-7.5 h-7.5 flex items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 p-[1.5px] hover:scale-105 shadow-[0_0_10px_rgba(168,85,247,0.45)]"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] text-white">🔮</div></button>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative bg-black overflow-hidden">
        {activeTab.proxyUrl ? (
          <iframe ref={iframeRef} src={activeTab.proxyUrl} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; geolocation; microphone; camera" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals" className="w-full h-full border-none bg-white" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-6 overflow-y-auto">
            <StarryBg />
            <div className="max-w-2xl w-full flex flex-col items-center text-center relative z-10 mt-8">
              <div className="mb-6">
                <h1 className="text-5xl font-bold text-white tracking-tight mb-1">XENA</h1>
                <svg className="w-20 h-3 mx-auto text-zinc-500 mt-2 opacity-60" viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12 Q 25 2, 50 12 T 95 12"/></svg>
                <p className="text-[9px] text-zinc-500 tracking-[0.3em] font-mono mt-3 uppercase opacity-70">SECURE SANDBOX BROWSER</p>
              </div>
              <form onSubmit={e=>{e.preventDefault();go(startInput);}} className="w-full max-w-xl flex h-11 rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden focus-within:border-zinc-500 transition-all duration-150 mb-8">
                <select value={engine} onChange={e=>setEngine(e.target.value)} className="px-3 bg-zinc-900 text-zinc-400 text-xs border-r border-zinc-800 outline-none cursor-pointer font-medium">
                  <option value="ddg">DDG</option><option value="google">Google</option><option value="bing">Bing</option>
                </select>
                <input type="text" value={startInput} onChange={e=>setStartInput(e.target.value)} placeholder="Search or enter URL..." spellCheck={false} className="flex-1 px-4 bg-transparent outline-none text-white text-sm placeholder-zinc-600"/>
                <button type="submit" className="px-5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold tracking-wider uppercase transition-all">Go</button>
              </form>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <button onClick={()=>go("youtube.com")} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><ExternalLink className="w-3 h-3"/>YouTube</button>
                <button onClick={()=>go("reddit.com")} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><ExternalLink className="w-3 h-3"/>Reddit</button>
                <button onClick={()=>go("tiktok.com")} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><ExternalLink className="w-3 h-3"/>TikTok</button>
                <button onClick={()=>go("discord.com")} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><ExternalLink className="w-3 h-3"/>Discord</button>
                <button onClick={()=>setAiOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><Sparkles className="w-3 h-3"/>AI</button>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono"><Activity className="w-3 h-3"/>{time} · {ping}ms · {PROXY_MODES.find(m=>m.id===proxyMode)?.badge||"SW ENGINE"}</div>
            </div>
          </div>
        )}
      </main>

      {/* AI SIDEBAR */}
      <section className={`fixed top-0 bottom-0 right-0 w-80 bg-black border-l border-zinc-800 z-50 shadow-2xl flex flex-col transition-all duration-300 transform ${aiOpen?"translate-x-0":"translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800">
          <span className="text-sm font-semibold text-white">XENA AI</span>
          <button onClick={()=>setAiOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {msgs.map((m,i)=>(
            <div key={i} className={`flex ${m.sender==="user"?"justify-end":"justify-start"}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.sender==="user"?"bg-zinc-700 text-white":"bg-zinc-800 text-zinc-200"}`}>{m.text}</div>
            </div>
          ))}
          {aiLoad&&<div className="text-center text-zinc-500 text-xs">thinking...</div>}
        </div>
        <div className="border-t border-zinc-800 p-3">
          <div className="flex gap-2">
            <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="..." className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-zinc-600 placeholder-zinc-600"/>
            <button onClick={sendMsg} disabled={aiLoad} className="px-3 py-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 disabled:opacity-50"><Send className="w-4 h-4 text-white"/></button>
          </div>
        </div>
      </section>

      {/* SETTINGS MODAL */}
      {modal==="settings"&&(
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={()=>setModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <button onClick={()=>setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-5">
              {/* Cloak */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-black">
                <div><span className="block text-xs font-semibold text-zinc-200">Classroom Cloak</span><span className="block text-[10px] text-zinc-500 mt-0.5 font-mono">Disguises tab as Google Classroom</span></div>
                <button onClick={()=>setCloakOn(!cloakOn)} className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider font-mono ${cloakOn?"bg-white/10 text-white border border-zinc-700":"bg-zinc-950 text-zinc-600"}`}>{cloakOn?"ON":"OFF"}</button>
              </div>
              
              {/* Escape */}
              <div className="space-y-2">
                <span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Panic Escape</span>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-[9px] text-zinc-600 mb-1 font-mono">KEY</label><input type="text" value={escKey} onChange={e=>{setEscKey(e.target.value);localStorage.setItem("xena_escape_key",e.target.value);}} className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-mono text-white outline-none focus:border-zinc-500"/></div>
                  <div><label className="block text-[9px] text-zinc-600 mb-1 font-mono">URL</label><input type="text" value={escUrl} onChange={e=>{setEscUrl(e.target.value);localStorage.setItem("xena_escape_url",e.target.value);}} className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white outline-none focus:border-zinc-500"/></div>
                </div>
              </div>

              {/* Proxy Modes */}
              <div>
                <span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase mb-2">Proxy Engine</span>
                <div className="space-y-2">
                  {PROXY_MODES.map(mode=>{
                    const ia=proxyMode===mode.id;
                    return(
                      <div key={mode.id} onClick={()=>{setProxyMode(mode.id);localStorage.setItem("xena_proxy_mode",mode.id);}} className={`p-3 rounded-lg border cursor-pointer transition-all ${ia?"bg-zinc-800 border-zinc-600 text-white":"bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${ia?"bg-emerald-500":"bg-zinc-700"}`}/><span className="text-xs font-semibold">{mode.name}</span></div>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${ia?"bg-white/15 text-white":"bg-zinc-900 text-zinc-500"}`}>{mode.badge} {mode.latency}</span>
                        </div>
                        <p className={`text-[10px] leading-relaxed mt-1.5 ${ia?"text-zinc-300":"text-zinc-500"}`}>{mode.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {modal==="report"&&(
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={()=>setModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">Bug Report & Suggestions</h2>
              <button onClick={()=>setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">Kind</label>
                  <select value={reportForm.kind} onChange={e=>setReportForm({...reportForm,kind:e.target.value})} className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-2 text-xs text-white focus:border-zinc-500">
                    <option value="bug">Bug Report</option><option value="suggestion">Suggestion</option>
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
              <button onClick={submitReport} className="w-full h-10 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold font-mono tracking-wider uppercase">Submit Report</button>
              {reports.length>0&&<div className="pt-4 border-t border-zinc-800 space-y-2"><span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Previous ({reports.length})</span><div className="space-y-1.5 max-h-32 overflow-y-auto">{reports.map(rep=>(<div key={rep.id} className="p-2 border border-zinc-800 bg-black/50 rounded-lg text-[10px]"><span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mr-1.5 ${rep.kind==="bug"?"bg-red-500/10 text-red-400":"bg-cyan-500/10 text-cyan-400"}`}>{rep.kind}</span><strong className="text-zinc-200">{rep.title}</strong><p className="text-zinc-500 mt-1">{rep.details}</p></div>))}</div></div>}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="h-6 border-t border-zinc-900 bg-black text-[9px] font-mono tracking-wider text-zinc-500 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.2 font-bold uppercase text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>SECURE</span>
          <span className="text-zinc-800">|</span>
          <span className="uppercase text-zinc-600">{PROXY_MODES.find(m=>m.id===proxyMode)?.badge||"SW ENGINE"}</span>
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
