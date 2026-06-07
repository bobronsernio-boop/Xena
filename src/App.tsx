import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send, Trash2, 
  Activity, ExternalLink, Shield, MessageSquare, ChevronRight, ClipboardList, FolderOpen, 
  Cpu, Lock, BookOpen, GraduationCap, Calculator, Award, ChevronDown
} from "lucide-react";

function base64UrlEncode(value: string): string {
  try { return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); } catch { return encodeURIComponent(value); }
}
function base64UrlDecode(value: string): string {
  try { let token = value.replace(/-/g, "+").replace(/_/g, "/"); while (token.length % 4 !== 0) token += "="; return decodeURIComponent(escape(atob(token))); } catch { return value; }
}
function xorEncode(str: string, key = "xena"): string {
  let result = ""; for (let i = 0; i < str.length; i++) result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  try { return btoa(unescape(encodeURIComponent(result))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); } catch { return encodeURIComponent(result); }
}

const funFacts = [
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than a year on Venus.",
  "Bananas are berries, but strawberries aren't.",
  "Honey never spoils. Archaeologists found 3000-year-old honey still edible.",
  "The Eiffel Tower grows 6 inches taller in summer due to heat expansion.",
  "A group of flamingos is called a 'flamboyance'.",
  "Wombat poop is cube-shaped so it doesn't roll away.",
  "There are more trees on Earth than stars in the Milky Way.",
  "The human nose can remember 50,000 different scents.",
  "Hot water freezes faster than cold water (Mpemba effect)."
];

function getProxyUrlStatic(urlStr: string, activeMode: string): string {
  if (!urlStr) return "";
  if (urlStr.startsWith("/") || urlStr.startsWith("http://localhost") || urlStr.startsWith("http://127.0.0.1")) return urlStr;
  const ytId = getYoutubeVideoId(urlStr);
  if (ytId) return `/view?v=${encodeURIComponent(ytId)}`;
  if (activeMode === "base64_gateway") return `/proxy/${base64UrlEncode(urlStr)}`;
  else if (activeMode === "xor_gateway") return `/gateway/${xorEncode(urlStr)}`;
  else return `/4dysv/${encodeURIComponent(urlStr)}`;
}

const PROXY_MODES = [
  { id: "sw_scramjet", name: "Service Worker Engine", badge: "SCRAMJET ACTIVE", latency: "⚡ 12ms", desc: "Registers client-side service worker interception overlays. Re-routes nested assets dynamically inside frames.", recommend: true },
  { id: "base64_gateway", name: "Base64 Gateway Tunnel", badge: "DEEP REWRITE", latency: "⚡ 24ms", desc: "Translates nested anchor paths using base64 tokens through custom Express proxy middlewares.", recommend: false },
  { id: "xor_gateway", name: "XOR Masked Cipher Node", badge: "XOR CIPHER", latency: "⚡ 28ms", desc: "Applies byte-wise XOR symmetric keys before transmission. Masks query text from keyword sniffers.", recommend: true },
  { id: "cors_bypass", name: "CORS Bypasser Proxy", badge: "FRAME SYNC", latency: "⚡ 45ms", desc: "Overwrites Cross-Origin policies at the server boundary.", recommend: false },
  { id: "rev_proxy", name: "Reverse Proxy Forwarder", badge: "PORT BOUNDARY", latency: "⚡ 18ms", desc: "Establishes upstream target gateways at nginx-proxy points.", recommend: false },
  { id: "mesh_p2p", name: "Peer-to-Peer Mesh Relay", badge: "P2P MESH", latency: "⚡ 94ms", desc: "Bypasses central database overhead by streaming assets over WebRTC peer groups.", recommend: false },
  { id: "dns_over_https", name: "DNS Secure HTTPS Router", badge: "TLS DNS", latency: "⚡ 36ms", desc: "Resolves host DNS records through TLS Cloudflare endpoints before Express fetches documents.", recommend: false },
  { id: "html5_sandbox", name: "Pure HTML5 Micro-Sandbox", badge: "SANDBOX IFRAME", latency: "⚡ 8ms", desc: "Embeds sites in high-restriction iframe tags. Bypasses NodeJS network parsing.", recommend: false },
  { id: "header_mask", name: "Telemetry Header Masker", badge: "HEADER SHIELD", latency: "⚡ 15ms", desc: "Strips origin tracers, tracking referrers, and device signatures.", recommend: false },
  { id: "websocket_binary", name: "WebSocket Byte Streamer", badge: "BINARY LANE", latency: "⚡ 52ms", desc: "Streams content over a persistent socket connection. DPI cannot parse the streams.", recommend: false },
  { id: "shadow_dom_emulation", name: "Shadow DOM Isolation Sandbox", badge: "SHADOW SHIELD", latency: "⚡ 65ms", desc: "Renders proxied sources inside safe shadow nodes.", recommend: false }
];

