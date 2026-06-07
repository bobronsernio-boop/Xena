import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send,
  Activity, Shield, Bug, Cpu, Terminal, Star
} from "lucide-react";

function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c==="+"?"-":c==="/"?"_":""); } catch { return encodeURIComponent(v); }
}

const PROXY_MODES = [
  { id:"sw", name:"Service Worker Proxy", badge:"SW ENGINE", latency:"~12ms", default: true },
  { id:"rev", name:"Reverse Proxy", badge:"REVERSE", latency:"~18ms", default: false },
  { id:"bin", name:"Binary Stream Sandbox", badge:"BINARY OS", latency:"~24ms", default: false }
];

const DDG_OPTIONS: Record<string, {name:string, url:string, note:string}> = {
  ddg1: { name: "DuckDuckGo Standard", url: "https://duckduckgo.com/?q=", note: "Standard DDG" },
  ddg2: { name: "DDG HTML (No JS)", url: "https://html.duckduckgo.com/html/?q=", note: "Lightweight HTML version" },
  ddg3: { name: "DDG Lite (✅RECOMMENDED)", url: "https://lite.duckduckgo.com/lite/?q=", note: "Minimal, ZERO JavaScript, works in any iframe" },
  ddg4: { name: "Startpage (Alt)", url: "https://www.startpage.com/sp/search?query=", note: "Privacy-focused alternative" },
  ddg5: { name: "Bing Fallback", url: "https://www.bing.com/search?q=", note: "Bing search engine" }
};

interface Tab{id:string;title:string;url:string;proxyUrl:string;}
interface ChatMessage{sender:"user"|"ai";text:string;timestamp:string;}
interface Report{id:string;kind:"bug"|"suggestion";title:string;url?:string;details:string;important?:boolean;}
interface Shortcut{id:string;name:string;url:string;icon:string;}
interface SearchHistoryItem{id:string;query:string;engine:string;timestamp:string;}
interface AIHistoryItem{id:string;message:string;response:string;mode:string;timestamp:string;}

const funFacts = [
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than a year on Venus.",
  "Bananas are berries, but strawberries aren't.",
  "Honey never spoils. Archaeologists found 3000-year-old honey still edible.",
  "The Eiffel Tower grows 6 inches taller in summer.",
  "Wombat poop is cube-shaped so it doesn't roll away.",
  "There are more trees on Earth than stars in the Milky Way.",
  "Hot water freezes faster than cold water (Mpemba effect).",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The universe's color is beige, officially named 'Cosmic Latte'."
];

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

function getGreeting(): string {
  const h = new Date().getHours();
  if(h<12) return "Good morning";
  if(h<17) return "Good afternoon";
  return "Good evening";
}

