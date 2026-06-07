import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send,
  Trash2, Activity, ExternalLink, Shield, MessageSquare, ChevronRight,
  ClipboardList, FolderOpen, Cpu, Lock
} from "lucide-react";

function base64UrlEncode(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c==="+"?"-":c==="/"?"_":""); } catch { return encodeURIComponent(v); }
}
function base64UrlDecode(v: string): string {
  try { let t=v.replace(/-/g,"+").replace(/_/g,"/"); while(t.length%4) t+="="; return decodeURIComponent(escape(atob(t))); } catch { return v; }
}
function xorEncode(s: string, k="xena"): string {
  let r=""; for(let i=0;i<s.length;i++) r+=String.fromCharCode(s.charCodeAt(i)^k.charCodeAt(i%k.length));
  try { return btoa(unescape(encodeURIComponent(r))).replace(/[+/=]/g,c=>c==="+"?"-":c==="/"?"_":""); } catch { return encodeURIComponent(r); }
}

function getProxyUrlStatic(urlStr: string, activeMode: string): string {
  if (!urlStr) return "";
  if (urlStr.startsWith("/")||urlStr.startsWith("http://localhost")||urlStr.startsWith("http://127.0.0.1")) return urlStr;
  const ytId = getYoutubeVideoId(urlStr);
  if (ytId) return `/view?v=${encodeURIComponent(ytId)}`;
  if (activeMode==="base64_gateway") return `/proxy/${base64UrlEncode(urlStr)}`;
  else if (activeMode==="xor_gateway") return `/gateway/${xorEncode(urlStr)}`;
  else return `/fetch/${base64UrlEncode(urlStr)}`;
}

const PROXY_MODES = [
  {id:"sw_scramjet",name:"Service Worker Engine",badge:"SCRAMJET ACTIVE",latency:"⚡ 12ms",desc:"Registers client-side service worker interception overlays. Re-routes nested assets dynamically inside frames.",recommend:true},
  {id:"base64_gateway",name:"Base64 Gateway Tunnel",badge:"DEEP REWRITE",latency:"⚡ 24ms",desc:"Translates nested anchor paths using base64 tokens through custom Express proxy middlewares.",recommend:false},
  {id:"xor_gateway",name:"XOR Masked Cipher Node",badge:"XOR CIPHER",latency:"⚡ 28ms",desc:"Applies byte-wise XOR symmetric keys before transmission. Masks query text from keyword sniffers.",recommend:true},
  {id:"cors_bypass",name:"CORS Bypasser Proxy",badge:"FRAME SYNC",latency:"⚡ 45ms",desc:"Overwrites Cross-Origin policies at the server boundary.",recommend:false},
  {id:"rev_proxy",name:"Reverse Proxy Forwarder",badge:"PORT BOUNDARY",latency:"⚡ 18ms",desc:"Establishes upstream target gateways at nginx-proxy points.",recommend:false},
  {id:"mesh_p2p",name:"Peer-to-Peer Mesh Relay",badge:"P2P MESH",latency:"⚡ 94ms",desc:"Bypasses central database overhead by streaming assets over WebRTC peer groups.",recommend:false},
  {id:"dns_over_https",name:"DNS Secure HTTPS Router",badge:"TLS DNS",latency:"⚡ 36ms",desc:"Resolves host DNS records through TLS Cloudflare endpoints.",recommend:false},
  {id:"html5_sandbox",name:"Pure HTML5 Micro-Sandbox",badge:"SANDBOX IFRAME",latency:"⚡ 8ms",desc:"Embeds sites in high-restriction iframe tags.",recommend:false},
  {id:"header_mask",name:"Telemetry Header Masker",badge:"HEADER SHIELD",latency:"⚡ 15ms",desc:"Strips origin tracers, tracking referrers, and device signatures.",recommend:false},
  {id:"websocket_binary",name:"WebSocket Byte Streamer",badge:"BINARY LANE",latency:"⚡ 52ms",desc:"Streams content over a persistent socket connection.",recommend:false},
  {id:"shadow_dom_emulation",name:"Shadow DOM Isolation Sandbox",badge:"SHADOW SHIELD",latency:"⚡ 65ms",desc:"Renders proxied sources inside safe shadow nodes.",recommend:false}
];

function isProbablyUrl(t: string): boolean {
  if(!t.trim()) return false;
  if(/^https?:\/\//i.test(t)) return true;
  return /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t);
}