function isProbablyUrl(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  return /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t);
}

function getYoutubeVideoId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      let v = url.searchParams.get("v");
      if (!v && url.hostname.includes("youtu.be")) v = url.pathname.replace(/^\//, "").split("?")[0];
      return v;
    }
  } catch {
    const watchMatch = urlStr.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/i);
    if (watchMatch) return watchMatch[1];
  }
  return null;
}

function searchUrl(engine: string, query: string): string {
  const q = encodeURIComponent(query);
  switch (engine) {
    case "qwant": return `https://lite.qwant.com/?q=${q}`;
    case "startpage": return `https://www.startpage.com/sp/search?query=${q}`;
    case "bing": return `https://www.bing.com/search?q=${q}`;
    case "google": return `https://www.google.com/search?q=${q}`;
    default: return `https://duckduckgo.com/?q=${q}`;
  }
}

function normalizeInputToUrl(engine: string, input: string): string {
  const raw = input.trim();
  if (!raw) return searchUrl(engine, "");
  if (/^https?:\/\//i.test(raw)) return raw;
  if (isProbablyUrl(raw)) return `https://${raw}`;
  return searchUrl(engine, raw);
}

interface Tab { id: string; title: string; url: string; proxyUrl: string; }
interface Report { id: string; kind: "bug" | "suggestion"; title: string; url?: string; details: string; }
interface ChatMessage { sender: "user" | "ai"; text: string; image?: string; tokens?: number; elapsed?: number; timestamp: string; }
interface SearchHistoryItem { id: string; query: string; engine: string; timestamp: string; }
interface BrowseHistoryItem { id: string; url: string; title: string; timestamp: string; }
interface ChatThread { id: string; title: string; messages: ChatMessage[]; timestamp: string; }

function StarryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => { canvas.width = canvas.parentElement?.clientWidth || window.innerWidth; canvas.height = canvas.parentElement?.clientHeight || window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5, alpha: Math.random(),
      speed: Math.random() * 0.015 + 0.005, dir: Math.random() > 0.5 ? 1 : -1
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      stars.forEach(s => {
        s.alpha += s.speed * s.dir;
        if (s.alpha >= 1) { s.alpha = 1; s.dir = -1; } else if (s.alpha <= 0.15) { s.alpha = 0.15; s.dir = 1; }
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animId); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFact, setSplashFact] = useState("");

  useEffect(() => {
    setSplashFact(funFacts[Math.floor(Math.random() * funFacts.length)]);
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const startUrl = params.get("url");
      if (startUrl) {
        try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
        let finalUrl = "", proxyPath = "";
        const savedMode = localStorage.getItem("xena_proxy_mode") || "sw_scramjet";
        if (startUrl.startsWith("/") || startUrl.startsWith("http://localhost") || startUrl.startsWith("http://127.0.0.1")) { finalUrl = startUrl; proxyPath = startUrl; }
        else {
          const ytId = getYoutubeVideoId(startUrl);
          if (ytId) { finalUrl = `/view?v=${encodeURIComponent(ytId)}`; proxyPath = finalUrl; }
          else { finalUrl = startUrl; proxyPath = getProxyUrlStatic(finalUrl, savedMode); }
        }
        let domain = "Web Page";
        try { domain = new URL(finalUrl).hostname.replace("www.", ""); } catch {}
        return [{ id: "tab-1", title: finalUrl.startsWith("/view") ? "Xena Player" : domain, url: finalUrl, proxyUrl: proxyPath }];
      }
    } catch {}
    return [{ id: "tab-1", title: "Xena", url: "", proxyUrl: "" }];
  });

  const [activeTabId, setActiveTabId] = useState<string>("tab-1");
  const [urlInput, setUrlInput] = useState<string>("");
  const [startInput, setStartInput] = useState<string>("");
  const [searchEngine, setSearchEngine] = useState<string>(() => localStorage.getItem("xena_engine") || "ddg");
  const [proxyKey, setProxyKey] = useState<string>(() => localStorage.getItem("xena_proxy_key") || "");
  const [shieldActive, setShieldActive] = useState<boolean>(true);
  const [cloakActive, setCloakActive] = useState<boolean>(() => localStorage.getItem("xena_cloak") === "true");
  const [escapeKey, setEscapeKey] = useState<string>(() => localStorage.getItem("xena_escape_key") || "Escape");
  const [escapeUrl, setEscapeUrl] = useState<string>(() => localStorage.getItem("xena_escape_url") || "https://classroom.google.com");
  const [proxyMode, setProxyMode] = useState<any>(() => (localStorage.getItem("xena_proxy_mode") as any) || "sw_scramjet");
  const getProxyUrlFor = (urlStr: string, am = proxyMode) => getProxyUrlStatic(urlStr, am);
  const [modal, setModal] = useState<"settings" | "report" | "diagnostics" | null>(null);
  const [reports, setReports] = useState<Report[]>(() => { const r = localStorage.getItem("xena_reports"); return r ? JSON.parse(r) : []; });
  const [reportForm, setReportForm] = useState<any>({ kind: "bug", title: "", url: "", details: "" });
  const [aiOpen, setAiOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<string>("general");
  const [autofixLoading, setAutofixLoading] = useState<boolean>(false);
  const [autofixProgress, setAutofixProgress] = useState<string>("");
  const [autofixReport, setAutofixReport] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => { const r = localStorage.getItem("xena_search_history"); return r ? JSON.parse(r) : []; });
  const [browseHistory, setBrowseHistory] = useState<BrowseHistoryItem[]>(() => { const r = localStorage.getItem("xena_browse_history"); return r ? JSON.parse(r) : []; });
  const [chatThreads, setChatThreads] = useState<ChatThread[]>(() => {
    const raw = localStorage.getItem("xena_chat_threads");
    if (raw) { try { let p: ChatThread[] = JSON.parse(raw); return p.map(th => { if (th.messages?.[0]?.sender === "ai" && ["daydreaming","XENA AI","Double cheese","Just kidding","Surf's up","What is cooking"].some(x => th.messages[0].text.includes(x))) th.messages[0].text = "cheese"; return th; }); } catch {} }
    const old = localStorage.getItem("xena_chat_v1");
    let msgs = [{ sender: "ai" as "ai", text: "cheese", timestamp: new Date().toLocaleTimeString() }];
    if (old) { try { msgs = JSON.parse(old); } catch {} }
    return [{ id: "thread-default", title: "Initial Sync Chat", messages: msgs, timestamp: new Date().toLocaleString() }];
  });
  const [activeThreadId, setActiveThreadId] = useState<string>(() => localStorage.getItem("xena_active_thread_id") || "thread-default");
  const activeThread = chatThreads.find(th => th.id === activeThreadId) || chatThreads[0];
  const chatMessages = activeThread ? activeThread.messages : [];
  const setChatMessages = (f: any) => {
    setChatThreads(prev => {
      const next = prev.map(th => {
        if (th.id === activeThreadId) { const m = typeof f === "function" ? f(th.messages) : f; return { ...th, messages: m, timestamp: new Date().toLocaleString() }; }
        return th;
      });
      localStorage.setItem("xena_chat_threads", JSON.stringify(next));
      return next;
    });
  };
  const startNewThread = (t?: string) => {
    const id = `thread-${Date.now()}`;
    const next = [{ id, title: t || `Dialogue ${chatThreads.length + 1}`, messages: [{ sender: "ai" as "ai", text: "cheese", timestamp: new Date().toLocaleTimeString() }], timestamp: new Date().toLocaleString() }, ...chatThreads];
    setChatThreads(next); setActiveThreadId(id); localStorage.setItem("xena_chat_threads", JSON.stringify(next)); localStorage.setItem("xena_active_thread_id", id);
  };
  const deleteThread = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (chatThreads.length === 1) {
      const reset = [{ id: "thread-default", title: "Initial Sync Chat", messages: [{ sender: "ai" as "ai", text: "cheese", timestamp: new Date().toLocaleTimeString() }], timestamp: new Date().toLocaleString() }];
      setChatThreads(reset); setActiveThreadId("thread-default"); localStorage.setItem("xena_chat_threads", JSON.stringify(reset)); localStorage.setItem("xena_active_thread_id", "thread-default"); return;
    }
    const filtered = chatThreads.filter(th => th.id !== id);
    setChatThreads(filtered); localStorage.setItem("xena_chat_threads", JSON.stringify(filtered));
    if (activeThreadId === id) { setActiveThreadId(filtered[0].id); localStorage.setItem("xena_active_thread_id", filtered[0].id); }
  };
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageMime, setAttachedImageMime] = useState<string>("image/png");
  const [calibrationActive, setCalibrationActive] = useState<boolean>(false);
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);
  const [bypassCalibration, setBypassCalibration] = useState<boolean>(() => { const s = localStorage.getItem("xena_bypass_calibration"); return s !== null ? s === "true" : true; });
  const [seriousMode, setSeriousMode] = useState<boolean>(() => localStorage.getItem("xena_serious_mode") === "true");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [ping, setPing] = useState<number>(25);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) { const f = e.dataTransfer.files[0]; if (f.type.startsWith("image/")) { const r = new FileReader(); r.onload = () => { setAttachedImage(r.result as string); setAttachedImageMime(f.type); }; r.readAsDataURL(f); } } };
  const handleChatPaste = (e: React.ClipboardEvent<HTMLInputElement>) => { const items = e.clipboardData?.items; if (!items) return; for (let i = 0; i < items.length; i++) { const item = items[i]; if (item.type.includes("image")) { const f = item.getAsFile(); if (f) { const r = new FileReader(); r.onload = () => { setAttachedImage(r.result as string); setAttachedImageMime(f.type); }; r.readAsDataURL(f); e.preventDefault(); } } } };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { localStorage.setItem("xena_engine", searchEngine); }, [searchEngine]);
  useEffect(() => { const u = () => { setCurrentTime(new Date().toLocaleTimeString("en-US", { hour12: true })); setPing(Math.floor(Math.random() * 16) + 12); }; u(); const i = setInterval(u, 1000); return () => clearInterval(i); }, []);
  useEffect(() => {
    localStorage.setItem("xena_cloak", String(cloakActive));
    if (cloakActive) {
      document.title = "MathsTutoring";
      let link: any = document.querySelector("link[rel*='icon']");
      if (!link) { link = document.createElement("link"); link.type = "image/x-icon"; link.rel = "shortcut icon"; document.getElementsByTagName("head")[0].appendChild(link); }
      link.href = "https://ssl.gstatic.com/classroom/favicon.png";
    } else { document.title = "Xena"; }
  }, [cloakActive]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === escapeKey) { e.preventDefault(); window.location.href = escapeUrl; } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [escapeKey, escapeUrl]);
  useEffect(() => {
    const h = (e: MessageEvent) => {
      const d = e.data;
      if (d && typeof d === "object") {
        if ((d.type === "xena-open" || d.type === "open-new-tab") && d.url) { e.preventDefault(); createNewTab(d.url); }
        else if (d.type === "xena-navigate" && (d.proxyUrl || d.url)) {
          let ru = d.url || "";
          if (!ru) {
            const p = d.proxyUrl || "";
            if (p.includes("/4dysv/")) ru = decodeURIComponent(p.substring(p.indexOf("/4dysv/") + 7));
            else { const m = p.match(/^\/(proxy|gateway)\/([^\/?#]+)(.*)/); if (m) { let db = ""; try { db = base64UrlDecode(m[2]); } catch { db = m[2]; } if (db.startsWith("http")) { ru = db; if (m[3]) { try { ru = new URL(m[3], db).toString(); } catch {} } } } }
          }
          if (ru?.startsWith("http")) {
            setTabs(prev => prev.map(t => {
              if (t.id === activeTabId && t.url !== ru) {
                setTimeout(() => { setBrowseHistory(p => { if (p[0]?.url === ru) return p; const n = [{ id: `b-${Date.now()}`, url: ru, title: d.title || getDomainOfUrl(ru), timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }, ...p].slice(0, 100); localStorage.setItem("xena_browse_history", JSON.stringify(n)); return n; }); }, 10);
                return { ...t, title: d.title || getDomainOfUrl(ru), url: ru, proxyUrl: d.proxyUrl || getProxyUrlFor(ru) };
              }
              return t;
            }));
          }
        }
      }
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [tabs, activeTabId]);
  useEffect(() => { setUrlInput(activeTab.url); }, [activeTabId, activeTab.url]);

  const createNewTab = (rawUrl: string = "") => {
    const id = `tab-${Date.now()}`;
    let tu = "", tp = "";
    if (rawUrl) {
      if (rawUrl.startsWith("/") || rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127.0.0.1")) { tu = rawUrl; tp = rawUrl; }
      else { tu = normalizeInputToUrl(searchEngine, rawUrl); tp = getProxyUrlFor(tu); }
    }
    setTabs([...tabs, { id, title: tu ? (tu === "/dev.html" ? "XENA Dev Panel" : (tu.startsWith("/view") ? "Xena Player" : getDomainOfUrl(tu))) : "Xena", url: tu, proxyUrl: tp }]);
    setActiveTabId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => { e.stopPropagation(); if (tabs.length === 1) return; const f = tabs.filter(t => t.id !== id); setTabs(f); if (activeTabId === id) setActiveTabId(f[f.length - 1].id); };

  const handleNavigate = (rawInput: string) => {
    if (!rawInput.trim()) return;
    let fu = "", pp = "";
    if (rawInput.startsWith("/") || rawInput.startsWith("http://localhost") || rawInput.startsWith("http://127.0.0.1")) { fu = rawInput; pp = rawInput; }
    else { fu = normalizeInputToUrl(searchEngine, rawInput); pp = getProxyUrlFor(fu); }
    const isUrl = rawInput.startsWith("/") || isProbablyUrl(rawInput) || /^https?:\/\//i.test(rawInput);
    const ts = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (isUrl && !rawInput.startsWith("/")) {
      setTimeout(() => { setBrowseHistory(p => { if (p[0]?.url === fu) return p; const n = [{ id: `b-${Date.now()}`, url: fu, title: fu.startsWith("/view") ? "Xena Player" : getDomainOfUrl(fu), timestamp: ts }, ...p].slice(0, 100); localStorage.setItem("xena_browse_history", JSON.stringify(n)); return n; }); }, 10);
    } else if (!rawInput.startsWith("/")) {
      setTimeout(() => { setSearchHistory(p => { const n = [{ id: `s-${Date.now()}`, query: rawInput, engine: searchEngine, timestamp: ts }, ...p].slice(0, 100); localStorage.setItem("xena_search_history", JSON.stringify(n)); return n; }); }, 10);
    }
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, title: fu === "/dev.html" ? "XENA Dev Panel" : (fu.startsWith("/view") ? "Xena Player" : getDomainOfUrl(fu)), url: fu, proxyUrl: pp } : t));
  };

  const getDomainOfUrl = (urlStr: string): string => { try { return new URL(urlStr).hostname.replace("www.", ""); } catch { return "Web Page"; } };
  const triggerRefresh = () => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; };
  const submitReport = () => {
    if (!reportForm.title || !reportForm.details) { alert("Fill in title and details"); return; }
    const item: Report = { id: `rep-${Date.now()}`, kind: reportForm.kind, title: reportForm.title, url: reportForm.url, details: reportForm.details };
    const next = [item, ...reports]; setReports(next); localStorage.setItem("xena_reports", JSON.stringify(next));
    fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reportForm) }).catch(() => {});
    setReportForm({ kind: "bug", title: "", url: "", details: "" }); alert("Report filed!"); setModal(null);
  };

  const sendAIMessage = async (customText?: string) => {
    const txt = customText !== undefined ? customText : chatInput;
    if (!txt.trim() && !attachedImage) return;
    if (aiLoading) return;
    const userMsg: ChatMessage = { sender: "user", text: txt, image: attachedImage || undefined, timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }) };
    setChatMessages((prev: ChatMessage[]) => [...prev, userMsg]);
    setChatInput(""); setAttachedImage(null); setAiLoading(true);
    try {
      let rt = "";
      try { const resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg.text }) }); if (resp.ok) { const d = await resp.json(); rt = d.response || "cheese"; } else rt = "cheese"; } catch { rt = "cheese"; }
      setChatMessages((prev: ChatMessage[]) => [...prev, { sender: "ai", text: rt, tokens: Math.ceil(rt.length / 4), elapsed: 0, timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }) }]);
    } catch { setChatMessages((prev: ChatMessage[]) => [...prev, { sender: "ai", text: "cheese", tokens: 10, elapsed: 5, timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }) }]); }
    finally { setAiLoading(false); }
  };

  return (
    <>
      {showSplash ? (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-[#fce8d9]">
          <h1 className="text-4xl font-bold text-[#4a3728] mb-4">Riverbend Tutoring</h1>
          <p className="text-[#8b6f5a] max-w-md text-center">Free tutoring for grades 4-13! Get 10 free exam points after doing our daily quizzes. So what are you waiting for? Start boosting your brain now!</p>
          <p className="text-[#8b6f5a] text-sm mt-8">{splashFact}</p>
        </div>
      ) : (
        <div className="w-full h-screen flex flex-col bg-black text-white overflow-hidden select-none font-sans relative">
          {/* TOP BAR */}
          <header className="flex items-center gap-2 px-3 h-14 bg-black border-b border-[#111] relative z-20 shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => { try { iframeRef.current?.contentWindow?.history.back(); } catch {} }} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white" title="Back"><ArrowLeft className="w-4 h-4" /></button>
              <button onClick={() => { try { iframeRef.current?.contentWindow?.history.forward(); } catch {} }} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white" title="Forward"><ArrowRight className="w-4 h-4" /></button>
              <button onClick={triggerRefresh} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white" title="Reload"><RotateCw className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleNavigate(urlInput); }} className="flex-1 flex max-w-4xl mx-3 h-8.5 rounded-lg border border-[#1a1a1a] bg-black overflow-hidden focus-within:border-zinc-500">
              <select value={searchEngine} onChange={(e) => setSearchEngine(e.target.value)} className="px-2 bg-black text-zinc-400 text-xs border-r border-[#1a1a1a] outline-none cursor-pointer focus:text-white">
                <option value="ddg">DDG</option>
                <option value="google">Google</option>
                <option value="bing">Bing</option>
                <option value="qwant">Qwant</option>
                <option value="startpage">Startpage</option>
              </select>
              <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Search or enter URL (e.g. tiktok.com, youtube.com)" spellCheck={false} className="flex-1 px-3 text-sm bg-transparent outline-none text-white placeholder-zinc-600" />
            </form>
          </header>
          {/* TABS */}
          <section className="flex items-end justify-between px-3 bg-black border-b border-[#111] h-10 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-end gap-1 overflow-x-auto no-scrollbar">
              {tabs.map(tab => {
                const active = tab.id === activeTabId;
                return (
                  <div key={tab.id} onClick={() => setActiveTabId(tab.id)} className={`group flex items-center gap-2 px-3 h-8.5 rounded-t-lg border-t border-x cursor-pointer min-w-[125px] max-w-[185px] ${active ? "bg-black border-x border-zinc-800 border-t-zinc-400 text-white" : "bg-zinc-950/70 border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                    <Globe className={`w-3.5 h-3.5 shrink-0 ${active ? "text-zinc-300" : "text-zinc-600"}`} />
                    <span className="flex-1 text-xs truncate max-w-[105px] font-medium">{tab.title}</span>
                    <button onClick={(e) => closeTab(tab.id, e)} className="flex items-center justify-center w-4 h-4 rounded hover:bg-zinc-800 hover:text-white text-zinc-600 opacity-0 group-hover:opacity-100"><X className="w-2.5 h-2.5" /></button>
                  </div>
                );
              })}
              <button onClick={() => createNewTab()} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-800 text-zinc-600 hover:text-white hover:border-zinc-500 mb-1" title="New Tab"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-1.5 mb-1.5 shrink-0 pl-4">
              <button onClick={() => setShieldActive(!shieldActive)} className={`flex items-center gap-1.5 px-2.5 h-7.5 rounded-md border text-[10px] font-mono font-medium ${shieldActive ? "bg-white/5 text-white border-zinc-750" : "bg-black text-zinc-500 border-zinc-850"}`} title="Xena Shield"><Shield className="w-3.5 h-3.5" /><span className="hidden sm:inline">AdBlock</span></button>
              <button onClick={() => setModal("report")} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-zinc-400 hover:text-red-400 hover:border-red-500/30 text-[11px]" title="Bug Report">🐞</button>
              <button onClick={() => setModal("settings")} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-zinc-450 hover:text-white" title="Settings"><Settings className="w-4 h-4" /></button>
              <button onClick={() => handleNavigate("https://www.cineby.at/")} className="flex items-center gap-1 px-2.5 h-7.5 rounded-md border border-zinc-800 bg-black text-zinc-400 hover:text-white hover:border-zinc-500 text-[10px] font-mono font-medium" title="Shows">📺 <span className="hidden sm:inline">Shows</span></button>
              <button onClick={() => setAiOpen(!aiOpen)} className="relative flex items-center justify-center w-7.5 h-7.5 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 p-[1.5px] hover:scale-105 shadow-[0_0_10px_rgba(168,85,247,0.45)]" title="XENA AI"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px]">🔮</div></button>
            </div>
          </section>
          {/* MAIN */}
          <main className="flex-1 relative bg-black overflow-hidden">
            {activeTab.proxyUrl ? (
              <iframe ref={iframeRef} src={activeTab.proxyUrl} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; geolocation; microphone; camera" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals" className="w-full h-full border-none bg-white" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative p-6 overflow-y-auto">
                <StarryCanvas />
                <div className="max-w-3xl w-full flex flex-col items-center text-center relative z-10 mt-16">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-500/20">
                      <Globe className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h1 className="text-3xl font-bold text-white tracking-tight">Xena</h1>
                      <p className="text-[11px] text-zinc-500 font-mono tracking-wider uppercase">Sandbox Proxy Browser</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 max-w-lg mb-8 leading-relaxed">Type a URL or search term below. Xena fetches and rewrites pages on the fly — no tracking, no restrictions.</p>
                  <form onSubmit={(e) => { e.preventDefault(); handleNavigate(startInput); }} className="w-full max-w-2xl flex h-12 rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden shadow-2xl focus-within:border-purple-500 transition-all duration-200 mb-12">
                    <select value={searchEngine} onChange={(e) => setSearchEngine(e.target.value)} className="px-4 bg-zinc-900 text-zinc-400 text-xs border-r border-zinc-800 outline-none cursor-pointer font-medium">
                      <option value="ddg">DuckDuckGo</option>
                      <option value="google">Google</option>
                      <option value="bing">Bing</option>
                      <option value="qwant">Qwant</option>
                      <option value="startpage">Startpage</option>
                    </select>
                    <input type="text" value={startInput} onChange={(e) => setStartInput(e.target.value)} placeholder="Search or enter URL... (fun fact: {funFacts[Math.floor(Math.random() * funFacts.length)]})" spellCheck={false} className="flex-1 px-4 bg-transparent outline-none text-white text-sm placeholder-zinc-600" />
                    <button type="submit" className="px-6 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer">Go</button>
                  </form>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-600 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3"><Cpu className="w-5 h-5 text-purple-400" /></div>
                      <h3 className="text-sm font-bold text-white mb-2">Proxy Engine</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">Fetches and rewrites any URL through Xena's custom proxy. Strips security headers so sites load in the sandbox.</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-600 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center mb-3"><Lock className="w-5 h-5 text-pink-400" /></div>
                      <h3 className="text-sm font-bold text-white mb-2">No Tracking</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">Cloak mode changes the tab title and icon. Escape key instantly redirects to a safe page. Shield blocks ads and trackers.</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-600 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-3"><Sparkles className="w-5 h-5 text-amber-400" /></div>
                      <h3 className="text-sm font-bold text-white mb-2">YouTube Player</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">Built-in YouTube search and sandboxed player. No cookies, no ads, no tracking.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mb-8">
                    <button onClick={() => handleNavigate("youtube.com")} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"><ExternalLink className="w-3 h-3" /> YouTube</button>
                    <button onClick={() => handleNavigate("reddit.com")} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"><ExternalLink className="w-3 h-3" /> Reddit</button>
                    <button onClick={() => handleNavigate("discord.com")} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"><ExternalLink className="w-3 h-3" /> Discord</button>
                    <button onClick={() => setAiOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 border border-purple-500 rounded-full text-[11px] text-white hover:bg-purple-700 transition-all"><Sparkles className="w-3 h-3" /> AI Assistant</button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono">
                    <Activity className="w-3 h-3" /> {currentTime} · {ping}ms · Xena v2.0
                  </div>
                </div>
              </div>
            )}
          </main>
          {/* AI SIDEBAR */}
          <section className={`fixed top-0 bottom-0 right-0 w-80 sm:w-96 bg-black border-l border-zinc-800 z-40 shadow-2xl flex flex-col transition-all duration-300 transform ${aiOpen ? "translate-x-0" : "translate-x-full"}`}>
            <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 bg-black">
              <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-purple-400" /><span className="font-semibold text-xs text-white">XENA Neural AI</span></div>
              <button onClick={() => setAiOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.sender === "user" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-200"}`}>
                    {msg.text}
                    {msg.tokens && <span className="block text-[9px] text-zinc-500 mt-1">{msg.tokens} tokens</span>}
                  </div>
                </div>
              ))}
              {aiLoading && <div className="text-center text-zinc-500 text-xs">thinking...</div>}
            </div>
            <div className="border-t border-zinc-800 p-3">
              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendAIMessage()} onPaste={handleChatPaste} placeholder="Ask Xena..." className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-purple-500 placeholder-zinc-600" />
                <button onClick={() => sendAIMessage()} disabled={aiLoading} className="px-3 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"><Send className="w-4 h-4 text-white" /></button>
              </div>
            </div>
          </section>
          {/* SETTINGS MODAL */}
          {modal === "settings" && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setModal(null)}>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-white">Settings</h2>
                  <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-2">
                  {["general","search","ai","autofix"].map(t => (
                    <button key={t} onClick={() => setSettingsTab(t)} className={`px-3 py-1.5 text-xs rounded-md capitalize ${settingsTab === t ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"}`}>{t}</button>
                  ))}
                </div>
                {settingsTab === "general" && (
                  <div className="space-y-4">
                    <div><label className="text-xs text-zinc-400 block mb-1">Cloak Mode</label><button onClick={() => setCloakActive(!cloakActive)} className={`px-4 py-2 text-xs rounded-lg ${cloakActive ? "bg-green-600" : "bg-zinc-800"}`}>{cloakActive ? "ON" : "OFF"}</button></div>
                    <div><label className="text-xs text-zinc-400 block mb-1">Escape Key</label><input type="text" value={escapeKey} onChange={(e) => setEscapeKey(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" /></div>
                    <div><label className="text-xs text-zinc-400 block mb-1">Escape URL</label><input type="text" value={escapeUrl} onChange={(e) => setEscapeUrl(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" /></div>
                    <div><label className="text-xs text-zinc-400 block mb-1">Proxy Mode</label>
                      <select value={proxyMode} onChange={(e) => { setProxyMode(e.target.value); localStorage.setItem("xena_proxy_mode", e.target.value); }} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white">
                        {PROXY_MODES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {settingsTab === "search" && (
                  <div><label className="text-xs text-zinc-400 block mb-1">Default Search Engine</label>
                    <select value={searchEngine} onChange={(e) => setSearchEngine(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white">
                      <option value="ddg">DuckDuckGo</option>
                      <option value="google">Google</option>
                      <option value="bing">Bing</option>
                      <option value="qwant">Qwant</option>
                      <option value="startpage">Startpage</option>
                    </select>
                    <div className="mt-4"><h3 className="text-xs text-zinc-400 mb-2 font-semibold">Search History</h3>{searchHistory.slice(0, 5).map(s => <div key={s.id} className="text-[10px] text-zinc-500 py-1 border-b border-zinc-800">{s.query} <span className="text-zinc-700">({s.engine})</span></div>)}</div>
                  </div>
                )}
                {settingsTab === "ai" && (
                  <div><h3 className="text-xs text-zinc-400 mb-2 font-semibold">AI Chat Threads</h3>{chatThreads.slice(0, 5).map(th => <div key={th.id} className="flex items-center justify-between text-xs text-zinc-300 py-2 border-b border-zinc-800"><span>{th.title}</span><button onClick={(e) => deleteThread(th.id, e)} className="text-red-400 hover:text-red-300 text-[10px]">Delete</button></div>)}</div>
                )}
                {settingsTab === "autofix" && (
                  <div><p className="text-xs text-zinc-400">Autofix diagnostics will appear here.</p></div>
                )}
              </div>
            </div>
          )}
          {/* REPORT MODAL */}
          {modal === "report" && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setModal(null)}>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-white mb-4">Report Bug / Suggestion</h2>
                <div className="space-y-3">
                  <select value={reportForm.kind} onChange={(e) => setReportForm({...reportForm, kind: e.target.value as any})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white">
                    <option value="bug">Bug Report</option>
                    <option value="suggestion">Suggestion</option>
                  </select>
                  <input type="text" value={reportForm.title} onChange={(e) => setReportForm({...reportForm, title: e.target.value})} placeholder="Title" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-600" />
                  <input type="text" value={reportForm.url} onChange={(e) => setReportForm({...reportForm, url: e.target.value})} placeholder="URL (optional)" className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-600" />
                  <textarea value={reportForm.details} onChange={(e) => setReportForm({...reportForm, details: e.target.value})} placeholder="Details" rows={4} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-600 resize-none" />
                  <button onClick={submitReport} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg">Submit</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
