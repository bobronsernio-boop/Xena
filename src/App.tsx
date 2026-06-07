import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send,
  Activity, ExternalLink, Shield, MessageSquare, Bug, ChevronRight, Trash2,
  Cpu, Lock, Terminal, Users, Bell, RefreshCw, BookOpen, Clock, Star
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
    default: return `https://duckduckgo.com/?q=${enc}`;
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
  "The shortest war in history was 38 minutes (Zanzibar vs England).",
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
  // === TABS ===
  const [tabs,setTabs]=useState<Tab[]>([{id:"tab-1",title:"XENA Engine",url:"",proxyUrl:""}]);
  const [activeTabId,setActiveTabId]=useState("tab-1");
  const [urlInput,setUrlInput]=useState("");
  const [startInput,setStartInput]=useState("");
  const [engine,setEngine]=useState(()=>localStorage.getItem("xena_engine")||"ddg");
  const [shieldOn,setShieldOn]=useState(true);
  const [proxyMode,setProxyMode]=useState(()=>localStorage.getItem("xena_proxy_mode")||"sw");
  const [factIndex,setFactIndex]=useState(Math.floor(Math.random()*funFacts.length));
  const [modal,setModal]=useState<"settings"|"report"|"dev"|"admin"|null>(null);
  
  // === AI ===
  const [aiOpen,setAiOpen]=useState(false);
  const [chatInput,setChatInput]=useState("");
  const [aiLoad,setAiLoad]=useState(false);
  const [aiMode,setAiMode]=useState<"chill"|"serious">(()=>(localStorage.getItem("xena_ai_mode") as "chill"|"serious")||"chill");
  const [msgs,setMsgs]=useState<ChatMessage[]>([{sender:"ai",text:getDefaultAIMsg("chill"),timestamp:new Date().toLocaleTimeString()}]);

  // === SETTINGS ===
  const [cloakOn,setCloakOn]=useState(()=>localStorage.getItem("xena_cloak")==="true");
  const [escKey,setEscKey]=useState(()=>localStorage.getItem("xena_escape_key")||"Escape");
  const [escUrl,setEscUrl]=useState(()=>localStorage.getItem("xena_escape_url")||"https://classroom.google.com");
  const [time,setTime]=useState("");
  const [ping,setPing]=useState(25);
  
  // === REPORTS ===
  const [reports,setReports]=useState<Report[]>(()=>{const r=localStorage.getItem("xena_reports");return r?JSON.parse(r):[];});
  const [reportForm,setReportForm]=useState({kind:"bug",title:"",url:"",details:""});
  
  // === SHORTCUTS ===
  const [shortcuts,setShortcuts]=useState<Shortcut[]>(()=>{
    const r=localStorage.getItem("xena_shortcuts");
    return r?JSON.parse(r):[];
  });
  const [showAddShortcut,setShowAddShortcut]=useState(false);
  const [newShortcut,setNewShortcut]=useState({name:"",url:""});
  
  // === HISTORY ===
  const [searchHistory,setSearchHistory]=useState<SearchHistoryItem[]>(()=>{
    const r=localStorage.getItem("xena_search_history");return r?JSON.parse(r):[];
  });
  const [aiHistory,setAiHistory]=useState<AIHistoryItem[]>(()=>{
    const r=localStorage.getItem("xena_ai_history");return r?JSON.parse(r):[];
  });
  
  // === ACCESS CODES ===
  const [accessCodeInput,setAccessCodeInput]=useState("");
  const [devUnlocked,setDevUnlocked]=useState(sessionStorage.getItem("xena_dev")==="true");
  const [adminUnlocked,setAdminUnlocked]=useState(sessionStorage.getItem("xena_admin")==="true");
  
  // === ADMIN ===
  const [announcements,setAnnouncements]=useState<any[]>([]);
  const [announceForm,setAnnounceForm]=useState({message:"",link:""});
  const [adminStats,setAdminStats]=useState<any>(null);
  const [settingsTab,setSettingsTab]=useState<"general"|"history"|"launchers">("general");

  const activeTab=tabs.find(t=>t.id===activeTabId)||tabs[0];
  const iframeRef=useRef<HTMLIFrameElement>(null);

  function getDefaultAIMsg(mode:string):string {
    return mode==="serious"?"Greetings. I am XENA. How can I assist you?":"cheese";
  }

  // Persist
  useEffect(()=>{localStorage.setItem("xena_engine",engine);},[engine]);
  useEffect(()=>{localStorage.setItem("xena_proxy_mode",proxyMode);},[proxyMode]);
  useEffect(()=>{localStorage.setItem("xena_ai_mode",aiMode);},[aiMode]);
  useEffect(()=>{localStorage.setItem("xena_shortcuts",JSON.stringify(shortcuts));},[shortcuts]);
  
  // Rotate fun fact every 12s
  useEffect(()=>{
    const i=setInterval(()=>setFactIndex(prev=>(prev+1)%funFacts.length),12000);
    return ()=>clearInterval(i);
  },[]);

  // Cloak
  useEffect(()=>{
    localStorage.setItem("xena_cloak",String(cloakOn));
    if(cloakOn){document.title="Google Classroom";let l:any=document.querySelector("link[rel*='icon']");if(!l){l=document.createElement("link");l.type="image/x-icon";l.rel="shortcut icon";document.head.appendChild(l);}l.href="https://ssl.gstatic.com/classroom/favicon.png";}else{document.title="XENA Browser";}
  },[cloakOn]);

  // Escape key
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key===escKey)window.location.href=escUrl;};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[escKey,escUrl]);

  // Time & ping
  useEffect(()=>{const u=()=>{setTime(new Date().toLocaleTimeString("en-US",{hour12:true}));setPing(Math.floor(Math.random()*16)+12);};u();const i=setInterval(u,1000);return()=>clearInterval(i);},[]);

  // Sync URL input
  useEffect(()=>{setUrlInput(activeTab.url);},[activeTabId,activeTab.url]);

  // Register SW on mount
  useEffect(()=>{
    if('serviceWorker' in navigator && proxyMode==='sw'){
      navigator.serviceWorker.register('/xena-sw.js').catch(()=>{});
    }
  },[proxyMode]);

  const checkAccessCode = async (code: string) => {
  try {
    const resp = await fetch("/api/auth/validate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await resp.json();
    if (data.valid && data.level === "developer") {
      setDevUnlocked(true);
      sessionStorage.setItem("xena_dev", "true");
      setModal("dev");
      setAccessCodeInput("");
    } else if (data.valid && data.level === "admin") {
      setAdminUnlocked(true);
      sessionStorage.setItem("xena_admin", "true");
      setModal("admin");
      setAccessCodeInput("");
      fetchAdminStats();
    } else {
      alert("Invalid access code");
    }
  } catch {
    alert("Error validating code");
  }
};

  const fetchAdminStats=async()=>{
    try{
      const r=await fetch("/api/admin/stats");const d=await r.json();setAdminStats(d);
    }catch{}
  };

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
    
    // Save search history
    if(!input.startsWith("/")&&!input.startsWith("http")){
      const ts=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
      const item:SearchHistoryItem={id:`s-${Date.now()}`,query:input,engine,timestamp:ts};
      setSearchHistory(prev=>{const n=[item,...prev].slice(0,50);localStorage.setItem("xena_search_history",JSON.stringify(n));return n;});
    }
    
    setTabs(tabs.map(t=>t.id===activeTabId?{...t,title:getDomain(fu),url:fu,proxyUrl:pp}:t));
  };

  const refresh=()=>{if(iframeRef.current)iframeRef.current.src=iframeRef.current.src;};

  // === AI ===
  const sendMsg=async()=>{
    const txt=chatInput.trim();
    if(!txt||aiLoad)return;
    const userMsg:ChatMessage={sender:"user",text:txt,timestamp:new Date().toLocaleTimeString()};
    setMsgs(prev=>[...prev,userMsg]);
    setChatInput("");setAiLoad(true);
    try{
      const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:txt,mode:aiMode})});
      const data=await resp.json();
      const respText=data.response||(aiMode==="serious"?"I'm not sure how to respond to that.":"cheese");
      setMsgs(prev=>[...prev,{sender:"ai",text:respText,timestamp:new Date().toLocaleTimeString()}]);
      // Save AI history
      const hItem:AIHistoryItem={id:`ai-${Date.now()}`,message:txt,response:respText,mode:aiMode,timestamp:new Date().toLocaleTimeString()};
      setAiHistory(prev=>{const n=[hItem,...prev].slice(0,100);localStorage.setItem("xena_ai_history",JSON.stringify(n));return n;});
    }catch{
      setMsgs(prev=>[...prev,{sender:"ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}]);
    }
    finally{setAiLoad(false);}
  };

  const toggleAIMode=()=>{
    const newMode=aiMode==="chill"?"serious":"chill";
    setAiMode(newMode);
    if(msgs.length===1&&msgs[0].sender==="ai"){
      setMsgs([{...msgs[0],text:getDefaultAIMsg(newMode)}]);
    }
  };

  // === REPORT ===
  const submitReport=()=>{
    if(!reportForm.title||!reportForm.details){alert("Fill in title and details");return;}
    const item:Report={id:`rep-${Date.now()}`,...reportForm};
    const next=[item,...reports];setReports(next);localStorage.setItem("xena_reports",JSON.stringify(next));
    fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reportForm)}).catch(()=>{});
    setReportForm({kind:"bug",title:"",url:"",details:""});alert("Report submitted!");setModal(null);
  };

  // === SHORTCUTS ===
  const addShortcut=()=>{
    if(!newShortcut.name||!newShortcut.url)return;
    let url=newShortcut.url;
    if(!url.startsWith("http"))url="https://"+url;
    const item:Shortcut={id:`sc-${Date.now()}`,name:newShortcut.name,url,icon:url.charAt(8).toUpperCase()};
    setShortcuts([...shortcuts,item]);
    setNewShortcut({name:"",url:""});setShowAddShortcut(false);
  };

  // === ADMIN ===
  const sendAnnouncement=async()=>{
    if(!announceForm.message)return;
    await fetch("/api/admin/announcement",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(announceForm)});
    setAnnounceForm({message:"",link:""});
    alert("Announcement sent!");
  };

  const restartServer=async()=>{
    if(confirm("Are you sure you want to restart XENA Gateway?")){
      await fetch("/api/admin/restart",{method:"POST"});
      alert("Restart initiated");
    }
  };

  // === LAUNCHERS ===
  const openAboutBlank=()=>{
    try{
      const w=window.open('about:blank','_blank');
      if(w){w.document.write(`<html style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><head><title>Google Classroom</title></head><body style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><iframe src="${window.location.origin}/" style="position:fixed;top:0;left:0;bottom:0;right:0;width:100%;height:100%;border:none;margin:0;padding:0;overflow:hidden;z-index:999999;"></iframe></body></html>`);w.document.close();}
      else alert("Popup blocked!");
    }catch{}
  };
  const openBlobUrl=()=>{
    try{
      const h=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Google Classroom</title><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;}iframe{width:100%;height:100%;border:none;position:fixed;top:0;left:0;bottom:0;right:0;}</style></head><body><iframe src="${window.location.origin}/"></iframe></body></html>`;
      const b=new Blob([h],{type:"text/html"});const u=URL.createObjectURL(b);window.open(u,"_blank");
    }catch{}
  };

  // === GREETING ===
  const getGreeting=()=>{
    const h=new Date().getHours();
    if(h<12)return "Good morning";
    if(h<17)return "Good afternoon";
    return "Good evening";
  };

  // Render
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
          <button onClick={()=>setAiOpen(!aiOpen)} className="w-7.5 h-7.5 flex items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 p-[1.5px] hover:scale-105 shadow-[0_0_10px_rgba(168,85,247,0.45)]"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] text-white">🔮</div></button>
        </div>
      </section>

      {/* MAIN CONTENT */}
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
              
              {/* SEARCH BAR with random facts as placeholder */}
              <form onSubmit={e=>{e.preventDefault();go(startInput);}} className="w-full max-w-xl flex h-11 rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden focus-within:border-zinc-500 transition-all duration-150 mb-2">
                <select value={engine} onChange={e=>setEngine(e.target.value)} className="px-3 bg-zinc-900 text-zinc-400 text-xs border-r border-zinc-800 outline-none cursor-pointer font-medium">
                  <option value="ddg">DDG</option><option value="google">Google</option><option value="bing">Bing</option>
                </select>
                <input type="text" value={startInput} onChange={e=>setStartInput(e.target.value)} 
                  placeholder={`Did you know? ${funFacts[factIndex]}`} 
                  spellCheck={false} className="flex-1 px-4 bg-transparent outline-none text-white text-sm placeholder-zinc-500 placeholder-opacity-70"/>
                <button type="submit" className="px-5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold tracking-wider uppercase transition-all">Go</button>
              </form>

              {/* SHORTCUTS: Only AI + user-added shortcuts */}
              <div className="flex flex-wrap justify-center gap-2 mb-6 mt-4">
                {/* AI button - always there */}
                <button onClick={()=>setAiOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 transition-all">
                  <Sparkles className="w-3 h-3 text-purple-400"/>AI
                </button>
                
                {/* User shortcuts */}
                {shortcuts.map(sc=>(
                  <button key={sc.id} onClick={()=>go(sc.url)} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all group relative">
                    <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-400">{sc.icon}</span>
                    <span>{sc.name}</span>
                    <button onClick={e=>{e.stopPropagation();setShortcuts(prev=>prev.filter(s=>s.id!==sc.id));}} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-2 h-2"/></button>
                  </button>
                ))}
                
                {/* Add shortcut button */}
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

              {/* Status */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono"><Activity className="w-3 h-3"/>{time} · {ping}ms · {PROXY_MODES.find(m=>m.id===proxyMode)?.badge||"SW ENGINE"}</div>
            </div>
          </div>
        )}
      </main>

      {/* ==================== AI SIDEBAR ==================== */}
      <section className={`fixed top-0 bottom-0 right-0 w-80 bg-black border-l border-zinc-800 z-50 shadow-2xl flex flex-col transition-all duration-300 transform ${aiOpen?"translate-x-0":"translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white"/>
            <span className="text-sm font-semibold text-white">XENA AI</span>
          </div>
          <div className="flex items-center gap-2">
            {/* AI Mode Toggle */}
            <button onClick={toggleAIMode} className={`text-[9px] font-mono font-bold tracking-widest px-2 py-1 rounded border transition-all ${
              aiMode==="serious" 
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60" 
                : "bg-purple-950/40 text-purple-400 border-purple-900/60"
            }`}>
              {aiMode==="serious" ? "😐 Serious" : "😎 Chill"}
            </button>
            <button onClick={()=>setAiOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {msgs.map((m,i)=>(
            <div key={i} className={`flex ${m.sender==="user"?"justify-end":"justify-start"}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                m.sender==="user"?"bg-zinc-700 text-white":"bg-zinc-800 text-zinc-200"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {aiLoad&&<div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono px-2"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-150"></span><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-300"></span><span>thinking...</span></div>}
        </div>
        <div className="border-t border-zinc-800 p-3">
          <div className="flex gap-2">
            <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} 
              onKeyDown={e=>e.key==="Enter"&&sendMsg()} 
              placeholder={aiMode==="serious"?"Ask me anything...":"..."} 
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-zinc-600 placeholder-zinc-600"/>
            <button onClick={sendMsg} disabled={aiLoad} className="px-3 py-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 disabled:opacity-50"><Send className="w-4 h-4 text-white"/></button>
          </div>
        </div>
      </section>

      {/* ==================== SETTINGS MODAL ==================== */}
      {modal==="settings"&&(
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={()=>setModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <button onClick={()=>setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-zinc-800 px-2">
              {["general","history","launchers"].map(t=>(
                <button key={t} onClick={()=>setSettingsTab(t as any)} className={`flex-1 py-2.5 text-[10px] font-mono tracking-wider uppercase border-b-2 text-center transition-all ${
                  settingsTab===t?"border-white text-white font-bold":"border-transparent text-zinc-500 hover:text-zinc-300"
                }`}>
                  {t==="general"?"Stealth":t==="history"?"History":"Launchers"}
                </button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* GENERAL / STEALTH */}
              {settingsTab==="general"&&(
                <>
                  {/* Cloak */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-black">
                    <div><span className="block text-xs font-semibold text-zinc-200">Classroom Cloak</span><span className="block text-[10px] text-zinc-500 mt-0.5 font-mono">Disguises tab as Google Classroom</span></div>
                    <button onClick={()=>setCloakOn(!cloakOn)} className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider font-mono ${cloakOn?"bg-white/10 text-white border border-zinc-700":"bg-zinc-950 text-zinc-600 border border-zinc-800"}`}>{cloakOn?"ON":"OFF"}</button>
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
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Access Code */}
                  <div className="space-y-2 pt-2">
                    <span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Access Codes</span>
                    <div className="flex gap-2">
                      <input type="text" value={accessCodeInput} onChange={e=>setAccessCodeInput(e.target.value.toUpperCase())} 
                        placeholder="Enter code..." maxLength={5}
                        className="flex-1 h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-mono text-white outline-none focus:border-zinc-500 uppercase tracking-widest"/>
                      <button onClick={()=>checkAccessCode(accessCodeInput)} className="h-9 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold">Unlock</button>
                    </div>
                    {devUnlocked&&<button onClick={()=>setModal("dev")} className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-cyan-400 font-mono">Open Developer Console</button>}
                    {adminUnlocked&&<button onClick={()=>{setModal("admin");fetchAdminStats();}} className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-amber-400 font-mono">Open Admin Console</button>}
                  </div>
                </>
              )}

              {/* HISTORY */}
              {settingsTab==="history"&&(
                <div className="space-y-4">
                  {/* Search History */}
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

                  {/* AI History */}
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

              {/* LAUNCHERS */}
              {settingsTab==="launchers"&&(
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border border-zinc-800 bg-black space-y-2">
                    <span className="block text-xs font-semibold text-zinc-200">Stealth Frame Launchers</span>
                    <p className="text-[10px] text-zinc-500 font-mono">Open XENA in a new window disguised as Google Classroom</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button onClick={openAboutBlank} className="py-2 px-3 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-center transition-all">Open About:Blank</button>
                      <button onClick={openBlobUrl} className="py-2 px-3 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-center transition-all">Open Blob:URL</button>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-zinc-800 bg-black">
                    <span className="block text-xs font-semibold text-zinc-200 mb-1">Quick Tips</span>
                    <ul className="text-[10px] text-zinc-400 font-mono space-y-1">
                      <li>• Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">{escKey}</kbd> to escape to {escUrl}</li>
                      <li>• Use codes: <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-cyan-400">PNG6G</kbd> (Dev) or <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-amber-400">V46D9</kbd> (Admin)</li>
                      <li>• Switch AI mode between Chill and Serious</li>
                      <li>• Add custom shortcuts on the home page</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== REPORT MODAL ==================== */}
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
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mr-1.5 ${
                          rep.kind==="bug"?"bg-red-500/10 text-red-400":"bg-cyan-500/10 text-cyan-400"
                        }`}>{rep.kind==="bug"?"🐛 Bug":"💡 Suggestion"}</span>
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

      {/* ==================== DEVELOPER CONSOLE ==================== */}
      {modal==="dev"&&devUnlocked&&(
        <div className="fixed inset-0 z-50 bg-[#0a0e1a]/95 flex items-center justify-center backdrop-blur-sm" onClick={()=>setModal(null)}>
          <div className="bg-[#0d1530] border border-[#1a2850] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl shadow-blue-900/30 flex flex-col" onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0d1530] to-[#141e42] px-6 py-4 border-b border-[#1a2850] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400"/>
                  <span className="text-xs font-mono font-bold text-cyan-400 tracking-widest uppercase">Developer Console</span>
                </div>
                <h1 className="text-xl font-bold text-white mt-1">
                  {getGreeting()} <span className="text-cyan-400">G</span>
                </h1>
                <p className="text-[10px] text-blue-300/70 font-mono mt-0.5">XENA Neural Engine v2.0 • Access Level: DEVELOPER</p>
              </div>
              <button onClick={()=>setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-md bg-[#1a2850]/50 hover:bg-[#1a2850] text-blue-300 hover:text-white border border-[#2a3870]"><X className="w-4 h-4"/></button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0a0e1a] border border-[#1a2850] rounded-lg p-3">
                  <div className="text-[9px] font-mono text-blue-400/70 uppercase tracking-wider">Bug Reports</div>
                  <div className="text-2xl font-bold text-white mt-1">{reports.length}</div>
                  <div className="text-[8px] text-blue-300/50 font-mono mt-1">{reports.filter(r=>r.kind==="bug").length} bugs · {reports.filter(r=>r.kind==="suggestion").length} suggestions</div>
                </div>
                <div className="bg-[#0a0e1a] border border-[#1a2850] rounded-lg p-3">
                  <div className="text-[9px] font-mono text-blue-400/70 uppercase tracking-wider">Active Viewers</div>
                  <div className="text-2xl font-bold text-white mt-1">{tabs.length}</div>
                  <div className="text-[8px] text-blue-300/50 font-mono mt-1">open tabs · {shortcuts.length} shortcuts</div>
                </div>
                <div className="bg-[#0a0e1a] border border-[#1a2850] rounded-lg p-3">
                  <div className="text-[9px] font-mono text-blue-400/70 uppercase tracking-wider">System Uptime</div>
                  <div className="text-2xl font-bold text-white mt-1">{Math.floor(performance.now()/1000/60)}m</div>
                  <div className="text-[8px] text-blue-300/50 font-mono mt-1">{proxyMode} mode · {PROXY_MODES.find(m=>m.id===proxyMode)?.badge}</div>
                </div>
              </div>

              {/* Bug Reports List */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bug className="w-3.5 h-3.5 text-red-400"/>
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Bug Reports & Insights</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {reports.length===0?(
                    <div className="bg-[#0a0e1a] border border-[#1a2850] rounded-lg p-4 text-center">
                      <p className="text-[10px] text-blue-300/50 font-mono">No bug reports yet.</p>
                    </div>
                  ):reports.map(rep=>(
                    <div key={rep.id} className="bg-[#0a0e1a] border border-[#1a2850] rounded-lg p-3 flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            rep.kind==="bug"?"bg-red-500/20 text-red-300":"bg-cyan-500/20 text-cyan-300"
                          }`}>{rep.kind==="bug"?"BUG":"SUGGESTION"}</span>
                          <span className="text-[10px] font-semibold text-white truncate">{rep.title}</span>
                        </div>
                        <p className="text-[9px] text-blue-300/60 font-mono truncate">{rep.details}</p>
                        {rep.url&&<p className="text-[8px] text-cyan-400/50 font-mono mt-0.5">{rep.url}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Codes & Fixes */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400"/>
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Known Issues & Fixes</span>
                </div>
                <div className="bg-[#0a0e1a] border border-[#1a2850] rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-[9px] font-mono shrink-0 mt-0.5">●</span>
                    <div>
                      <span className="text-[10px] font-mono text-red-300">ERR_SW_FETCH</span>
                      <p className="text-[9px] text-blue-300/60 font-mono">Service Worker failed to fetch. Reload page or switch to Reverse Proxy mode in Settings.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400 text-[9px] font-mono shrink-0 mt-0.5">●</span>
                    <div>
                      <span className="text-[10px] font-mono text-yellow-300">ERR_IFRAME_BLOCK</span>
                      <p className="text-[9px] text-blue-300/60 font-mono">Site blocked by X-Frame-Options. The proxy strips these headers automatically.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 text-[9px] font-mono shrink-0 mt-0.5">●</span>
                    <div>
                      <span className="text-[10px] font-mono text-cyan-300">ERR_DYNAMIC_ASSET</span>
                      <p className="text-[9px] text-blue-300/60 font-mono">5-char prefix clash resolved. Proxy routes now take priority over asset handler.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* HackerAI Access */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-3.5 h-3.5 text-emerald-400"/>
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">HackerAI Integration</span>
                </div>
                <a href="https://hackerai.co" target="_blank" rel="noopener noreferrer" 
                  className="block bg-gradient-to-r from-[#0d1530] to-[#141e42] border border-emerald-800/50 rounded-lg p-4 hover:border-emerald-600/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-emerald-400"/>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">HackerAI.co</p>
                      <p className="text-[10px] text-blue-300/50 font-mono">Access AI penetration testing assistant</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-500/50 group-hover:text-emerald-400 transition-colors"/>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADMIN CONSOLE ==================== */}
      {modal==="admin"&&adminUnlocked&&(
        <div className="fixed inset-0 z-50 bg-[#0a0e1a]/95 flex items-center justify-center backdrop-blur-sm" onClick={()=>setModal(null)}>
          <div className="bg-[#1a0d0d] border border-[#502020] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl shadow-red-900/30 flex flex-col" onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a0d0d] to-[#2a1414] px-6 py-4 border-b border-[#502020] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400"/>
                  <span className="text-xs font-mono font-bold text-amber-400 tracking-widest uppercase">Admin Console</span>
                </div>
                <h1 className="text-xl font-bold text-white mt-1">
                  Sup <span className="text-amber-400">G</span>
                </h1>
                <p className="text-[10px] text-amber-300/70 font-mono mt-0.5">XENA Gateway Administration • Access Level: ADMIN</p>
              </div>
              <button onClick={()=>setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-md bg-[#2a1414]/50 hover:bg-[#2a1414] text-amber-300 hover:text-white border border-[#502020]"><X className="w-4 h-4"/></button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0a0606] border border-[#502020] rounded-lg p-3">
                  <div className="text-[9px] font-mono text-amber-400/70 uppercase tracking-wider">Bug Reports</div>
                  <div className="text-2xl font-bold text-white mt-1">{reports.length}</div>
                  <div className="text-[8px] text-amber-300/50 font-mono mt-1">{reports.filter(r=>r.important).length} marked important</div>
                </div>
                <div className="bg-[#0a0606] border border-[#502020] rounded-lg p-3">
                  <div className="text-[9px] font-mono text-amber-400/70 uppercase tracking-wider">Announcements</div>
                  <div className="text-2xl font-bold text-white mt-1">{announcements.length}</div>
                  <div className="text-[8px] text-amber-300/50 font-mono mt-1">active broadcasts</div>
                </div>
                <div className="bg-[#0a0606] border border-[#502020] rounded-lg p-3">
                  <div className="text-[9px] font-mono text-amber-400/70 uppercase tracking-wider">Tabs Open</div>
                  <div className="text-2xl font-bold text-white mt-1">{tabs.length}</div>
                  <div className="text-[8px] text-amber-300/50 font-mono mt-1">active sessions</div>
                </div>
              </div>

              {/* Bug Reports with Importance */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bug className="w-3.5 h-3.5 text-red-400"/>
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Bug Reports</span>
                  <span className="text-[8px] text-amber-400/60 font-mono">Click to mark as important</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {reports.length===0?(
                    <div className="bg-[#0a0606] border border-[#502020] rounded-lg p-4 text-center">
                      <p className="text-[10px] text-amber-300/50 font-mono">No bug reports yet.</p>
                    </div>
                  ):reports.map(rep=>(
                    <div key={rep.id} 
                      onClick={()=>{
                        const updated = reports.map(r => r.id===rep.id ? {...r, important: !r.important} : r);
                        setReports(updated);
                        localStorage.setItem("xena_reports", JSON.stringify(updated));
                      }}
                      className={`bg-[#0a0606] border rounded-lg p-3 flex items-start justify-between cursor-pointer transition-all ${
                        rep.important ? "border-red-500/50 bg-red-900/10" : "border-[#502020] hover:border-amber-700/50"
                      }`}>
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            rep.kind==="bug"?"bg-red-500/20 text-red-300":"bg-cyan-500/20 text-cyan-300"
                          }`}>{rep.kind==="bug"?"BUG":"SUGGESTION"}</span>
                          <span className="text-[10px] font-semibold text-white truncate">{rep.title}</span>
                          {rep.important && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400"/>}
                        </div>
                        <p className="text-[9px] text-amber-300/60 font-mono truncate">{rep.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Send Announcement */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-3.5 h-3.5 text-amber-400"/>
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Send Announcement</span>
                </div>
                <div className="bg-[#0a0606] border border-[#502020] rounded-lg p-3 space-y-2">
                  <input type="text" value={announceForm.message} onChange={e=>setAnnounceForm({...announceForm,message:e.target.value})} placeholder="Announcement message..." className="w-full h-9 rounded-lg border border-[#502020] bg-[#0a0606] px-3 text-xs text-white outline-none focus:border-amber-700 placeholder-amber-800"/>
                  <input type="text" value={announceForm.link} onChange={e=>setAnnounceForm({...announceForm,link:e.target.value})} placeholder="Optional link URL..." className="w-full h-9 rounded-lg border border-[#502020] bg-[#0a0606] px-3 text-xs text-white outline-none focus:border-amber-700 placeholder-amber-800"/>
                  <button onClick={sendAnnouncement} className="w-full py-2 rounded-lg bg-amber-800/30 border border-amber-700/30 hover:bg-amber-800/50 text-amber-300 text-xs font-mono font-bold tracking-wider transition-all">Broadcast Announcement</button>
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-3.5 h-3.5 text-red-400"/>
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Gateway Controls</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={restartServer} className="py-3 rounded-lg bg-red-900/20 border border-red-800/30 hover:bg-red-900/40 text-red-300 text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5"/> Restart Gateway
                  </button>
                  <button onClick={()=>window.location.reload()} className="py-3 rounded-lg bg-amber-900/20 border border-amber-800/30 hover:bg-amber-900/40 text-amber-300 text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5"/> Reload Panel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== FOOTER ==================== */}
      <footer className="h-6 border-t border-zinc-900 bg-black text-[9px] font-mono tracking-wider text-zinc-500 flex items-center justify-between px-3 shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.2 font-bold uppercase text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>SECURE</span>
          <span className="text-zinc-800">|</span>
          <span className="uppercase text-zinc-600">{PROXY_MODES.find(m=>m.id===proxyMode)?.badge||"SW ENGINE"}</span>
          {devUnlocked&&<span className="text-cyan-500 font-bold">DEV</span>}
          {adminUnlocked&&<span className="text-amber-500 font-bold">ADMIN</span>}
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
