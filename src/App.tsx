import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send,
  Activity, Shield, Bug, Cpu
} from "lucide-react";

function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c=>c==="+"?"-":c==="/"?"_":""); } catch { return encodeURIComponent(v); }
}

const PROXY_MODES = [
  { id:"sw", name:"Service Worker Proxy", badge:"SW ENGINE", latency:"~12ms" },
  { id:"rev", name:"Reverse Proxy", badge:"REVERSE", latency:"~18ms" },
  { id:"bin", name:"Binary Stream Sandbox", badge:"BINARY OS", latency:"~24ms" }
];

const DDG_OPTIONS: Record<string, {name:string, url:string, note:string}> = {
  ddg3: { name: "DDG Lite ✅ BEST", url: "https://lite.duckduckgo.com/lite/?q=", note: "Zero JS — works in iframes" },
  ddg2: { name: "DDG HTML (No JS)", url: "https://html.duckduckgo.com/html/?q=", note: "Lightweight HTML" },
  ddg1: { name: "DDG Standard", url: "https://duckduckgo.com/?q=", note: "Has frame-busting" },
  ddg4: { name: "Startpage (Alt)", url: "https://www.startpage.com/sp/search?query=", note: "Privacy alt" },
  ddg5: { name: "Bing Fallback", url: "https://www.bing.com/search?q=", note: "Bing" }
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
  "Honey never spoils. Found 3000-year-old honey still edible.",
  "The Eiffel Tower grows 6 inches taller in summer.",
  "Wombat poop is cube-shaped so it doesn't roll away.",
  "More trees on Earth than stars in the Milky Way.",
  "Hot water freezes faster than cold water (Mpemba effect).",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The universe's color is beige, officially 'Cosmic Latte'."
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
      stars.forEach(st=>{st.a+=st.s*st.d;if(st.a>=1){st.a=1;st.d=-1}else if(st.a<=0.1){st.a=0.1;st.d=1}ctx.globalAlpha=st.a;ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill()});
      anim=requestAnimationFrame(draw);
    };
    draw();
    return()=>{window.removeEventListener("resize",resize);cancelAnimationFrame(anim);};
  },[]);
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
  const [factIndex,setFactIndex]=useState(Math.floor(Math.random()*funFacts.length));
  const [modal,setModal]=useState<"settings"|"report"|null>(null);
  const [aiOpen,setAiOpen]=useState(false);
  const [chatInput,setChatInput]=useState("");
  const [aiLoad,setAiLoad]=useState(false);
  const [aiMode,setAiMode]=useState<"chill"|"serious">(()=>(localStorage.getItem("xena_ai_mode") as "chill"|"serious")||"chill");
  const [msgs,setMsgs]=useState<ChatMessage[]>([{sender:"ai",text:aiMode==="serious"?"Greetings. I am XENA.":"Say cheese.",timestamp:new Date().toLocaleTimeString()}]);
  const [cloakOn,setCloakOn]=useState(()=>localStorage.getItem("xena_cloak")==="true");
  const [escKey,setEscKey]=useState(()=>localStorage.getItem("xena_escape_key")||"Escape");
  const [escUrl,setEscUrl]=useState(()=>localStorage.getItem("xena_escape_url")||"https://classroom.google.com");
  const [time,setTime]=useState("");
  const [ping,setPing]=useState(25);
  const [ddgMode,setDdgMode]=useState(()=>localStorage.getItem("xena_ddg_mode")||"ddg3");
  const [settingsTab,setSettingsTab]=useState<"general"|"ddg">("general");
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

  useEffect(()=>{localStorage.setItem("xena_engine",engine)},[engine]);
  useEffect(()=>{localStorage.setItem("xena_proxy_mode",proxyMode)},[proxyMode]);
  useEffect(()=>{localStorage.setItem("xena_ai_mode",aiMode)},[aiMode]);
  useEffect(()=>{localStorage.setItem("xena_shortcuts",JSON.stringify(shortcuts))},[shortcuts]);
  useEffect(()=>{localStorage.setItem("xena_ddg_mode",ddgMode)},[ddgMode]);
  useEffect(()=>{const i=setInterval(()=>setFactIndex(prev=>(prev+1)%funFacts.length),12000);return ()=>clearInterval(i)},[]);
  useEffect(()=>{localStorage.setItem("xena_cloak",String(cloakOn));if(cloakOn){document.title="Google Classroom";let l:any=document.querySelector("link[rel*='icon']");if(!l){l=document.createElement("link");l.rel="shortcut icon";document.head.appendChild(l)}l.href="https://ssl.gstatic.com/classroom/favicon.png"}else{document.title="XENA Browser"}},[cloakOn]);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key===escKey)window.location.href=escUrl};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[escKey,escUrl]);
  useEffect(()=>{const u=()=>{setTime(new Date().toLocaleTimeString("en-US",{hour12:true}));setPing(Math.floor(Math.random()*16)+12)};u();const i=setInterval(u,1000);return()=>clearInterval(i)},[]);
  useEffect(()=>{setUrlInput(activeTab.url)},[activeTabId,activeTab.url]);
  useEffect(()=>{if('serviceWorker'in navigator&&proxyMode==='sw'){navigator.serviceWorker.register('/xena-sw.js').catch(()=>{})}},[proxyMode]);

  function getYtId(u:string):string|null{try{const url=new URL(u);if(url.hostname.includes("youtube.com")||url.hostname.includes("youtu.be")){let v=url.searchParams.get("v");if(!v&&url.hostname.includes("youtu.be"))v=url.pathname.replace(/^\//,"").split("?")[0];return v}}catch{const m=u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/i);if(m)return m[1]}return null}
  function searchUrl(e:string,q:string):string{const enc=encodeURIComponent(q);const mode=localStorage.getItem("xena_ddg_mode")||"ddg3";if(e==="google")return`https://www.google.com/search?q=${enc}`;if(e==="bing")return`https://www.bing.com/search?q=${enc}`;return(DDG_OPTIONS[mode]?.url||"https://lite.duckduckgo.com/lite/?q=")+enc}
  function getProxyUrl(urlStr:string,mode:string):string{if(!urlStr)return"";if(urlStr.startsWith("/")||urlStr.startsWith("http://localhost")||urlStr.startsWith("http://127.0.0.1"))return urlStr;const ytId=getYtId(urlStr);if(ytId)return`/view?v=${encodeURIComponent(ytId)}`;return`/${mode}/${b64e(urlStr)}`}
  function getDomain(u:string):string{try{return new URL(u).hostname.replace("www.","")}catch{return"Web"}}

  const checkAccessCode=async(code:string)=>{try{const resp=await fetch("/api/auth/validate-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});const data=await resp.json();if(data.valid&&data.level==="developer"){setDevUnlocked(true);sessionStorage.setItem("xena_dev","true");window.location.href="/dev-console"}else alert("Invalid access code")}catch{alert("Error")}};

  const go=(input:string)=>{
    if(!input.trim())return;
    let fu="",pp="";
    if(input.startsWith("/")||input.startsWith("http://localhost")||input.startsWith("http://127.0.0.1")){fu=input;pp=input}
    else if(/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(input.trim())&&!input.includes(" ")){fu="https://"+input.trim();pp=`/${proxyMode}/${b64e(fu)}`}
    else if(/^https?:\/\//i.test(input.trim())){fu=input.trim();pp=`/${proxyMode}/${b64e(fu)}`}
    else{fu=searchUrl(engine,input);pp=`/${proxyMode}/${b64e(fu)}`}
    if(!input.startsWith("/")&&!input.startsWith("http")){const ts=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});const item:SearchHistoryItem={id:`s-${Date.now()}`,query:input,engine,timestamp:ts};setSearchHistory(prev=>{const n=[item,...prev].slice(0,50);localStorage.setItem("xena_search_history",JSON.stringify(n));return n})}
    setTabs(tabs.map(t=>t.id===activeTabId?{...t,title:getDomain(fu),url:fu,proxyUrl:pp}:t))
  };
  const refresh=()=>{if(iframeRef.current)iframeRef.current.src=iframeRef.current.src};
  const createTab=(raw="")=>{const id=`tab-${Date.now()}`;let tu="",tp="";if(raw){if(raw.startsWith("/")||raw.startsWith("http://localhost")||raw.startsWith("http://127.0.0.1")){tu=raw;tp=raw}else if(/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw.trim())&&!raw.includes(" ")){tu="https://"+raw.trim();tp=`/${proxyMode}/${b64e(tu)}`}else if(/^https?:\/\//i.test(raw.trim())){tu=raw.trim();tp=`/${proxyMode}/${b64e(tu)}`}else{tu=searchUrl(engine,raw);tp=`/${proxyMode}/${b64e(tu)}`}}setTabs([...tabs,{id,title:tu?getDomain(tu):"XENA Engine",url:tu,proxyUrl:tp}]);setActiveTabId(id)};
  const closeTab=(id:string,e:React.MouseEvent)=>{e.stopPropagation();if(tabs.length===1)return;const f=tabs.filter(t=>t.id!==id);setTabs(f);if(activeTabId===id)setActiveTabId(f[f.length-1].id)};
  const sendMsg=async()=>{const txt=chatInput.trim();if(!txt||aiLoad)return;const userMsg:ChatMessage={sender:"user",text:txt,timestamp:new Date().toLocaleTimeString()};setMsgs(prev=>[...prev,userMsg]);setChatInput("");setAiLoad(true);try{const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:txt,mode:aiMode})});const data=await resp.json();const respText=data.response||"cheese";setMsgs(prev=>[...prev,{sender:"ai",text:respText,timestamp:new Date().toLocaleTimeString()}]);const hItem:AIHistoryItem={id:`ai-${Date.now()}`,message:txt,response:respText,mode:aiMode,timestamp:new Date().toLocaleTimeString()};setAiHistory(prev=>{const n=[hItem,...prev].slice(0,100);localStorage.setItem("xena_ai_history",JSON.stringify(n));return n})}catch{setMsgs(prev=>[...prev,{sender:"ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}])}finally{setAiLoad(false)}};
  const toggleAIMode=()=>{const n=aiMode==="chill"?"serious":"chill";setAiMode(n);if(msgs.length===1&&msgs[0].sender==="ai")setMsgs([{...msgs[0],text:n==="serious"?"Greetings. I am XENA.":"Say cheese."}])};
  const submitReport=()=>{if(!reportForm.title||!reportForm.details){alert("Fill in title and details");return}const item:Report={id:`rep-${Date.now()}`,...reportForm};const next=[item,...reports];setReports(next);localStorage.setItem("xena_reports",JSON.stringify(next));fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reportForm)}).catch(()=>{});setReportForm({kind:"bug",title:"",url:"",details:""});alert("Report submitted!");setModal(null)};
  const addShortcut=()=>{if(!newShortcut.name||!newShortcut.url)return;let url=newShortcut.url;if(!url.startsWith("http"))url="https://"+url;const item:Shortcut={id:`sc-${Date.now()}`,name:newShortcut.name,url,icon:url.charAt(8).toUpperCase()};setShortcuts([...shortcuts,item]);setNewShortcut({name:"",url:""});setShowAddShortcut(false)};
  const openAboutBlank=()=>{try{const w=window.open('about:blank','_blank');if(w){w.document.write('<html style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><head><title>Google Classroom</title></head><body style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><iframe src="'+window.location.origin+'/" style="position:fixed;top:0;left:0;bottom:0;right:0;width:100%;height:100%;border:none;margin:0;padding:0;overflow:hidden;z-index:999999;"></iframe></body></html>');w.document.close()}else alert("Popup blocked!")}catch{}};
  const openBlobUrl=()=>{try{const h='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Google Classroom</title><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;position:fixed;top:0;left:0;bottom:0;right:0}</style></head><body><iframe src="'+window.location.origin+'/"></iframe></body></html>';const b=new Blob([h],{type:"text/html"});const u=URL.createObjectURL(b);window.open(u,"_blank")}catch{}};

  // Route to dev/admin console if URL matches
  if(window.location.pathname==="/dev-console"&&devUnlocked) return <DevConsolePage reports={reports} ping={ping} ddgMode={ddgMode} setDdgMode={setDdgMode} proxyMode={proxyMode} setDevUnlocked={setDevUnlocked} />;
  if(window.location.pathname==="/admin-console"&&devUnlocked) return <AdminConsolePage reports={reports} setReports={setReports} />;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0e1a] text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#080c18] border-b border-[#1a1f35] shrink-0">
        <button onClick={()=>window.history.back()} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><ArrowLeft className="w-4 h-4"/></button>
        <button onClick={()=>window.history.forward()} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><ArrowRight className="w-4 h-4"/></button>
        <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><RotateCw className="w-4 h-4"/></button>
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none ml-2">
          {tabs.map(t=>(
            <div key={t.id} onClick={()=>setActiveTabId(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer whitespace-nowrap shrink-0 ${t.id===activeTabId?'bg-white/10 text-white':'text-white/50 hover:text-white hover:bg-white/5'}`}>
              <Globe className="w-3 h-3"/><span className="max-w-[100px] truncate">{t.title||"New Tab"}</span>
              {t.id!=="tab-1"&&<button onClick={(e)=>closeTab(t.id,e)} className="ml-1 p-0.5 rounded hover:bg-white/10"><X className="w-3 h-3"/></button>}
            </div>
          ))}
          <button onClick={()=>createTab()} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white shrink-0"><Plus className="w-3.5 h-3.5"/></button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-white/30">{time}</span>
          <span className="text-xs font-mono text-green-400/60">{ping}ms</span>
          <button onClick={()=>setModal("report")} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><Bug className="w-4 h-4"/></button>
          <button onClick={()=>setModal("settings")} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><Settings className="w-4 h-4"/></button>
        </div>
      </div>

      {/* URL Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0e1a] border-b border-[#1a1f35] shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-[#12162a] border border-[#1d2340] rounded-xl px-3 py-2 focus-within:border-[#3a4a80] transition-colors">
          <Globe className="w-4 h-4 text-white/30 shrink-0"/>
          <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go(urlInput)} placeholder="Search or enter URL..." className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 outline-none"/>
        </div>
        <button onClick={()=>go(urlInput)} className="px-4 py-2 bg-gradient-to-r from-[#2a3a70] to-[#1a2a50] rounded-xl text-xs font-medium hover:from-[#3a4a80] hover:to-[#2a3a70]">GO</button>
        <button onClick={()=>setAiOpen(true)} className="px-3 py-2 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 hover:from-cyan-600/40"><Sparkles className="w-3.5 h-3.5 inline mr-1"/>AI</button>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-16 flex flex-col items-center gap-2 py-3 bg-[#080c18] border-r border-[#1a1f35] shrink-0">
          {shortcuts.slice(0,5).map(s=>(
            <button key={s.id} onClick={()=>go(s.url)} className="w-10 h-10 rounded-xl bg-[#12162a] border border-[#1d2340] flex items-center justify-center text-sm font-bold text-white/70 hover:bg-[#1a1f40] hover:border-[#2a3a70]" title={s.name}>{s.icon}</button>
          ))}
          <button onClick={()=>setShowAddShortcut(true)} className="w-10 h-10 rounded-xl bg-[#12162a] border border-dashed border-[#1d2340] flex items-center justify-center text-white/40 hover:bg-[#1a1f40]"><Plus className="w-4 h-4"/></button>
          <div className="w-8 h-px bg-[#1a1f35] my-1"/>
          <button onClick={openAboutBlank} className="w-10 h-10 rounded-xl bg-[#12162a] border border-[#1d2340] flex items-center justify-center text-xs text-white/40 hover:text-white/70" title="about:blank">ab</button>
          <button onClick={openBlobUrl} className="w-10 h-10 rounded-xl bg-[#12162a] border border-[#1d2340] flex items-center justify-center text-xs text-white/40 hover:text-white/70" title="Blob">bl</button>
        </div>

        {/* Iframe Area */}
        <div className="flex-1 relative bg-[#0a0e1a]">
          {!activeTab.url&&(
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <StarryBg/>
              <div className="relative z-10 text-center px-6">
                <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-display">XENA</div>
                <p className="text-white/30 text-sm mb-8 font-mono">{getGreeting()}. Ready to browse.</p>
                <div className="flex items-center gap-3 justify-center flex-wrap max-w-md mx-auto">
                  {["https://example.com","https://neocities.org","https://wikipedia.org","https://reddit.com"].map(u=>(
                    <button key={u} onClick={()=>go(u)} className="px-3 py-1.5 bg-[#12162a] border border-[#1d2340] rounded-lg text-xs text-white/50 hover:text-white/80 hover:border-[#2a3a70]">{getDomain(u)}</button>
                  ))}
                </div>
                <p className="mt-6 text-xs text-white/20 font-mono">{funFacts[factIndex]}</p>
              </div>
            </div>
          )}
          {activeTab.proxyUrl&&(
            <iframe ref={iframeRef} src={activeTab.proxyUrl} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox" title={activeTab.title}/>
          )}
        </div>

        {/* AI Panel */}
        {aiOpen&&(
          <div className="w-80 bg-[#080c18] border-l border-[#1a1f35] flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f35]">
              <div className="flex items-center gap-2"><Sparkles className={`w-4 h-4 ${aiMode==="chill"?"text-cyan-400":"text-yellow-400"}`}/><span className="text-sm font-medium">XENA AI</span><span className={`text-xs px-1.5 py-0.5 rounded font-mono ${aiMode==="chill"?"bg-cyan-500/10 text-cyan-400":"bg-yellow-500/10 text-yellow-400"}`}>{aiMode}</span></div>
              <div className="flex items-center gap-2">
                <button onClick={toggleAIMode} className={`text-xs px-2 py-1 rounded ${aiMode==="chill"?"bg-cyan-500/10 text-cyan-400":"bg-yellow-500/10 text-yellow-400"}`}>{aiMode==="chill"?"chill":"serious"}</button>
                <button onClick={()=>setAiOpen(false)} className="p-1 rounded hover:bg-white/5 text-white/40"><X className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {msgs.map((m,i)=>(
                <div key={i} className={`p-2 rounded-lg text-sm ${m.sender==="ai"?"bg-[#12162a] text-white/80":"bg-[#1a2a50]/50 text-cyan-300/80 ml-4"}`}>{m.text}</div>
              ))}
              {aiLoad&&<div className="flex items-center gap-1 p-2"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"/><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-150"/><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-300"/></div>}
            </div>
            <div className="p-3 border-t border-[#1a1f35]">
              <div className="flex gap-2 bg-[#12162a] rounded-xl px-3 py-2 border border-[#1d2340]">
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Message..." className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 outline-none"/>
                <button onClick={sendMsg} disabled={aiLoad} className="p-1 text-cyan-400 hover:text-cyan-300"><Send className="w-4 h-4"/></button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Settings Modal */}
      {modal==="settings"&&(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={()=>setModal(null)}>
          <div className="bg-[#080c1a] border border-[#1a1f35] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f35]">
              <h2 className="text-lg font-medium">Settings</h2>
              <button onClick={()=>setModal(null)} className="p-1.5 rounded-lg hover:bg-white/5"><X className="w-4 h-4"/></button>
            </div>
            <div className="flex border-b border-[#1a1f35]">
              {(["general","ddg"] as const).map(t=>(
                <button key={t} onClick={()=>setSettingsTab(t)} className={`flex-1 px-4 py-2.5 text-xs font-mono tracking-wider uppercase ${settingsTab===t?"text-cyan-400 border-b-2 border-cyan-400":"text-white/40 hover:text-white/70"}`}>{t}</button>
              ))}
            </div>
            <div className="p-6 overflow-y-auto max-h-[55vh]">
              {settingsTab==="general"&&(
                <div className="space-y-6">
                  <div><label className="text-xs text-white/40 font-mono mb-2 block">Search Engine</label>
                    <div className="flex gap-2">{["ddg","google","bing"].map(e=>(<button key={e} onClick={()=>setEngine(e)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm ${engine===e?"bg-cyan-500/10 border border-cyan-500/30 text-cyan-300":"bg-[#12162a] border border-[#1d2340] text-white/50 hover:text-white/80"}`}>{e==="ddg"?"DuckDuckGo":e==="google"?"Google":"Bing"}</button>))}</div>
                  </div>
                  <div><label className="text-xs text-white/40 font-mono mb-2 block">Proxy Engine</label>
                    <div className="flex gap-2">{PROXY_MODES.map(p=>(<button key={p.id} onClick={()=>setProxyMode(p.id)} className={`flex-1 px-3 py-2.5 rounded-lg text-sm ${proxyMode===p.id?"bg-cyan-500/10 border border-cyan-500/30 text-cyan-300":"bg-[#12162a] border border-[#1d2340] text-white/50 hover:text-white/80"}`}>{p.badge}<div className="text-[10px] opacity-50 mt-1">{p.latency}</div></button>))}</div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs text-white/40 font-mono block">Stealth</label>
                    <label className="flex items-center gap-3 p-3 bg-[#12162a] rounded-lg cursor-pointer"><input type="checkbox" checked={cloakOn} onChange={e=>setCloakOn(e.target.checked)} className="accent-cyan-500"/><div><div className="text-sm">Cloak Mode</div><div className="text-xs text-white/30">Changes title & icon to Google Classroom</div></div></label>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs text-white/40 font-mono block">Escape Key</label>
                    <div className="flex gap-2"><input value={escKey} onChange={e=>setEscKey(e.target.value||"