function getYoutubeVideoId(u: string): string|null {
  try {
    const url = new URL(u);
    if(url.hostname.includes("youtube.com")||url.hostname.includes("youtu.be")) {
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
    case"qwant":return `https://lite.qwant.com/?q=${enc}`;
    case"startpage":return `https://www.startpage.com/sp/search?query=${enc}`;
    case"bing":return `https://www.bing.com/search?q=${enc}`;
    case"google":return `https://www.google.com/search?q=${enc}`;
    default:return `https://duckduckgo.com/?q=${enc}`;
  }
}

function normalizeInputToUrl(e:string,input:string):string {
  const r=input.trim();
  if(!r) return searchUrl(e,"");
  if(/^https?:\/\//i.test(r)) return r;
  if(isProbablyUrl(r)) return `https://${r}`;
  return searchUrl(e,r);
}

interface Tab{id:string;title:string;url:string;proxyUrl:string;}
interface Report{id:string;kind:"bug"|"suggestion";title:string;url?:string;details:string;}
interface ChatMessage{sender:"user"|"ai";text:string;image?:string;tokens?:number;elapsed?:number;timestamp:string;}
interface SearchHistoryItem{id:string;query:string;engine:string;timestamp:string;}
interface BrowseHistoryItem{id:string;url:string;title:string;timestamp:string;}
interface ChatThread{id:string;title:string;messages:ChatMessage[];timestamp:string;}

function StarryCanvas() {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d"); if(!ctx) return;
    let anim:number;
    const ro=new ResizeObserver(([e])=>{c.width=e.contentRect.width;c.height=e.contentRect.height;init(c.width,c.height);});
    ro.observe(c.parentElement||c);
    const init=(w:number,h:number)=>{
      const stars:any[]=[];
      const n=Math.floor((w*h)/8000);
      for(let i=0;i<n;i++) stars.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.5+0.5,alpha:Math.random(),speed:Math.random()*0.015+0.005,dir:Math.random()>0.5?1:-1});
      return stars;
    };
    let stars=init(c.width,c.height);
    const draw=()=>{
      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle="#ffffff";
      stars.forEach(s=>{s.alpha+=s.speed*s.dir;if(s.alpha>=1){s.alpha=1;s.dir=-1}else if(s.alpha<=0.15){s.alpha=0.15;s.dir=1}ctx.globalAlpha=s.alpha;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();});
      ctx.globalAlpha=1;
      anim=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{cancelAnimationFrame(anim);ro.disconnect();};
  },[]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-60" />;
}

