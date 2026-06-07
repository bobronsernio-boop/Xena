import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send,
  Activity, Shield, Bug, Cpu, Terminal, Star
} from "lucide-react";

function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c==="+"?"-":c==="/"?"_":""); } catch { return encodeURIComponent(v); }
}

const PROXY_MODES = [
  { id:"sw", name:"Service Worker Proxy", badge:"SW ENGINE", latency:"~12ms" },
  { id:"rev", name:"Reverse Proxy", badge:"REVERSE", latency:"~18ms" },
  { id:"bin", name:"Binary Stream Sandbox", badge:"BINARY OS", latency:"~24ms" }
];

const DDG_OPTIONS: Record<string, {name:string, url:string, note:string}> = {
  ddg3: { name: "DDG Lite ✅BEST", url: "https://lite.duckduckgo.com/lite/?q=", note: "Zero JS, works in iframes" },
  ddg2: { name: "DDG HTML (No JS)", url: "https://html.duckduckgo.com/html/?q=", note: "Lightweight" },
  ddg1: { name: "DDG Standard", url: "https://duckduckgo.com/?q=", note: "Has frame-busting" },
  ddg4: { name: "Startpage (Alt)", url: "https://www.startpage.com/sp/search?query=", note: "Privacy alt" },
  ddg5: { name: "Bing Fallback", url: "https://www.bing.com/search?q=", note: "MS Bing" }
};

interface Tab{id:string;title:string;url:string;proxyUrl:string;}
interface ChatMessage{sender:"user"|"ai";text:string;timestamp:string;}
interface Report{id:string;kind:"bug"|"suggestion";title:string;url?:string;details:string;important?:boolean;}
interface Shortcut{id:string;name:string;url:string;icon:string;}
interface SearchHistoryItem{id:string;query:string;engine:string;timestamp:string;}
interface AIHistoryItem{id:string;message:string;response:string;mode:string;timestamp:string;}

function StarryBg() {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext("2d");if(!ctx)return;let anim:number;const resize=()=>{c.width=c.parentElement?.clientWidth||window.innerWidth;c.height=c.parentElement?.clientHeight||window.innerHeight;};resize();window.addEventListener("resize",resize);const stars=Array.from({length:80},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.5+0.3,a:Math.random(),s:Math.random()*0.015+0.003,d:Math.random()>0.5?1:-1}));const draw=()=>{ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#fff";stars.forEach(st=>{st.a+=st.s*st.d;if(st.a>=1){st.a=1;st.d=-1}else if(st.a<=0.1){st.a=0.1;st.d=1}ctx.globalAlpha=st.a;ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill()});anim=requestAnimationFrame(draw)};draw();return()=>{window.removeEventListener("resize",resize);cancelAnimationFrame(anim)}},[]);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none z-0" />;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if(h<12) return "Good morning"; if(h<17) return "Good afternoon"; return "Good evening";
}