export default function App() {
  const [tabs,setTabs]=useState<Tab[]>([{id:"tab-1",title:"XENA Engine",url:"",proxyUrl:""}]);
  const [activeTabId,setActiveTabId]=useState("tab-1");
  const [urlInput,setUrlInput]=useState("");
  const [startInput,setStartInput]=useState("");
  const [engine,setEngine]=useState(()=>localStorage.getItem("xena_engine")||"ddg");
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

  const activeTab=tabs.find(t=>t.id===activeTabId)||tabs[0];
  const iframeRef=useRef<HTMLIFrameElement>(null);

  // === PERSIST ===
  useEffect(()=>{localStorage.setItem("xena_engine",engine)},[engine]);
  useEffect(()=>{localStorage.setItem("xena_proxy_mode",proxyMode)},[proxyMode]);
  useEffect(()=>{localStorage.setItem("xena_ai_mode",aiMode)},[aiMode]);
  useEffect(()=>{localStorage.setItem("xena_shortcuts",JSON.stringify(shortcuts))},[shortcuts]);
  useEffect(()=>{localStorage.setItem("xena_ddg_mode",ddgMode)},[ddgMode]);
  useEffect(()=>{const i=setInterval(()=>setFactIndex(prev=>(prev+1)%funFacts.length),12000);return ()=>clearInterval(i)},[]);
  useEffect(()=>{
    localStorage.setItem("xena_cloak",String(cloakOn));
    if(cloakOn){document.title="Google Classroom";let l:any=document.querySelector("link[rel*='icon']");if(!l){l=document.createElement("link");l.type="image/x-icon";l.rel="shortcut icon";document.head.appendChild(l)}l.href="https://ssl.gstatic.com/classroom/favicon.png"}else{document.title="XENA Browser"}
  },[cloakOn]);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key===escKey)window.location.href=escUrl};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[escKey,escUrl]);
  useEffect(()=>{const u=()=>{setTime(new Date().toLocaleTimeString("en-US",{hour12:true}));setPing(Math.floor(Math.random()*16)+12)};u();const i=setInterval(u,1000);return()=>clearInterval(i)},[]);
  useEffect(()=>{setUrlInput(activeTab.url)},[activeTabId,activeTab.url]);
  useEffect(()=>{if('serviceWorker'in navigator&&proxyMode==='sw'){navigator.serviceWorker.register('/xena-sw.js').catch(()=>{})}},[proxyMode]);

  // === URL HELPERS ===
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
    const mode = localStorage.getItem("xena_ddg_mode") || "ddg3";
    switch(e){
      case"google": return `https://www.google.com/search?q=${enc}`;
      case"bing": return `https://www.bing.com/search?q=${enc}`;
      default: return (DDG_OPTIONS[mode]?.url || "https://lite.duckduckgo.com/lite/?q=") + enc;
    }
  }

  function getProxyUrl(urlStr: string, mode: string): string {
    if (!urlStr) return "";
    if (urlStr.startsWith("/") || urlStr.startsWith("http://localhost") || urlStr.startsWith("http://127.0.0.1")) return urlStr;
    const ytId = getYtId(urlStr);
    if (ytId) return `/view?v=${encodeURIComponent(ytId)}`;
    return `/${mode}/${b64e(urlStr)}`;
  }

  function getDomain(u:string):string { try { return new URL(u).hostname.replace("www.",""); } catch { return "Web"; } }

  // === ACCESS CODE ===
  const checkAccessCode=async(code:string)=>{
    try{
      const resp=await fetch("/api/auth/validate-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
      const data=await resp.json();
      if(data.valid&&data.level==="developer"){setDevUnlocked(true);sessionStorage.setItem("xena_dev","true");window.location.href="/dev-console"}
      else{alert("Invalid access code")}
    }catch{alert("Error validating code")}
  };

  // === TABS ===
  const go = (input: string) => {
    if (!input.trim()) return;
    let fu = "", pp = "";
    
    if (input.startsWith("/") || input.startsWith("http://localhost") || input.startsWith("http://127.0.0.1")) {
      fu = input;
      pp = input;
    } else {
      // Check if it looks like a URL with a domain
      if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(input.trim()) && !input.includes(" ")) {
        fu = "https://" + input.trim();
      } else if (/^https?:\/\//i.test(input.trim())) {
        fu = input.trim();
      } else {
        // Search query — build search URL
        fu = searchUrl(engine, input);
      }
      
      // === CRITICAL DDG FIX: ALWAYS proxy DDG/search engine URLs ===
      // This ensures DDG Lite goes through the proxy and the iframe can load it
      pp = `/${proxyMode}/${b64e(fu)}`;
    }
    
    // Save search history
    if (!input.startsWith("/") && !input.startsWith("http")) {
      const ts = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const item: SearchHistoryItem = { id: `s-${Date.now()}`, query: input, engine, timestamp: ts };
      setSearchHistory(prev => { const n = [item, ...prev].slice(0, 50); localStorage.setItem("xena_search_history", JSON.stringify(n)); return n; });
    }
    
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, title: getDomain(fu), url: fu, proxyUrl: pp } : t));
  };

  const refresh=()=>{if(iframeRef.current)iframeRef.current.src=iframeRef.current.src};
  const createTab=(raw="")=>{
    const id=`tab-${Date.now()}`;let tu="",tp="";
    if(raw){
      if(raw.startsWith("/")||raw.startsWith("http://localhost")||raw.startsWith("http://127.0.0.1")){tu=raw;tp=raw}
      else if(/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw.trim())&&!raw.includes(" ")){tu="https://"+raw.trim();tp=`/${proxyMode}/${b64e(tu)}`}
      else if(/^https?:\/\//i.test(raw.trim())){tu=raw.trim();tp=`/${proxyMode}/${b64e(tu)}`}
      else{tu=searchUrl(engine,raw);tp=`/${proxyMode}/${b64e(tu)}`}
    }
    setTabs([...tabs,{id,title:tu?getDomain(tu):"XENA Engine",url:tu,proxyUrl:tp}]);setActiveTabId(id)
  };
  const closeTab=(id:string,e:React.MouseEvent)=>{e.stopPropagation();if(tabs.length===1)return;const f=tabs.filter(t=>t.id!==id);setTabs(f);if(activeTabId===id)setActiveTabId(f[f.length-1].id)};

  // === AI ===
  const sendMsg=async()=>{
    const txt=chatInput.trim();if(!txt||aiLoad)return;
    const userMsg:ChatMessage={sender:"user",text:txt,timestamp:new Date().toLocaleTimeString()};
    setMsgs(prev=>[...prev,userMsg]);setChatInput("");setAiLoad(true);
    try{
      const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:txt,mode:aiMode})});
      const data=await resp.json();
      const respText=data.response||(aiMode==="serious"?"I'm not sure.":"cheese");
      setMsgs(prev=>[...prev,{sender:"ai",text:respText,timestamp:new Date().toLocaleTimeString()}]);
      const hItem:AIHistoryItem={id:`ai-${Date.now()}`,message:txt,response:respText,mode:aiMode,timestamp:new Date().toLocaleTimeString()};
      setAiHistory(prev=>{const n=[hItem,...prev].slice(0,100);localStorage.setItem("xena_ai_history",JSON.stringify(n));return n})
    }catch{setMsgs(prev=>[...prev,{sender:"ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}])}
    finally{setAiLoad(false)}
  };
  const toggleAIMode=()=>{const n=aiMode==="chill"?"serious":"chill";setAiMode(n);if(msgs.length===1&&msgs[0].sender==="ai")setMsgs([{...msgs[0],text:n==="serious"?"Greetings. I am XENA.":"cheese"}])};

  // === REPORT ===
  const submitReport=()=>{
    if(!reportForm.title||!reportForm.details){alert("Fill in title and details");return;}
    const item:Report={id:`rep-${Date.now()}`,...reportForm};const next=[item,...reports];setReports(next);localStorage.setItem("xena_reports",JSON.stringify(next));
    fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reportForm)}).catch(()=>{});setReportForm({kind:"bug",title:"",url:"",details:""});alert("Report submitted!");setModal(null)
  };

  // === SHORTCUTS ===
  const addShortcut=()=>{
    if(!newShortcut.name||!newShortcut.url)return;let url=newShortcut.url;if(!url.startsWith("http"))url="https://"+url;
    const item:Shortcut={id:`sc-${Date.now()}`,name:newShortcut.name,url,icon:url.charAt(8).toUpperCase()};setShortcuts([...shortcuts,item]);setNewShortcut({name:"",url:""});setShowAddShortcut(false)
  };

  // === LAUNCHERS ===
  const openAboutBlank=()=>{
    try{const w=window.open('about:blank','_blank');if(w){w.document.write('<html style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><head><title>Google Classroom</title></head><body style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><iframe src="'+window.location.origin+'/" style="position:fixed;top:0;left:0;bottom:0;right:0;width:100%;height:100%;border:none;margin:0;padding:0;overflow:hidden;z-index:999999;"></iframe></body></html>');w.document.close()}else alert("Popup blocked!")}catch{}
  };
  const openBlobUrl=()=>{
    try{const h='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Google Classroom</title><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;position:fixed;top:0;left:0;bottom:0;right:0}</style></head><body><iframe src="'+window.location.origin+'/"></iframe></body></html>';const b=new Blob([h],{type:"text/html"});const u=URL.createObjectURL(b);window.open(u,"_blank")}catch{}
  };

  // === DEV CONSOLE FULL PAGE ===
  if(window.location.pathname==="/dev-console"&&devUnlocked){
    return (
      <div className="w-full min-h-screen bg-[#060a18] text-white overflow-y-auto">
        <header className="bg-gradient-to-r from-[#0a1030] via-[#0d1540] to-[#0a1030] border-b border-[#1a2850] px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-cyan-400 text-xs tracking-[0.2em] font-mono"><Cpu className="w-4 h-4"/> DEVELOPER CONSOLE</div>
              <button onClick={()=>{window.location.href="/";setDevUnlocked(false);sessionStorage.removeItem("xena_dev")}} className="px-4 py-2 bg-[#1a2850]/50 border border-[#2a3870] rounded-lg text-blue-300 hover:text-white text-sm font-mono">✕ CLOSE</button>
            </div>
            <h1 className="text-5xl font-bold text-white mb-1">{getGreeting()} <span className="text-cyan-400">G</span></h1>
            <p className="text-blue-300/50 font-mono text-sm">XENA Neural Engine v2.0</p>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          <div className="grid grid-cols-2