export default function App() {
  const [tabs,setTabs]=useState<Tab[]>(()=>{
    try{
      const p=new URLSearchParams(window.location.search);
      const su=p.get("url");
      if(su){
        try{window.history.replaceState({},document.title,window.location.pathname);}catch{}
        let fu="",pp="";
        const sm=localStorage.getItem("xena_proxy_mode")||"sw_scramjet";
        if(su.startsWith("/")||su.startsWith("http://localhost")||su.startsWith("http://127.0.0.1")){fu=su;pp=su;}
        else{const yt=getYoutubeVideoId(su);if(yt){fu=`/view?v=${encodeURIComponent(yt)}`;pp=fu;}else{fu=su;pp=getProxyUrlStatic(fu,sm);}}
        let d="Web Page";try{d=new URL(fu).hostname.replace("www.","");}catch{}
        return[{id:"tab-1",title:fu.startsWith("/view")?"Xena Player":d,url:fu,proxyUrl:pp}];
      }
    }catch{}
    return[{id:"tab-1",title:"XENA Engine",url:"",proxyUrl:""}];
  });
  const [activeTabId,setActiveTabId]=useState("tab-1");
  const [urlInput,setUrlInput]=useState("");
  const [startInput,setStartInput]=useState("");
  const [searchEngine,setSearchEngine]=useState(()=>localStorage.getItem("xena_engine")||"ddg");
  const [proxyKey,setProxyKey]=useState(()=>localStorage.getItem("xena_proxy_key")||"");
  const [shieldActive,setShieldActive]=useState(true);
  const [cloakActive,setCloakActive]=useState(()=>localStorage.getItem("xena_cloak")==="true");
  const [escapeKey,setEscapeKey]=useState(()=>localStorage.getItem("xena_escape_key")||"Escape");
  const [escapeUrl,setEscapeUrl]=useState(()=>localStorage.getItem("xena_escape_url")||"https://classroom.google.com");
  const [proxyMode,setProxyMode]=useState<any>(()=>(localStorage.getItem("xena_proxy_mode") as any)||"sw_scramjet");
  const getProxyUrlFor=(u:string,m=proxyMode)=>getProxyUrlStatic(u,m);
  const [modal,setModal]=useState<"settings"|"report"|"diagnostics"|null>(null);
  const [reports,setReports]=useState<Report[]>(()=>{const r=localStorage.getItem("xena_reports");return r?JSON.parse(r):[];});
  const [reportForm,setReportForm]=useState<any>({kind:"bug",title:"",url:"",details:""});
  const [aiOpen,setAiOpen]=useState(false);
  const [chatInput,setChatInput]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [settingsTab,setSettingsTab]=useState<"general"|"search"|"ai"|"autofix">("general");
  const [autofixLoading,setAutofixLoading]=useState(false);
  const [autofixProgress,setAutofixProgress]=useState("");
  const [autofixReport,setAutofixReport]=useState<any>(null);
  const [searchHistory,setSearchHistory]=useState<SearchHistoryItem[]>(()=>{const r=localStorage.getItem("xena_search_history");return r?JSON.parse(r):[];});
  const [browseHistory,setBrowseHistory]=useState<BrowseHistoryItem[]>(()=>{const r=localStorage.getItem("xena_browse_history");return r?JSON.parse(r):[];});
  const [chatThreads,setChatThreads]=useState<ChatThread[]>(()=>{
    const raw=localStorage.getItem("xena_chat_threads");
    if(raw){try{let p:ChatThread[]=JSON.parse(raw);return p.map(th=>{if(th.messages?.[0]?.sender==="ai"&&["daydreaming","XENA AI","Double cheese","Just kidding","Surf's up","What is cooking"].some(x=>th.messages[0].text.includes(x)))th.messages[0].text="cheese";return th;});}catch{}}
    const old=localStorage.getItem("xena_chat_v1");
    let msgs=[{sender:"ai" as "ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}];
    if(old){try{msgs=JSON.parse(old);}catch{}}
    return[{id:"thread-default",title:"Initial Sync Chat",messages:msgs,timestamp:new Date().toLocaleString()}];
  });
  const [activeThreadId,setActiveThreadId]=useState(()=>localStorage.getItem("xena_active_thread_id")||"thread-default");
  const activeThread=chatThreads.find(th=>th.id===activeThreadId)||chatThreads[0];
  const chatMessages=activeThread?activeThread.messages:[];
  const setChatMessages=(f:any)=>{setChatThreads(prev=>{const n=prev.map(th=>{if(th.id===activeThreadId){const m=typeof f==="function"?f(th.messages):f;return{...th,messages:m,timestamp:new Date().toLocaleString()};}return th;});localStorage.setItem("xena_chat_threads",JSON.stringify(n));return n;});};
  const startNewThread=(t?:string)=>{const id=`thread-${Date.now()}`;const n=[{id,title:t||`Dialogue ${chatThreads.length+1}`,messages:[{sender:"ai" as "ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}],timestamp:new Date().toLocaleString()},...chatThreads];setChatThreads(n);setActiveThreadId(id);localStorage.setItem("xena_chat_threads",JSON.stringify(n));localStorage.setItem("xena_active_thread_id",id);};
  const deleteThread=(id:string,e?:React.MouseEvent)=>{if(e)e.stopPropagation();if(chatThreads.length===1){const r=[{id:"thread-default",title:"Initial Sync Chat",messages:[{sender:"ai" as "ai",text:"cheese",timestamp:new Date().toLocaleTimeString()}],timestamp:new Date().toLocaleString()}];setChatThreads(r);setActiveThreadId("thread-default");localStorage.setItem("xena_chat_threads",JSON.stringify(r));localStorage.setItem("xena_active_thread_id","thread-default");return;}const f=chatThreads.filter(th=>th.id!==id);setChatThreads(f);localStorage.setItem("xena_chat_threads",JSON.stringify(f));if(activeThreadId===id){setActiveThreadId(f[0].id);localStorage.setItem("xena_active_thread_id",f[0].id);}};
  const [attachedImage,setAttachedImage]=useState<string|null>(null);
  const [attachedImageMime,setAttachedImageMime]=useState("image/png");
  const [calibrationActive,setCalibrationActive]=useState(false);
  const [calibrationProgress,setCalibrationProgress]=useState(0);
  const [bypassCalibration,setBypassCalibration]=useState(()=>{const s=localStorage.getItem("xena_bypass_calibration");return s!==null?s==="true":true;});
  const [seriousMode,setSeriousMode]=useState(()=>localStorage.getItem("xena_serious_mode")==="true");
  const [currentTime,setCurrentTime]=useState("");
  const [ping,setPing]=useState(25);
  const [dragActive,setDragActive]=useState(false);
  const handleDrag=(e:React.DragEvent)=>{e.preventDefault();e.stopPropagation();if(e.type==="dragenter"||e.type==="dragover")setDragActive(true);else if(e.type==="dragleave")setDragActive(false);};
  const handleDrop=(e:React.DragEvent)=>{e.preventDefault();e.stopPropagation();setDragActive(false);if(e.dataTransfer.files?.[0]){const f=e.dataTransfer.files[0];if(f.type.startsWith("image/")){const r=new FileReader();r.onload=()=>{setAttachedImage(r.result as string);setAttachedImageMime(f.type);};r.readAsDataURL(f);}}};
  const handleChatPaste=(e:React.ClipboardEvent<HTMLInputElement>)=>{const items=e.clipboardData?.items;if(!items)return;for(let i=0;i<items.length;i++){const item=items[i];if(item.type.includes("image")){const f=item.getAsFile();if(f){const r=new FileReader();r.onload=()=>{setAttachedImage(r.result as string);setAttachedImageMime(f.type);};r.readAsDataURL(f);e.preventDefault();}}}};
  const fileInputRef=useRef<HTMLInputElement>(null);
  const activeTab=tabs.find(t=>t.id===activeTabId)||tabs[0];
  const iframeRef=useRef<HTMLIFrameElement>(null);
  
  useEffect(()=>{localStorage.setItem("xena_engine",searchEngine);},[searchEngine]);
  useEffect(()=>{const u=()=>{setCurrentTime(new Date().toLocaleTimeString("en-US",{hour12:true}));setPing(Math.floor(Math.random()*16)+12);};u();const i=setInterval(u,1000);return ()=>clearInterval(i);},[]);
  useEffect(()=>{localStorage.setItem("xena_cloak",String(cloakActive));if(cloakActive){document.title="Google Classroom";let l:any=document.querySelector("link[rel*='icon']");if(!l){l=document.createElement("link");l.type="image/x-icon";l.rel="shortcut icon";document.head.appendChild(l);}l.href="https://ssl.gstatic.com/classroom/favicon.png";}else{document.title="Xena Browser";}},[cloakActive]);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key===escapeKey){e.preventDefault();window.location.href=escapeUrl;}};window.addEventListener("keydown",h);return ()=>window.removeEventListener("keydown",h);},[escapeKey,escapeUrl]);
  useEffect(()=>{const h=(e:MessageEvent)=>{const d=e.data;if(d&&typeof d==="object"){if((d.type==="xena-open"||d.type==="open-new-tab")&&d.url){e.preventDefault();createNewTab(d.url);}else if(d.type==="xena-navigate"&&(d.proxyUrl||d.url)){let ru=d.url||"";if(!ru){const p=d.proxyUrl||"";if(p.includes("/4dysv/"))ru=decodeURIComponent(p.substring(p.indexOf("/4dysv/")+7));else{const m=p.match(/^\/(proxy|gateway)\/([^\/?#]+)(.*)/);if(m){let db="";try{db=base64UrlDecode(m[2]);}catch{db=m[2];}if(db.startsWith("http")){ru=db;if(m[3]){try{ru=new URL(m[3],db).toString();}catch{}}}}}}if(ru?.startsWith("http")){setTabs(prev=>prev.map(t=>{if(t.id===activeTabId&&t.url!==ru){setTimeout(()=>{setBrowseHistory(p=>{if(p[0]?.url===ru)return p;const n=[{id:`b-${Date.now()}`,url:ru,title:d.title||getDomainOfUrl(ru),timestamp:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})},...p].slice(0,100);localStorage.setItem("xena_browse_history",JSON.stringify(n));return n;});},10);return{...t,title:d.title||getDomainOfUrl(ru),url:ru,proxyUrl:d.proxyUrl||getProxyUrlFor(ru)};}return t;}));}}}};window.addEventListener("message",h);return ()=>window.removeEventListener("message",h);},[tabs,activeTabId]);
  useEffect(()=>{setUrlInput(activeTab.url);},[activeTabId,activeTab.url]);

  const createNewTab=(rawUrl:string="")=>{
    const id=`tab-${Date.now()}`;let tu="",tp="";
    if(rawUrl){if(rawUrl.startsWith("/")||rawUrl.startsWith("http://localhost")||rawUrl.startsWith("http://127.0.0.1")){tu=rawUrl;tp=rawUrl;}else{tu=normalizeInputToUrl(searchEngine,rawUrl);tp=getProxyUrlFor(tu);}}
    setTabs([...tabs,{id,title:tu?(tu==="/dev.html"?"XENA Dev Panel":(tu.startsWith("/view")?"Xena Player":getDomainOfUrl(tu))):"XENA Engine",url:tu,proxyUrl:tp}]);setActiveTabId(id);
  };
  const closeTab=(id:string,e:React.MouseEvent)=>{e.stopPropagation();if(tabs.length===1)return;const f=tabs.filter(t=>t.id!==id);setTabs(f);if(activeTabId===id)setActiveTabId(f[f.length-1].id);};
  const handleNavigate=(rawInput:string)=>{
    if(!rawInput.trim())return;let fu="",pp="";
    if(rawInput.startsWith("/")||rawInput.startsWith("http://localhost")||rawInput.startsWith("http://127.0.0.1")){fu=rawInput;pp=rawInput;}else{fu=normalizeInputToUrl(searchEngine,rawInput);pp=getProxyUrlFor(fu);}
    const isUrl=rawInput.startsWith("/")||isProbablyUrl(rawInput)||/^https?:\/\//i.test(rawInput);
    const ts=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    if(isUrl&&!rawInput.startsWith("/")){setTimeout(()=>{setBrowseHistory(p=>{if(p[0]?.url===fu)return p;const n=[{id:`b-${Date.now()}`,url:fu,title:fu.startsWith("/view")?"Xena Player":getDomainOfUrl(fu),timestamp:ts},...p].slice(0,100);localStorage.setItem("xena_browse_history",JSON.stringify(n));return n;});},10);}else if(!rawInput.startsWith("/")){setTimeout(()=>{setSearchHistory(p=>{const n=[{id:`s-${Date.now()}`,query:rawInput,engine:searchEngine,timestamp:ts},...p].slice(0,100);localStorage.setItem("xena_search_history",JSON.stringify(n));return n;});},10);}
    setTabs(tabs.map(t=>t.id===activeTabId?{...t,title:fu==="/dev.html"?"XENA Dev Panel":(fu.startsWith("/view")?"Xena Player":getDomainOfUrl(fu)),url:fu,proxyUrl:pp}:t));
  };
  const getDomainOfUrl=(u:string):string=>{try{return new URL(u).hostname.replace("www.","");}catch{return "Web Page";}};
  const triggerRefresh=()=>{if(iframeRef.current)iframeRef.current.src=iframeRef.current.src;};
  const submitReport=()=>{
    if(!reportForm.title||!reportForm.details){alert("Please fill in title and details");return;}
    const item:Report={id:`rep-${Date.now()}`,kind:reportForm.kind,title:reportForm.title,url:reportForm.url,details:reportForm.details};
    const next=[item,...reports];setReports(next);localStorage.setItem("xena_reports",JSON.stringify(next));
    fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reportForm)}).catch(()=>{});
    setReportForm({kind:"bug",title:"",url:"",details:""});alert("Report filed!");setModal(null);
  };
  const sendAIMessage=async (customText?:string)=>{
    const txt=customText!==undefined?customText:chatInput;
    if(!txt.trim()&&!attachedImage)return;if(aiLoading)return;
    const userMsg:ChatMessage={sender:"user",text:txt,image:attachedImage||undefined,timestamp:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true})};
    setChatMessages((prev:ChatMessage[])=>[...prev,userMsg]);setChatInput("");setAttachedImage(null);setAiLoading(true);
    try{
      let rt="";
      try{const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsg.text})});if(resp.ok){const d=await resp.json();rt=d.response||"cheese";}else rt="cheese";}catch{rt="cheese";}
      setChatMessages((prev:ChatMessage[])=>[...prev,{sender:"ai",text:rt,tokens:Math.ceil(rt.length/4),elapsed:0,timestamp:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true})}]);
    }catch{setChatMessages((prev:ChatMessage[])=>[...prev,{sender:"ai",text:"cheese",tokens:10,elapsed:5,timestamp:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true})}]);}
    finally{setAiLoading(false);}
  };

  return (
    <div className="w-full h-screen flex flex-col bg-black text-white overflow-hidden select-none font-sans relative">
      {/* TOP BAR */}
      <header className="flex items-center gap-2 px-3 h-14 bg-black border-b border-[#111] relative z-20 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={()=>{try{if(iframeRef.current?.contentWindow?.history.back()){}}catch{}}} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><ArrowLeft className="w-4 h-4"/></button>
          <button onClick={()=>{try{if(iframeRef.current?.contentWindow?.history.forward()){}}catch{}}} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><ArrowRight className="w-4 h-4"/></button>
          <button onClick={triggerRefresh} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><RotateCw className="w-4 h-4"/></button>
        </div>
        <form onSubmit={e=>{e.preventDefault();handleNavigate(urlInput);}} className="flex-1 flex max-w-4xl mx-3 h-8.5 rounded-lg border border-[#1a1a1a] bg-black overflow-hidden group focus-within:border-zinc-500 transition-all duration-150">
          <select value={searchEngine} onChange={e=>setSearchEngine(e.target.value)} className="px-2 bg-black text-zinc-400 text-xs border-r border-[#1a1a1a] outline-none cursor-pointer focus:text-white">
            <option value="ddg">DDG</option><option value="google">Google</option><option value="bing">Bing</option><option value="qwant">Qwant</option><option value="startpage">Startpage</option>
          </select>
          <input type="text" value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="Search or enter URL (e.g. tiktok.com, youtube.com)" spellCheck={false} className="flex-1 px-3 text-sm bg-transparent outline-none text-white placeholder-zinc-600"/>
        </form>
      </header>

      {/* TABS BAR */}
      <section className="flex items-end justify-between px-3 bg-black border-b border-[#111] h-10 select-none shrink-0 overflow-x-auto no-scrollbar relative">
        <div className="flex items-end gap-1 select-none overflow-x-auto no-scrollbar">
          {tabs.map(tab=>{
            const ia=tab.id===activeTabId;
            return (
              <div key={tab.id} onClick={()=>setActiveTabId(tab.id)} className={`group flex items-center gap-2 px-3 h-8.5 rounded-t-lg border-t border-x cursor-pointer transition-all duration-150 select-none relative min-w-[125px] max-w-[185px] ${ia?"bg-black border-x border-zinc-800 border-t-zinc-400 text-white":"bg-zinc-950/70 border-x border-transparent border-t-transparent text-zinc-500 hover:text-zinc-300"}`}>
                <Globe className={`w-3.5 h-3.5 shrink-0 ${ia?"text-zinc-300":"text-zinc-600"}`}/>
                <span className="flex-1 text-xs truncate max-w-[105px] font-medium leading-none select-none">{tab.title}</span>
                <button onClick={e=>closeTab(tab.id,e)} className="flex items-center justify-center w-4 h-4 rounded hover:bg-zinc-800 hover:text-white text-zinc-600 opacity-0 group-hover:opacity-100 transition-all duration-100"><X className="w-2.5 h-2.5"/></button>
              </div>
            );
          })}
          <button onClick={()=>createNewTab()} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-800 text-zinc-600 hover:text-white hover:border-zinc-500 transition-all duration-150 mb-1 cursor-pointer" title="New Tab"><Plus className="w-4 h-4"/></button>
        </div>
        <div className="flex items-center gap-1.5 mb-1.5 shrink-0 pl-4">
          <button onClick={()=>setShieldActive(!shieldActive)} className={`flex items-center gap-1.5 px-2.5 h-7.5 rounded-md border text-[10px] font-mono font-medium cursor-pointer transition-all duration-150 ${shieldActive?"bg-white/5 text-white border-zinc-750":"bg-black text-zinc-500 border-zinc-850"}`} title="Xena Shield"><Shield className="w-3.5 h-3.5"/><span className="hidden sm:inline">AdBlock</span></button>
          <button onClick={()=>setModal("report")} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-all duration-150 text-[11px]" title="Bug Report">🐞</button>
          <button onClick={()=>setModal("settings")} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-zinc-450 hover:text-white transition-all duration-150" title="Settings"><Settings className="w-4 h-4"/></button>
          <button onClick={()=>handleNavigate("https://www.cineby.at/")} className="flex items-center gap-1 px-2.5 h-7.5 rounded-md border border-zinc-800 bg-black text-zinc-400 hover:text-white hover:border-zinc-500 transition-all duration-150 text-[10px] font-mono font-medium cursor-pointer" title="Watch Shows">📺 <span className="hidden sm:inline">Shows</span></button>
          <button onClick={()=>setAiOpen(!aiOpen)} className="relative flex items-center justify-center w-7.5 h-7.5 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 p-[1.5px] hover:scale-105 active:scale-95 transition-all duration-150 shadow-[0_0_10px_rgba(168,85,247,0.45)] cursor-pointer" title="Open XENA Neural AI"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] text-white">🔮</div></button>
        </div>
      </section>

      {/* MAIN BODY */}
      <main className="flex-1 relative bg-black overflow-hidden">
        {activeTab.proxyUrl ? (
          <div className="w-full h-full relative z-10">
            <iframe ref={iframeRef} src={activeTab.proxyUrl} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; geolocation; microphone; camera" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals" className="w-full h-full border-none bg-white"/>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-6 select-none leading-none z-10">
            <StarryCanvas />
            <div className="max-w-xl w-full flex flex-col items-center text-center space-y-6 relative mb-12 animate-fadeIn">
              <div className="text-center select-none cursor-default">
                <h1 className="text-7xl font-extrabold font-display tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.55)] select-none">XENA</h1>
                <svg className="w-24 h-4 mx-auto text-zinc-500 mt-2.5 opacity-80 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12 Q 25 2, 50 12 T 95 12"/></svg>
                <p className="text-[9px] text-zinc-650 tracking-[0.3em] font-mono mt-3 uppercase opacity-70">NEURAL ENGINE EMULATOR</p>
              </div>
              <form onSubmit={e=>{e.preventDefault();handleNavigate(startInput);}} className="w-full flex h-12 rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-2xl focus-within:border-zinc-500 transition-all duration-200">
                <select value={searchEngine} onChange={e=>setSearchEngine(e.target.value)} className="px-4 bg-zinc-950 text-zinc-400 text-xs border-r border-[#1a1a1a] outline-none cursor-pointer focus:text-white font-medium">
                  <option value="ddg">DuckDuckGo</option><option value="google">Google Search</option><option value="bing">Bing Engine</option><option value="qwant">Qwant</option><option value="startpage">Startpage</option>
                </select>
                <input type="text" value={startInput} onChange={e=>setStartInput(e.target.value)} placeholder="Enter Search Query or Site URL..." spellCheck={false} className="flex-1 px-4 text-white bg-transparent outline-none text-sm placeholder-zinc-650"/>
                <button type="submit" className="px-5 bg-zinc-900 border-l border-zinc-800 hover:bg-zinc-800 text-white text-xs font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer">Search</button>
              </form>
              <div className="pt-2">
                <button onClick={()=>setAiOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-[#090909] border border-zinc-800/80 rounded-full hover:bg-zinc-900 hover:border-zinc-500 font-medium text-xs tracking-wider uppercase text-zinc-300 hover:text-white transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(255,255,255,0.02)] active:scale-95" title="Unlock Neural Core AI">
                  <span className="text-zinc-500 animate-pulse">✦</span><span>XENA AI</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI SIDEBAR */}
      <section className={`fixed top-0 bottom-0 right-0 w-80 sm:w-96 bg-black border-l border-zinc-850 z-40 shadow-2xl flex flex-col transition-all duration-300 transform ${aiOpen?"translate-x-0":"translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-850 bg-black">
          <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-white"/><span className="font-semibold text-[11px] tracking-wider uppercase text-white">XENA NEURAL AI</span></div>
          <div className="flex items-center gap-1.5">
            <button onClick={()=>{const ns=!seriousMode;setSeriousMode(ns);localStorage.setItem("xena_serious_mode",String(ns));if(chatMessages.length===1&&chatMessages[0].sender==="ai"){setChatMessages([{...chatMessages[0],text:ns?"Greetings. I am XENA. How can I assist you?":"cheese"}]);}}} title={seriousMode?"Switch to Chill":"Switch to Serious"} className={`text-[9px] font-mono font-bold tracking-widest px-2 py-1 rounded border mr-1 uppercase cursor-pointer ${seriousMode?"bg-emerald-950/40 text-emerald-400 border-emerald-900/60":"bg-purple-950/40 text-purple-400 border-purple-900/60"}`}>{seriousMode?"😐 Serious":"😎 Chill"}</button>
            <button onClick={()=>startNewThread()} title="New Chat" className="text-zinc-500 hover:text-white p-1 rounded bg-zinc-950 border border-zinc-900 cursor-pointer"><Plus className="w-3.5 h-3.5"/></button>
            <button onClick={()=>{setModal("settings");setSettingsTab("ai");}} title="Chat History" className="text-zinc-500 hover:text-white p-1 rounded bg-zinc-950 border border-zinc-900 cursor-pointer"><FolderOpen className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setAiOpen(false)} className="text-zinc-500 hover:text-white p-1 cursor-pointer"><X className="w-4 h-4"/></button>
          </div>
        </div>
        <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} className={`flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative min-h-0 transition-all ${dragActive?"bg-zinc-950 border-2 border-dashed border-zinc-700 m-2 rounded-xl":""}`}>
          {dragActive&&<div className="absolute inset-x-2 inset-y-2 bg-black/90 rounded-lg flex flex-col items-center justify-center p-6 z-40 border border-zinc-800 pointer-events-none"><Sparkles className="w-8 h-8 text-white animate-pulse mb-2"/><p className="text-xs font-mono text-white tracking-widest uppercase">Drop Image Here</p></div>}
          {calibrationActive&&<div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 z-50"><div className="border border-zinc-800 bg-zinc-950 p-6 rounded-2xl w-full max-w-[260px] flex flex-col items-center space-y-4"><div className="w-10 h-10 rounded-full border-t-2 border-r-2 border-white animate-spin"/><h4 className="text-xs font-semibold tracking-wider uppercase text-white">Calibrating</h4><div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden"><div className="bg-zinc-400 h-full" style={{width:`${calibrationProgress}%`}}/></div></div></div>}
          {chatMessages.map((msg,i)=>{const ai=msg.sender==="ai";return(<div key={i} className={`flex flex-col ${ai?"items-start":"items-end"} animate-fadeIn`}><div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${ai?"bg-zinc-950 border border-zinc-850 text-zinc-200":"bg-zinc-900 border border-zinc-800 text-white"}`}>{msg.image&&<img src={msg.image} alt="" className="max-w-full max-h-40 object-cover rounded-lg mb-1.5 border border-zinc-800"/>}<p className="whitespace-pre-wrap">{msg.text}</p></div><span className="text-[9px] text-zinc-500 mt-1 px-1 font-mono flex items-center gap-1.5"><span>{msg.timestamp}</span>{ai&&msg.tokens!==undefined&&<><span>•</span><span className="text-zinc-450 uppercase tracking-wider">⚡ {(msg.elapsed?msg.elapsed/1000:0.7).toFixed(2)}s / {msg.tokens} TOKENS</span></>}<span>•</span><button onClick={()=>navigator.clipboard.writeText(msg.text)} className="text-zinc-500 hover:text-white cursor-pointer uppercase font-mono tracking-wider font-bold">COPY</button></span></div>);})}
          {aiLoading&&!calibrationActive&&<div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono py-1 px-2.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-150"></span><span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-300"></span><span>thinking...</span></div>}
        </div>
        <input type="file" ref={fileInputRef} accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=()=>{setAttachedImage(r.result as string);setAttachedImageMime(f.type);};r.readAsDataURL(f);}}} className="hidden"/>
        {attachedImage&&<div className="px-3 py-2 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between"><div className="flex items-center gap-2"><img src={attachedImage} className="w-8 h-8 rounded border border-zinc-800 object-cover"/><span className="text-[10px] text-zinc-400 font-mono">ATTACHED</span></div><button onClick={()=>setAttachedImage(null)} className="text-zinc-500 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5"/></button></div>}
        <form onSubmit={e=>{e.preventDefault();sendAIMessage();}} className="p-3 border-t border-zinc-850 bg-black">
          <div className="flex min-h-[44px] rounded-lg border border-zinc-800 bg-black overflow-hidden focus-within:border-zinc-500 items-center">
            <button type="button" onClick={()=>fileInputRef.current?.click()} className="px-2.5 h-10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer" title="Attach image"><Plus className="w-4 h-4"/></button>
            <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} onPaste={handleChatPaste} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendAIMessage();}}} placeholder="Query the internal neural cell..." className="flex-1 px-1 py-2 bg-transparent outline-none text-xs text-white placeholder-zinc-600 resize-none max-h-32 min-h-[22px]" rows={1}/>
            <button type="submit" disabled={(!chatInput.trim