export default function App() {
  const [tabs,setTabs]=useState<Tab[]>([{id:"tab-1",title:"XENA Engine",url:"",proxyUrl:""}]);
  const [activeTabId,setActiveTabId]=useState("tab-1");
  const [urlInput,setUrlInput]=useState("");
  const [engine,setEngine]=useState(()=>localStorage.getItem("xena_engine")||"ddg");
  const [proxyMode,setProxyMode]=useState(()=>localStorage.getItem("xena_proxy_mode")||"sw");
  const [factIndex,setFactIndex]=useState(Math.floor(Math.random()*12));
  const [modal,setModal]=useState<"settings"|"report"|null>(null);
  const [aiOpen,setAiOpen]=useState(false);
  const [chatInput,setChatInput]=useState("");
  const [aiLoad,setAiLoad]=useState(false);
  const [aiMode,setAiMode]=useState<"chill"|"serious">(()=>(localStorage.getItem("xena_ai_mode") as any)||"chill");
  const [msgs,setMsgs]=useState<ChatMessage[]>([{sender:"ai",text:aiMode==="serious"?"Greetings. I am XENA.":"Say cheese.",timestamp:new Date().toLocaleTimeString()}]);
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

  const funFacts = React.useMemo(()=>[
    "Octopuses have three hearts and blue blood.",
    "A day on Venus is longer than a year on Venus.",
    "Bananas are berries, but strawberries aren't.",
    "Honey never spoils. Edible after 3000 years.",
    "The Eiffel Tower grows 6 inches taller in summer.",
    "Wombat poop is cube-shaped so it doesn't roll away.",
    "There are more trees on Earth than stars in the Milky Way.",
    "Hot water can freeze faster than cold water (Mpemba effect).",
    "A jiffy is an actual unit of time: 1/100th of a second.",
    "The universe's color is beige: 'Cosmic Latte'.",
    "Octopuses have blue blood.",
    "Ducks have corkscrew penises."
  ],[]);

  useEffect(()=>{localStorage.setItem("xena_engine",engine)},[engine]);
  useEffect(()=>{localStorage.setItem("xena_proxy_mode",proxyMode)},[proxyMode]);
  useEffect(()=>{localStorage.setItem("xena_ai_mode",aiMode)},[aiMode]);
  useEffect(()=>{localStorage.setItem("xena_shortcuts",JSON.stringify(shortcuts))},[shortcuts]);
  useEffect(()=>{localStorage.setItem("xena_ddg_mode",ddgMode)},[ddgMode]);
  useEffect(()=>{const i=setInterval(()=>setFactIndex(prev=>(prev+1)%funFacts.length),15000);return ()=>clearInterval(i)},[funFacts.length]);
  useEffect(()=>{localStorage.setItem("xena_cloak",String(cloakOn));if(cloakOn){document.title="Google Classroom";let l:any=document.querySelector("link[rel*='icon']");if(!l){l=document.createElement("link");l.type="image/x-icon";l.rel="shortcut icon";document.head.appendChild(l)}l.href="https://ssl.gstatic.com/classroom/favicon.png"}else{document.title="XENA Browser"}},[cloakOn]);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key===escKey)window.location.href=escUrl};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[escKey,escUrl]);
  useEffect(()=>{const u=()=>{setTime(new Date().toLocaleTimeString("en-US",{hour12:true}));setPing(Math.floor(Math.random()*16)+12)};u();const i=setInterval(u,1000);return()=>clearInterval(i)},[]);
  useEffect(()=>{setUrlInput(activeTab.url)},[activeTabId,activeTab.url]);
  useEffect(()=>{if('serviceWorker'in navigator&&proxyMode==='sw'){navigator.serviceWorker.register('/xena-sw.js').catch(()=>{})}},[proxyMode]);

  function getYtId(u: string): string|null { try{const url=new URL(u);if(url.hostname.includes("youtube.com")||url.hostname.includes("youtu.be")){let v=url.searchParams.get("v");if(!v&&url.hostname.includes("youtu.be")) v=url.pathname.replace(/^\//,"").split("?")[0];return v}}catch{const m=u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/i);if(m)return m[1]}return null; }
  function searchUrl(e:string,q:string):string { const enc=encodeURIComponent(q);const mode=localStorage.getItem("xena_ddg_mode")||"ddg3";if(e==="google")return `https://www.google.com/search?q=${enc}`;if(e==="bing")return `https://www.bing.com/search?q=${enc}`;return (DDG_OPTIONS[mode]?.url||"https://lite.duckduckgo.com/lite/?q=")+enc; }
  function getProxyUrl(urlStr:string,mode:string):string{ if(!urlStr)return"";if(urlStr.startsWith("/")||urlStr.startsWith("http://localhost")||urlStr.startsWith("http://127.0.0.1"))return urlStr;const ytId=getYtId(urlStr);if(ytId)return`/view?v=${encodeURIComponent(ytId)}`;return`/${mode}/${b64e(urlStr)}`; }
  function getDomain(u:string):string{ try{return new URL(u).hostname.replace("www.","");}catch{return"Web";} }
const loadUrl = (urlStr: string) => { go(urlStr); };
  const checkAccessCode=async(code:string)=>{try{const resp=await fetch("/api/auth/validate-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});const data=await resp.json();if(data.valid&&data.level==="developer"){setDevUnlocked(true);sessionStorage.setItem("xena_dev","true");window.location.href="/dev-console"}else{alert("Invalid access code")}}catch{alert("Error validating code")}};

  const go=(input:string)=>{if(!input.trim())return;let fu="",pp="";
    if(input.startsWith("/")||input.startsWith("http://localhost")||input.startsWith("http://127.0.0.1")){fu=input;pp=input;}
    else if(/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(input.trim())&&!input.includes(" ")){fu="https://"+input.trim();pp=`/${proxyMode}/${b64e(fu)}`;}
    else if(/^https?:\/\//i.test(input.trim())){fu=input.trim();pp=`/${proxyMode}/${b64e(fu)}`;}
    else{fu=searchUrl(engine,input);pp=`/${proxyMode}/${b64e(fu)}`;}
    if(!input.startsWith("/")&&!input.startsWith("http")){const ts=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});const item:SearchHistoryItem={id:`s-${Date.now()}`,query:input,engine,timestamp:ts};setSearchHistory(prev=>{const n=[item,...prev].slice(0,50);localStorage.setItem("xena_search_history",JSON.stringify(n));return n;});}
    setTabs(tabs.map(t=>t.id===activeTabId?{...t,title:getDomain(fu),url:fu,proxyUrl:pp}:t));
  };

  const refresh=()=>{if(iframeRef.current)iframeRef.current.src=iframeRef.current.src};
  const createTab=(raw="")=>{const id=`tab-${Date.now()}`;let tu="",tp="";if(raw){if(raw.startsWith("/")||raw.startsWith("http://localhost")||raw.startsWith("http://127.0.0.1")){tu=raw;tp=raw}else if(/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw.trim())&&!raw.includes(" ")){tu="https://"+raw.trim();tp=`/${proxyMode}/${b64e(tu)}`}else if(/^https?:\/\//i.test(raw.trim())){tu=raw.trim();tp=`/${proxyMode}/${b64e(tu)}`}else{tu=searchUrl(engine,raw);tp=`/${proxyMode}/${b64e(tu)}`}}setTabs([...tabs,{id,title:tu?getDomain(tu):"XENA Engine",url:tu,proxyUrl:tp}]);setActiveTabId(id);};
  const closeTab=(id:string,e:React.MouseEvent)=>{e.stopPropagation();if(tabs.length===1)return;const f=tabs.filter(t=>t.id!==id);setTabs(f);if(activeTabId===id)setActiveTabId(f[f.length-1].id);};

  const sendMsg=async()=>{const txt=chatInput.trim();if(!txt||aiLoad)return;const userMsg:ChatMessage={sender:"user",text:txt,timestamp:new Date().toLocaleTimeString()};setMsgs(prev=>[...prev,userMsg]);setChatInput("");setAiLoad(true);try{const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:txt,mode:aiMode})});const data=await resp.json();const respText=data.response||"cheese";setMsgs(prev=>[...prev,{sender:"ai",text:respText,timestamp:new Date().toLocaleTimeString()}]);const hItem:AIHistoryItem={id:`ai-${Date.now()}`,message:txt,response:respText,mode:aiMode,timestamp:new Date().toLocaleTimeString()};setAiHistory(prev=>{const n=[hItem,...prev].slice(0,100);localStorage.setItem("xena_ai_history",JSON.stringify(n));return n})}catch{setMsgs(prev=>[...prev,{sender:"ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}])}finally{setAiLoad(false)}};

  const toggleAIMode=()=>{const n=aiMode==="chill"?"serious":"chill";setAiMode(n);if(msgs.length===1&&msgs[0].sender==="ai")setMsgs([{...msgs[0],text:n==="serious"?"Greetings. I am XENA.":"Say cheese."}])};

  const submitReport=()=>{if(!reportForm.title||!reportForm.details){alert("Fill in title and details");return;}const item:Report={id:`rep-${Date.now()}`,...reportForm};const next=[item,...reports];setReports(next);localStorage.setItem("xena_reports",JSON.stringify(next));fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reportForm)}).catch(()=>{});setReportForm({kind:"bug",title:"",url:"",details:""});alert("Report submitted!");setModal(null);};

  const addShortcut=()=>{if(!newShortcut.name||!newShortcut.url)return;let url=newShortcut.url;if(!url.startsWith("http"))url="https://"+url;const item:Shortcut={id:`sc-${Date.now()}`,name:newShortcut.name,url,icon:url.charAt(8).toUpperCase()};setShortcuts([...shortcuts,item]);setNewShortcut({name:"",url:""});setShowAddShortcut(false);};

  const openAboutBlank=()=>{try{const w=window.open('about:blank','_blank');if(w){w.document.write('<html style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><head><title>Google Classroom</title></head><body style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><iframe src="'+window.location.origin+'/" style="position:fixed;top:0;left:0;bottom:0;right:0;width:100%;height:100%;border:none;margin:0;padding:0;overflow:hidden;z-index:999999;"></iframe></body></html>');w.document.close()}else alert("Popup blocked!")}catch{}};
  const openBlobUrl=()=>{try{const h='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Google Classroom</title><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;position:fixed;top:0;left:0;bottom:0;right:0}</style></head><body><iframe src="'+window.location.origin+'/"></iframe></body></html>';const b=new Blob([h],{type:"text/html"});const u=URL.createObjectURL(b);window.open(u,"_blank")}catch{}};

  // === DEV CONSOLE PAGE ===
  if(window.location.pathname==="/dev-console"&&devUnlocked) return <DevConsolePage reports={reports} ping={ping} ddgMode={ddgMode} setDdgMode={setDdgMode} proxyMode={proxyMode} setDevUnlocked={setDevUnlocked} />;
  if(window.location.pathname==="/admin-console"&&devUnlocked) return <AdminConsolePage reports={reports} setReports={setReports} />;

  // === MAIN UI RENDER ===
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0e1a] text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#080c18] border-b border-[#1a1f35] shrink-0">
        <button onClick={()=>{window.history.back()}} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
        <button onClick={()=>{window.history.forward()}} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><ArrowRight className="w-4 h-4" /></button>
        <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><RotateCw className="w-4 h-4" /></button>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none ml-2">
          {tabs.map(t=>(
            <div key={t.id} onClick={()=>setActiveTabId(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0 ${t.id===activeTabId?'bg-white/10 text-white':'text-white/50 hover:text-white hover:bg-white/5'}`}>
              <Globe className="w-3 h-3" />
              <span className="max-w-[100px] truncate">{t.title||"New Tab"}</span>
              {t.id==="tab-1"||<button onClick={(e)=>closeTab(t.id,e)} className="ml-1 p-0.5 rounded hover:bg-white/10"><X className="w-3 h-3" /></button>}
            </div>
          ))}
          <button onClick={()=>createTab()} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white shrink-0"><Plus className="w-3.5 h-3.5" /></button>
        </div>

        {/* Top Right */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-white/30">{time}</span>
          <span className="text-xs font-mono text-green-400/60">{ping}ms</span>
          <button onClick={()=>setModal("report")} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><Bug className="w-4 h-4" /></button>
          <button onClick={()=>setModal("settings")} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><Settings className="w-4 h-4" /></button>
        </div>
      </div>

      {/* URL Bar + Search */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0e1a] border-b border-[#1a1f35] shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-[#12162a] border border-[#1d2340] rounded-xl px-3 py-2 focus-within:border-[#3a4a80] transition-colors">
          <Globe className="w-4 h-4 text-white/30 shrink-0" />
          <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go(urlInput)} placeholder="Search or enter URL..." className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 outline-none" />
          <div className="flex items-center gap-1">
            {engine==="ddg"&&<span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400/60 font-mono">DDG</span>}
            {engine==="google"&&<span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/60 font-mono">G</span>}
            {engine==="bing"&&<span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/60 font-mono">B</span>}
          </div>
        </div>
        <button onClick={()=>go(urlInput)} className="px-4 py-2 bg-gradient-to-r from-[#2a3a70] to-[#1a2a50] rounded-xl text-xs font-medium hover:from-[#3a4a80] hover:to-[#2a3a70]">GO</button>
        <button onClick={()=>setAiOpen(true)} className="px-3 py-2 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 hover:from-cyan-600/40"><Sparkles className="w-3.5 h-3.5 inline mr-1" />AI</button>
      </div>

      {/* Shortcuts + Launch + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-16 flex flex-col items-center gap-2 py-3 bg-[#080c18] border-r border-[#1a1f35] shrink-0">
          {shortcuts.slice(0,5).map(s=>(
            <button key={s.id} onClick={()=>loadUrl(s.url)} className="w-10 h-10 rounded-xl bg-[#12162a] border border-[#1d2340] flex items-center justify-center text-sm font-bold text-white/70 hover:bg-[#1a1f40] hover:border-[#2a3a70] transition-all" title={s.name}>{s.icon}</button>
          ))}
          <button onClick={()=>setShowAddShortcut(true)} className="w-10 h-10 rounded-xl bg-[#12162a] border border-dashed border-[#1d2340] flex items-center justify-center text-white/40 hover:bg-[#1a1f40]"><Plus className="w-4 h-4" /></button>
          <div className="w-8 h-px bg-[#1a1f35] my-1" />
          <button onClick={openAboutBlank} className="w-10 h-10 rounded-xl bg-[#12162a] border border-[#1d2340] flex items-center justify-center text-xs text-white/40 hover:text-white/70" title="about:blank launch">ab</button>
          <button onClick={openBlobUrl} className="w-10 h-10 rounded-xl bg-[#12162a] border border-[#1d2340] flex items-center justify-center text-xs text-white/40 hover:text-white/70" title="Blob launch">bl</button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative bg-[#0a0e1a]">
          {/* Background content when no tab URL */}
          {!activeTab.url && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <StarryBg />
              <div className="relative z-10 text-center px-6">
                <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-display">XENA</div>
                <p className="text-white/30 text-sm mb-8 font-mono">{getGreeting()}. Ready to browse.</p>
                <div className="flex items-center gap-3 justify-center flex-wrap max-w-md mx-auto">
                  {["https://example.com","https://neocities.org","https://wikipedia.org","https://reddit.com"].map(u=>(
                    <button key={u} onClick={()=>loadUrl(u)} className="px-3 py-1.5 bg-[#12162a] border border-[#1d2340] rounded-lg text-xs text-white/50 hover:text-white/80 hover:border-[#2a3a70]">{getDomain(u)}</button>
                  ))}
                </div>
                <p className="mt-6 text-xs text-white/20 font-mono">{funFacts[factIndex]}</p>
              </div>
            </div>
          )}

          {/* Iframe */}
          {activeTab.proxyUrl && (
            <iframe
              ref={iframeRef}
              src={activeTab.proxyUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
              title={activeTab.title}
            />
          )}
        </div>

        {/* AI Chat Panel */}
        {aiOpen && (
          <div className="w-80 bg-[#080c18] border-l border-[#1a1f35] flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f35]">
              <div className="flex items-center gap-2"><Sparkles className={`w-4 h-4 ${aiMode==="chill"?"text-cyan-400":"text-yellow-400"}`} /><span className="text-sm font-medium">XENA AI</span><span className={`text-xs px-1.5 py-0.5 rounded font-mono ${aiMode==="chill"?"bg-cyan-500/10 text-cyan-400":"bg-yellow-500/10 text-yellow-400"}`}>{aiMode}</span></div>
              <div className="flex items-center gap-2">
                <button onClick={toggleAIMode} className={`text-xs px-2 py-1 rounded ${aiMode==="chill"?"bg-cyan-500/10 text-cyan-400":"bg-yellow-500/10 text-yellow-400"}`}>{aiMode==="chill"?"chill":"serious"}</button>
                <button onClick={()=>setAiOpen(false)} className="p-1 rounded hover:bg-white/5 text-white/40"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {msgs.map((m,i)=>(
                <div key={i} className={`p-2 rounded-lg text-sm ${m.sender==="ai"?"bg-[#12162a] text-white/80":"bg-[#1a2a50]/50 text-cyan-300/80 ml-4"}`}>{m.text}</div>
              ))}
              {aiLoad && <div className="flex items-center gap-1 p-2"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-150" /><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-300" /></div>}
            </div>
            <div className="p-3 border-t border-[#1a1f35]">
              <div className="flex gap-2 bg-[#12162a] rounded-xl px-3 py-2 border border-[#1d2340]">
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message..." className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 outline-none" />
                <button onClick={sendMsg} disabled={aiLoad} className="p-1 text-cyan-400 hover:text-cyan-300"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {modal==="settings" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={()=>setModal(null)}>
          <div className="bg-[#080c1a] border border-[#1a1f35] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f35]">
              <h2 className="text-lg font-medium">Settings</h2>
              <button onClick={()=>setModal(null)} className="p-1.5 rounded-lg hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex border-b border-[#1a1f35]">
              {(["general","ddg","history"] as const).map(t=>(
                <button key={t} onClick={()=>setSettingsTab(t)} className={`flex-1 px-4 py-2.5 text-xs font-mono tracking-wider uppercase ${settingsTab===t?"text-cyan-400 border-b-2 border-cyan-400":"text-white/40 hover:text-white/70"}`}>{t}</button>
              ))}
            </div>
            <div className="p-6 overflow-y-auto max-h-[55vh]">
              {settingsTab==="general" && (
                <div className="space-y-6">
                  <div><label className="text-xs text-white/40 font-mono mb-2 block">Search Engine</label>
                    <div className="flex gap-2">{["ddg","google","bing"].map(e=>(<button key={e} onClick={()=>setEngine(e)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm ${engine===e?"bg-cyan-500/10 border border-cyan-500/30 text-cyan-300":"bg-[#12162a] border border-[#1d2340] text-white/50 hover:text-white/80"}`}>{e==="ddg"?"DuckDuckGo":e==="google"?"Google":"Bing"}</button>))}</div>
                  </div>
                  <div><label className="text-xs text-white/40 font-mono mb-2 block">Proxy Engine</label>
                    <div className="flex gap-2">{PROXY_MODES.map(p=>(<button key={p.id} onClick={()=>setProxyMode(p.id)} className={`flex-1 px-3 py-2.5 rounded-lg text-sm ${proxyMode===p.id?"bg-cyan-500/10 border border-cyan-500/30 text-cyan-300":"bg-[#12162a] border border-[#1d2340] text-white/50 hover:text-white/80"}`}>{p.badge}<div className="text-[10px] opacity-50 mt-1">{p.latency}</div></button>))}</div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs text-white/40 font-mono block">Stealth</label>
                    <label className="flex items-center gap-3 p-3 bg-[#12162a] rounded-lg cursor-pointer"><input type="checkbox" checked={cloakOn} onChange={e=>setCloakOn(e.target.checked)} className="accent-cyan-500" /><div><div className="text-sm">Cloak Mode</div><div className="text-xs text-white/30">Changes title & icon to Google Classroom</div></div></label>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs text-white/40 font-mono block">Escape Key</label>
                    <div className="flex gap-2"><input value={escKey} onChange={e=>setEscKey(e.target.value||"Escape")} placeholder="Escape" className="flex-1 bg-[#12162a] border border-[#1d2340] rounded-lg px-3 py-2 text-sm" /><input value={escUrl} onChange={e=>setEscUrl(e.target.value)} placeholder="https://classroom.google.com" className="flex-1 bg-[#12162a] border border-[#1d2340] rounded-lg px-3 py-2 text-sm" /></div>
                    <p className="text-xs text-white/20">Press this key to immediately navigate to the escape URL</p>
                  </div>
                  <div className="pt-4 border-t border-[#1a1f35]">
                    <div className="flex gap-2"><input value={accessCodeInput} onChange={e=>setAccessCodeInput(e.target.value)} placeholder="Access code" className="flex-1 bg-[#12162a] border border-[#1d2340] rounded-lg px-3 py-2 text-sm" /><button onClick={()=>checkAccessCode(accessCodeInput)} className="px-4 py-2 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/20 rounded-lg text-xs text-cyan-300">Unlock</button></div>
                  </div>
                </div>
              )}
              {settingsTab==="ddg" && (
                <div className="space-y-3">
                  <p className="text-xs text-white/30 font-mono mb-4">Select which search engine to use when searching from the URL bar.</p>
                  {Object.entries(DDG_OPTIONS).map(([id,opt])=>(
                    <div key={id} onClick={()=>{setDdgMode(id);localStorage.setItem("xena_ddg_mode",id)}} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${ddgMode===id?"bg-cyan-500/5 border border-cyan-500/20":"bg-[#12162a] border border-[#1d2340] hover:border-[#2a3870]"}`}>
                      <div><div className="text-sm font-medium">{opt.name}</div><div className="text-xs text-white/30 mt-0.5">{opt.note}</div></div>
                      {ddgMode===id && <div className="px-2 py-1 bg-cyan-500/10 rounded text-xs text-cyan-400">ACTIVE</div>}
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg">
                    <p className="text-xs text-yellow-300/70">DDG Lite has zero JavaScript and works perfectly in iframes via the proxy. All searches route through XENA's proxy which strips X-Frame-Options headers.</p>
                  </div>
                </div>
              )}
              {settingsTab==="history" && (
                <div className="space-y-4">
                  <div><h3 className="text-xs text-white/40 font-mono mb-2">Search History ({searchHistory.length})</h3>
                    {searchHistory.length===0?(<p className="text-xs text-white/20">No search history</p>):
                    <div className="space-y-1 max-h-32 overflow-y-auto">{searchHistory.slice(0,20).map(h=>(<div key={h.id} className="flex justify-between p-2 bg-[#12162a] rounded-lg text-xs"><span>{h.query}</span><span className="text-white/30">{h.engine} · {h.timestamp}</span></div>))}</div>}
                  </div>
                  <div><h3 className="text-xs text-white/40 font-mono mb-2">AI Chat History ({aiHistory.length})</h3>
                    {aiHistory.length===0?(<p className="text-xs text-white/20">No AI history</p>):
                    <div className="space-y-1 max-h-32 overflow-y-auto">{aiHistory.slice(0,20).map(h=>(<div key={h.id} className="p-2 bg-[#12162a] rounded-lg text-xs"><span className="text-cyan-400">Q:</span> {h.message.slice(0,40)} <span className="text-white/30">· {h.mode} · {h.timestamp}</span></div>))}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {modal==="report" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={()=>setModal(null)}>
          <div className="bg-[#080c1a] border border-[#1a1f35] rounded-2xl w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f35]">
              <h2 className="text-lg font-medium">Report Bug</h2>
              <button onClick={()=>setModal(null)} className="p-1.5 rounded-lg hover:bg-white/5"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">{(["bug","suggestion"] as const).map(k=>(<button key={k} onClick={()=>setReportForm({...reportForm,kind:k})} className={`flex-1 px-3 py-2 rounded-lg text-xs ${reportForm.kind===k?"bg-cyan-500/10 border border-cyan-500/30 text-cyan-300":"bg-[#12162a] border border-[#1d2340] text-white/50"}`}>{k==="bug"?"🐞 Bug":"💡 Suggestion"}</button>))}</div>
              <input value={reportForm.title} onChange={e=>setReportForm({...reportForm,title:e.target.value})} placeholder="Title" className="w-full bg-[#12162a] border border-[#1d2340] rounded-lg px-3 py-2 text-sm" />
              <input value={reportForm.url} onChange={e=>setReportForm({...reportForm,url:e.target.value})} placeholder="URL (optional)" className="w-full bg-[#12162a] border border-[#1d2340] rounded-lg px-3 py-2 text-sm" />
              <textarea value={reportForm.details} onChange={e=>setReportForm({...reportForm,details:e.target.value})} placeholder="Details..." rows={4} className="w-full bg-[#12162a] border border-[#1d2340] rounded-lg px-3 py-2 text-sm resize-none" />
              <button onClick={submitReport} className="w-full py-2.5 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/20 rounded-xl text-sm text-cyan-300 hover:from-cyan-600/40">Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== ADD SHORTCUT MODAL ====================
{showAddShortcut && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={()=>setShowAddShortcut(false)}>
    <div className="bg-[#080c1a] border border-[#1a1f35] rounded-2xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
      <h3 className="text-sm font-medium mb-4">Add Shortcut</h3>
      <div className="space-y-3">
        <input value={newShortcut.name} onChange={e=>setNewShortcut({...newShortcut,name:e.target.value})} placeholder="Name" className="w-full bg-[#12162a] border border-[#1d2340] rounded-lg px-3 py-2 text-sm" />
        <input value={newShortcut.url} onChange={e=>setNewShortcut({...newShortcut,url:e.target.value})} placeholder="URL" className="w-full bg-[#12162a] border border-[#1d2340] rounded-lg px-3 py-2 text-sm" />
        <button onClick={addShortcut} className="w-full py-2 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/20 rounded-xl text-sm text-cyan-300">Add</button>
      </div>
    </div>
  </div>
)}
// ==================== END ADD SHORTCUT ====================

// ==================== DEV CONSOLE PAGE ====================
function DevConsolePage({reports,ping,ddgMode,setDdgMode,proxyMode,setDevUnlocked}:any){
  const funFacts = ["Octopuses have three hearts.","A day on Venus is longer than a year.","Bananas are berries.","Honey never spoils.","Eiffel Tower grows in summer.","Wombat poop is cube-shaped.","More trees than stars in Milky Way.","Hot water freezes faster.","A jiffy is 1/100th sec.","Universe color: Cosmic Latte."];
  const [factIdx,setFactIdx]=useState(0);
  useEffect(()=>{const i=setInterval(()=>setFactIdx(p=>(p+1)%funFacts.length),8000);return()=>clearInterval(i)},[]);
  const [adminStats,setAdminStats]=useState<any>(null);
  useEffect(()=>{fetch("/api/admin/stats",{headers:{"x-admin-code":localStorage.getItem("xena_admin_code")||""}}).then(r=>r.json()).then(setAdminStats).catch(()=>{})},[]);

  return (
    <div className="w-full min-h-screen bg-[#060a18] text-white overflow-y-auto">
      <header className="bg-gradient-to-r from-[#0a1030] via-[#0d1540] to-[#0a1030] border-b border-[#1a2850] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-cyan-400 text-xs tracking-[0.2em] font-mono"><Cpu className="w-4 h-4"/> DEVELOPER CONSOLE</div>
            <button onClick={()=>{window.location.href="/";setDevUnlocked(false);sessionStorage.removeItem("xena_dev")}} className="px-4 py-2 bg-[#1a2850]/50 border border-[#2a3870] rounded-lg text-blue-300 hover:text-white text-sm font-mono">✕ CLOSE</button>
          </div>
          <h1 className="text-5xl font-bold text-white mb-1 font-display">{getGreeting()} <span className="text-cyan-400">G</span></h1>
          <p className="text-blue-300/50 font-mono text-sm">XENA Neural Engine v2.0</p>
          <p className="text-xs text-blue-300/20 font-mono mt-2">{funFacts[factIdx]}</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label:"Active Sessions", value:"1", icon:<Activity className="w-4 h-4"/>, color:"text-cyan-400", bg:"bg-cyan-400/5" },
            { label:"Ping", value:`${ping}ms`, icon:<Globe className="w-4 h-4"/>, color:"text-green-400", bg:"bg-green-400/5" },
            { label:"Proxy Load", value:"12%", icon:<Cpu className="w-4 h-4"/>, color:"text-yellow-400", bg:"bg-yellow-400/5" },
            { label:"Reports", value:String(reports.length), icon:<Bug className="w-4 h-4"/>, color:"text-rose-400", bg:"bg-rose-400/5" },
          ].map(s=>(
            <div key={s.label} className={`${s.bg} border border-[#1a2850] rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2"><span className={s.color}>{s.icon}</span><span className="text-xs text-blue-300/50 font-mono uppercase tracking-wider">{s.label}</span></div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* DDG Test Panel */}
        <div className="bg-[#080c20]/90 border border-[#1a2850] rounded-xl p-6">
          <h2 className="text-sm font-mono tracking-[0.2em] text-cyan-400 mb-4">SEARCH ENGINE TEST</h2>
          <div className="space-y-3">
            {Object.entries(DDG_OPTIONS).map(([id,opt])=>(
              <div key={id} className="flex items-center justify-between p-3 bg-[#060a18] border border-[#1a2850] rounded-lg">
                <div><div className="font-medium text-sm">{opt.name}</div><div className="text-xs text-blue-300/50 font-mono mt-1">{opt.note}</div></div>
                <div className="flex gap-2">
                  <button onClick={()=>{setDdgMode(id);localStorage.setItem("xena_ddg_mode",id)}} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${ddgMode===id?"bg-cyan-500/20 border border-cyan-500/40 text-cyan-300":"bg-[#1a2850]/50 border border-[#2a3870] text-blue-400 hover:bg-[#2a3870]/50"}`}>{ddgMode===id?"✓ DEFAULT":"Set Default"}</button>
                  <button onClick={()=>{const q=encodeURIComponent("test");const url=`/${proxyMode}/${b64e(opt.url+q)}`;window.open(url,"_blank")}} className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#1a2850]/50 border border-[#2a3870] text-blue-400 hover:text-white">Test</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg">
            <p className="text-xs text-yellow-300/80 font-mono">⚠ DDG Lite (zero JS) is the most embed-friendly option. All DDG searches are forced through the proxy which strips X-Frame-Options headers server-side.</p>
          </div>
        </div>

        {/* Bug Reports */}
        <div className="bg-[#080c20]/90 border border-[#1a2850] rounded-xl p-6">
          <h2 className="text-sm font-mono tracking-[0.2em] text-cyan-400 mb-4">BUG REPORTS ({reports.length})</h2>
          {reports.length===0?(<p className="text-blue-300/50 text-sm font-mono">No reports yet</p>):
            <div className="space-y-2 max-h-60 overflow-y-auto">{reports.map((r:Report)=>(<div key={r.id} className="p-3 bg-[#060a18] border border-[#1a2850] rounded-lg text-sm"><span className="text-cyan-400 mr-2">{r.kind==="bug"?"🐞":"💡"}</span><strong>{r.title}</strong><p className="text-blue-300/50 text-xs mt-1">{r.details.slice(0,100)}</p></div>))}</div>}
        </div>

        {/* Known Issues */}
        <div className="bg-[#080c20]/90 border border-[#1a2850] rounded-xl p-6">
          <h2 className="text-sm font-mono tracking-[0.2em] text-cyan-400 mb-4">KNOWN ISSUES & FIXES</h2>
          <div className="space-y-3">
            <div className="p-3 bg-[#060a18] border border-[#1a2850] rounded-lg">
              <div className="flex items-center gap-2 text-sm"><span className="text-red-400">●</span> DuckDuckGo X-Frame-Options</div>
              <p className="text-xs text-blue-300/50 mt-1">DDG sends <code className="text-cyan-400 bg-cyan-400/5 px-1 rounded">X-Frame-Options: SAMEORIGIN</code>. XENA's proxy strips the header server-side and rewrites HTML. DDG Lite has zero JavaScript — best for iframe embedding.</p>
            </div>
            <div className="p-3 bg-[#060a18] border border-[#1a2850] rounded-lg">
              <div className="flex items-center gap-2 text-sm"><span className="text-yellow-400">●</span> Render Build Compatibility</div>
              <p className="text-xs text-blue-300/50 mt-1">Using React 18 + Vite 5 + Tailwind v3 for maximum Render (Node 18) compatibility.</p>
            </div>
          </div>
        </div>

        <div className="text-center py-4">
          <a href="https://help.hackerai.co" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-blue-300/30 hover:text-blue-300/60">HackerAI Support →</a>
        </div>
      </div>
    </div>
  );
}

// ==================== ADMIN CONSOLE PAGE ====================
function AdminConsolePage({reports,setReports}:{reports:Report[],setReports:(r:Report[])=>void}){
  const [announceMsg,setAnnounceMsg]=useState("");
  const [announceLink,setAnnounceLink]=useState("");
  const [adminStats,setAdminStats]=useState<any>(null);
  useEffect(()=>{fetch("/api/admin/stats",{headers:{"x-admin-code":localStorage.getItem("xena_admin_code")||""}}).then(r=>r.json()).then(setAdminStats).catch(()=>{})},[]);
  
  const sendAnnounce=async()=>{if(!announceMsg.trim())return;await fetch("/api/admin/announcement",{method:"POST",headers:{"Content-Type":"application/json","x-admin-code":localStorage.getItem("xena_admin_code")||""},body:JSON.stringify({message:announceMsg,link:announceLink||undefined})});setAnnounceMsg("");setAnnounceLink("");alert("Announcement sent!");};
  const toggleImportant=(id:string)=>{
    const next=reports.map(r=>r.id===id?{...r,important:!r.important}:r);
    setReports(next);localStorage.setItem("xena_reports",JSON.stringify(next));
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0505] text-white overflow-y-auto">
      <header className="bg-gradient-to-r from-[#1a0505] via-[#2a0a0a] to-[#1a0505] border-b border-[#3a1515] px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-red-400 text-xs tracking-[0.2em] font-mono"><Shield className="w-4 h-4"/> ADMIN PANEL</div>
            <button onClick={()=>window.location.href="/"} className="px-4 py-2 bg-[#2a0a0a]/50 border border-[#4a2020] rounded-lg text-red-300 hover:text-white text-sm font-mono">✕ EXIT</button>
          </div>
          <h1 className="text-5xl font-bold text-white mb-1 font-display">Admin <span className="text-red-400">Hub</span></h1>
          <p className="text-red-300/30 text-sm font-mono">Gateway Management</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0505]/80 border border-[#2a0a0a] rounded-xl p-4">
            <div className="text-xs text-red-400/50 font-mono uppercase mb-1">Bug Reports</div>
            <div className="text-2xl font-bold text-red-400">{adminStats?.bugReports||reports.length}</div>
          </div>
          <div className="bg-[#0a0505]/80 border border-[#2a0a0a] rounded-xl p-4">
            <div className="text-xs text-red-400/50 font-mono uppercase mb-1">Announcements</div>
            <div className="text-2xl font-bold text-red-400">{adminStats?.announcements||0}</div>
          </div>
          <div className="bg-[#0a0505]/80 border border-[#2a0a0a] rounded-xl p-4">
            <div className="text-xs text-red-400/50 font-mono uppercase mb-1">Uptime</div>
            <div className="text-2xl font-bold text-red-400">{Math.floor(adminStats?.uptime/3600)||0}h</div>
          </div>
          <div className="bg-[#0a0505]/80 border border-[#2a0a0a] rounded-xl p-4">
            <div className="text-xs text-red-400/50 font-mono uppercase mb-1">Memory</div>
            <div className="text-2xl font-bold text-red-400">{adminStats?.memory?Math.round(adminStats.memory.rss/1024/1024)+'MB':'—'}</div>
          </div>
        </div>
        
        {/* Bug Reports with Importance Toggle */}
        <div className="bg-[#0a0505]/90 border border-[#2a0a0a] rounded-xl p-6">
          <h2 className="text-sm font-mono tracking-[0.2em] text-red-400 mb-4">BUG REPORTS ({reports.length})</h2>
          {reports.length===0?(<p className="text-red-300/30 text-sm font-mono">No reports</p>):
            <div className="space-y-2 max-h-60 overflow-y-auto">{reports.map(r=>(
              <div key={r.id} className={`p-3 border rounded-lg text-sm flex items-start justify-between ${r.important?'bg-red-500/10 border-red-500/30':'bg-[#080303] border-[#2a0a0a]'}`}>
                <div className="flex-1"><span className="mr-2">{r.important?'🔴':'🐛'}</span><strong>{r.title}</strong><p className="text-red-300/50 text-xs mt-1">{r.details.slice(0,100)}</p></div>
                <button onClick={()=>toggleImportant(r.id)} className={`shrink-0 px-2 py-1 rounded text-xs ${r.important?'bg-red-500/20 text-red-300':'bg-[#2a0a0a]/50 text-red-400'}`}>{r.important?'IMPORTANT':'Mark Important'}</button>
              </div>
            ))}</div>}
        </div>
        
        {/* Send Announcement */}
        <div className="bg-[#0a0505]/90 border border-[#2a0a0a] rounded-xl p-6">
          <h2 className="text-sm font-mono tracking-[0.2em] text-red-400 mb-4">SEND ANNOUNCEMENT</h2>
          <div className="space-y-3">
            <input value={announceMsg} onChange={e=>setAnnounceMsg(e.target.value)} placeholder="Message..." className="w-full bg-[#080303] border border-[#2a0a0a] rounded-lg px-4 py-3 text-sm text-white placeholder-red-300/20 outline-none" />
            <input value={announceLink} onChange={e=>setAnnounceLink(e.target.value)} placeholder="Link (optional)..." className="w-full bg-[#080303] border border-[#2a0a0a] rounded-lg px-4 py-3 text-sm text-white placeholder-red-300/20 outline-none" />
            <button onClick={sendAnnounce} className="px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:text-white text-sm font-mono">SEND →</button>
          </div>
        </div>
        
        {/* Gateway Controls */}
        <div className="bg-[#0a0505]/90 border border-[#2a0a0a] rounded-xl p-6">
          <h2 className="text-sm font-mono tracking-[0.2em] text-red-400 mb-4">GATEWAY CONTROLS</h2>
          <div className="flex gap-4">
            <button onClick={()=>{fetch("/api/admin/restart",{method:"POST",headers:{"x-admin-code":localStorage.getItem("xena_admin_code")||""}}).then(()=>window.location.href="/")}} className="px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 hover:text-white text-sm font-mono">RESTART GATEWAY</button>
            <button onClick={()=>window.location.href="/"} className="px-6 py-3 bg-[#2a0a0a]/50 border border-[#3a1515] rounded-lg text-red-300 text-sm font-mono">RELOAD CONSOLE</button>
          </div>
        </div>
      </div>
    </div>
  );
}
