import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, RotateCw, Settings, Plus, X, Globe, Sparkles, Send,
  Activity, ExternalLink, Shield, MessageSquare
} from "lucide-react";

function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c === "+" ? "-" : c === "/" ? "_" : ""); } catch { return encodeURIComponent(v); }
}
function b64d(v: string): string {
  try { let t = v.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; return decodeURIComponent(escape(atob(t))); } catch { return v; }
}
function xore(s: string, k = "xena"): string {
  let r = ""; for (let i = 0; i < s.length; i++) r += String.fromCharCode(s.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  try { return btoa(unescape(encodeURIComponent(r))).replace(/[+/=]/g, c => c === "+" ? "-" : c === "/" ? "_" : ""); } catch { return encodeURIComponent(r); }
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

function getProxyUrl(urlStr: string, mode: string): string {
  if (!urlStr) return "";
  if (urlStr.startsWith("/") || urlStr.startsWith("http://localhost") || urlStr.startsWith("http://127.0.0.1")) return urlStr;
  const yt = getYtId(urlStr);
  if (yt) return `/view?v=${encodeURIComponent(yt)}`;
  if (mode === "b64") return `/proxy/${b64e(urlStr)}`;
  if (mode === "xor") return `/gateway/${xore(urlStr)}`;
  return `/fetch/${b64e(urlStr)}`;
}

const PROXY_MODES = [
  { id: "fetch", name: "Fetch Rewrite Engine", latency: "⚡ 12ms" },
  { id: "b64", name: "Base64 Gateway", latency: "⚡ 24ms" },
  { id: "xor", name: "XOR Cipher Tunnel", latency: "⚡ 28ms" }
];

function isUrl(t: string): boolean {
  if (!t.trim()) return false;
  if (/^https?:\/\//i.test(t)) return true;
  return /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t);
}

function getYtId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      let v = url.searchParams.get("v");
      if (!v && url.hostname.includes("youtu.be")) v = url.pathname.replace(/^\//, "").split("?")[0];
      return v;
    }
  } catch {
    const m = urlStr.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/i);
    if (m) return m[1];
  }
  return null;
}

function searchUrl(e: string, q: string): string {
  const enc = encodeURIComponent(q);
  switch (e) {
    case "google": return `https://www.google.com/search?q=${enc}`;
    case "bing": return `https://www.bing.com/search?q=${enc}`;
    default: return `https://lite.duckduckgo.com/lite/?q=${enc}`;
  }
}

function normalizeInput(e: string, input: string): string {
  const r = input.trim();
  if (!r) return searchUrl(e, "");
  if (/^https?:\/\//i.test(r)) return r;
  if (isUrl(r)) return `https://${r}`;
  return searchUrl(e, r);
}

interface Tab { id: string; title: string; url: string; proxyUrl: string; }
interface ChatMessage { sender: "user" | "ai"; text: string; timestamp: string; }

function StarryBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let anim: number;
    const resize = () => { c.width = c.parentElement?.clientWidth || window.innerWidth; c.height = c.parentElement?.clientHeight || window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const stars = Array.from({ length: 40 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.2 + 0.3, a: Math.random(), s: Math.random() * 0.015 + 0.003, d: Math.random() > 0.5 ? 1 : -1 }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#fff";
      stars.forEach(st => { st.a += st.s * st.d; if (st.a >= 1) { st.a = 1; st.d = -1; } else if (st.a <= 0.1) { st.a = 0.1; st.d = 1; } ctx.globalAlpha = st.a; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill(); });
      anim = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(anim); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none z-0" />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFact, setSplashFact] = useState("");
  useEffect(() => {
    setSplashFact(funFacts[Math.floor(Math.random() * funFacts.length)]);
    const t = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const [tabs, setTabs] = useState<Tab[]>([{ id: "tab-1", title: "Xena", url: "", proxyUrl: "" }]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [urlInput, setUrlInput] = useState("");
  const [startInput, setStartInput] = useState("");
  const [engine, setEngine] = useState(() => localStorage.getItem("engine") || "ddg");
  const [shieldOn, setShieldOn] = useState(true);
  const [proxyMode, setProxyMode] = useState(() => localStorage.getItem("pmode") || "fetch");
  const [aiOpen, setAiOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ sender: "ai", text: "cheese", timestamp: new Date().toLocaleTimeString() }]);
  const [modal, setModal] = useState<"settings" | null>(null);
  const [cloakOn, setCloakOn] = useState(() => localStorage.getItem("cloak") === "true");
  const [escKey, setEscKey] = useState(() => localStorage.getItem("eckey") || "Escape");
  const [escUrl, setEscUrl] = useState(() => localStorage.getItem("ecurl") || "https://classroom.google.com");
  const [time, setTime] = useState("");
  const [ping, setPing] = useState(25);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { localStorage.setItem("engine", engine); }, [engine]);
  useEffect(() => { localStorage.setItem("pmode", proxyMode); }, [proxyMode]);
  useEffect(() => { localStorage.setItem("cloak", String(cloakOn)); if (cloakOn) { document.title = "MathsTutoring"; let l: any = document.querySelector("link[rel*='icon']"); if (!l) { l = document.createElement("link"); l.type = "image/x-icon"; l.rel = "shortcut icon"; document.head.appendChild(l); } l.href = "https://ssl.gstatic.com/classroom/favicon.png"; } else document.title = "Xena"; }, [cloakOn]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === escKey) { window.location.href = escUrl; } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [escKey, escUrl]);
  useEffect(() => { const u = () => { setTime(new Date().toLocaleTimeString("en-US", { hour12: true })); setPing(Math.floor(Math.random() * 16) + 12); }; u(); const i = setInterval(u, 1000); return () => clearInterval(i); }, []);
  useEffect(() => { setUrlInput(activeTab.url); }, [activeTabId, activeTab.url]);

  const createTab = (raw = "") => {
    const id = `tab-${Date.now()}`;
    let tu = "", tp = "";
    if (raw) {
      if (raw.startsWith("/") || raw.startsWith("http://localhost") || raw.startsWith("http://127.0.0.1")) { tu = raw; tp = raw; }
      else { tu = normalizeInput(engine, raw); tp = getProxyUrl(tu, proxyMode); }
    }
    setTabs([...tabs, { id, title: tu ? getDomain(tu) : "Xena", url: tu, proxyUrl: tp }]);
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
    let fu = "", pp = "";
    if (input.startsWith("/") || input.startsWith("http://localhost") || input.startsWith("http://127.0.0.1")) { fu = input; pp = input; }
    else { fu = normalizeInput(engine, input); pp = getProxyUrl(fu, proxyMode); }
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, title: getDomain(fu), url: fu, proxyUrl: pp } : t));
  };

  const getDomain = (u: string): string => { try { return new URL(u).hostname.replace("www.", ""); } catch { return "Web"; } };
  const refresh = () => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src; };

  const sendMsg = async () => {
    const txt = chatInput.trim();
    if (!txt || aiLoad) return;
    const userMsg: ChatMessage = { sender: "user", text: txt, timestamp: new Date().toLocaleTimeString() };
    setMsgs(prev => [...prev, userMsg]);
    setChatInput("");
    setAiLoad(true);
    try {
      const resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: txt }) });
      const data = await resp.json();
      setMsgs(prev => [...prev, { sender: "ai", text: data.response || "cheese", timestamp: new Date().toLocaleTimeString() }]);
    } catch { setMsgs(prev => [...prev, { sender: "ai", text: "cheese", timestamp: new Date().toLocaleTimeString() }]); }
    finally { setAiLoad(false); }
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
              <button onClick={() => { try { iframeRef.current?.contentWindow?.history.back(); } catch {} }} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
              <button onClick={() => { try { iframeRef.current?.contentWindow?.history.forward(); } catch {} }} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><ArrowRight className="w-4 h-4" /></button>
              <button onClick={refresh} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white"><RotateCw className="w-4 h-4" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); go(urlInput); }} className="flex-1 flex max-w-4xl mx-3 h-8.5 rounded-lg border border-[#1a1a1a] bg-black overflow-hidden focus-within:border-zinc-500">
              <select value={engine} onChange={e => setEngine(e.target.value)} className="px-2 bg-black text-zinc-400 text-xs border-r border-[#1a1a1a] outline-none cursor-pointer focus:text-white">
                <option value="ddg">DDG</option>
                <option value="google">Google</option>
                <option value="bing">Bing</option>
              </select>
              <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Search or enter URL..." spellCheck={false} className="flex-1 px-3 text-sm bg-transparent outline-none text-white placeholder-zinc-600" />
            </form>
          </header>

          {/* TABS */}
          <section className="flex items-end justify-between px-3 bg-black border-b border-[#111] h-10 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-end gap-1 overflow-x-auto no-scrollbar">
              {tabs.map(tab => {
                const a = tab.id === activeTabId;
                return (
                  <div key={tab.id} onClick={() => setActiveTabId(tab.id)} className={`group flex items-center gap-2 px-3 h-8.5 rounded-t-lg border-t border-x cursor-pointer min-w-[120px] max-w-[170px] ${a ? "bg-black border-x border-zinc-800 border-t-zinc-400 text-white" : "bg-zinc-950/70 border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                    <Globe className={`w-3.5 h-3.5 shrink-0 ${a ? "text-zinc-300" : "text-zinc-600"}`} />
                    <span className="flex-1 text-xs truncate max-w-[100px] font-medium">{tab.title}</span>
                    <button onClick={e => closeTab(tab.id, e)} className="w-4 h-4 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-600 opacity-0 group-hover:opacity-100"><X className="w-2.5 h-2.5" /></button>
                  </div>
                );
              })}
              <button onClick={() => createTab()} className="w-7.5 h-7.5 flex items-center justify-center rounded-md border border-zinc-800 text-zinc-600 hover:text-white hover:border-zinc-500 mb-1" title="New Tab"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-1.5 mb-1.5 shrink-0 pl-4">
              <button onClick={() => setShieldOn(!shieldOn)} className={`flex items-center gap-1.5 px-2.5 h-7.5 rounded-md border text-[10px] font-mono font-medium ${shieldOn ? "bg-white/5 text-white border-zinc-750" : "bg-black text-zinc-500 border-zinc-850"}`}><Shield className="w-3.5 h-3.5" /><span className="hidden sm:inline">Block</span></button>
              <button onClick={() => setModal("settings")} className="w-7.5 h-7.5 flex items-center justify-center rounded-md border border-zinc-850 bg-black text-zinc-400 hover:text-white"><Settings className="w-4 h-4" /></button>
              <button onClick={() => go("https://www.cineby.at/")} className="flex items-center gap-1 px-2.5 h-7.5 rounded-md border border-zinc-800 bg-black text-zinc-400 hover:text-white hover:border-zinc-500 text-[10px] font-mono font-medium">📺 <span className="hidden sm:inline">Shows</span></button>
              <button onClick={() => setAiOpen(!aiOpen)} className="w-7.5 h-7.5 flex items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 p-[1.5px] hover:scale-105 shadow-[0_0_10px_rgba(168,85,247,0.45)]"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] text-white">🔮</div></button>
            </div>
          </section>

          {/* MAIN */}
          <main className="flex-1 relative bg-black overflow-hidden">
            {activeTab.proxyUrl ? (
              <iframe ref={iframeRef} src={activeTab.proxyUrl} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; geolocation; microphone; camera" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals" className="w-full h-full border-none bg-white" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative p-6 overflow-y-auto">
                <StarryBg />
                <div className="max-w-2xl w-full flex flex-col items-center text-center relative z-10 mt-8">
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Xena</h1>
                    <p className="text-xs text-zinc-500 font-mono tracking-wider">Sandbox Browser</p>
                  </div>
                  <form onSubmit={e => { e.preventDefault(); go(startInput); }} className="w-full max-w-xl flex h-11 rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden focus-within:border-zinc-500 transition-all duration-150 mb-8">
                    <select value={engine} onChange={e => setEngine(e.target.value)} className="px-3 bg-zinc-900 text-zinc-400 text-xs border-r border-zinc-800 outline-none cursor-pointer font-medium">
                      <option value="ddg">DDG</option>
                      <option value="google">Google</option>
                      <option value="bing">Bing</option>
                    </select>
                    <input type="text" value={startInput} onChange={e => setStartInput(e.target.value)} placeholder="Search or enter URL..." spellCheck={false} className="flex-1 px-4 bg-transparent outline-none text-white text-sm placeholder-zinc-600" />
                    <button type="submit" className="px-5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer">Go</button>
                  </form>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <button onClick={() => go("youtube.com")} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><ExternalLink className="w-3 h-3" />YouTube</button>
                    <button onClick={() => go("reddit.com")} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><ExternalLink className="w-3 h-3" />Reddit</button>
                    <button onClick={() => go("discord.com")} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><ExternalLink className="w-3 h-3" />Discord</button>
                    <button onClick={() => go("tiktok.com")} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><ExternalLink className="w-3 h-3" />TikTok</button>
                    <button onClick={() => setAiOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"><Sparkles className="w-3 h-3" />AI</button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono"><Activity className="w-3 h-3" />{time} · {ping}ms</div>
                </div>
              </div>
            )}
          </main>

          {/* AI SIDEBAR */}
          <section className={`fixed top-0 bottom-0 right-0 w-80 bg-black border-l border-zinc-800 z-50 shadow-2xl flex flex-col transition-all duration-300 transform ${aiOpen ? "translate-x-0" : "translate-x-full"}`}>
            <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800">
              <span className="text-sm font-semibold text-white">Xena AI</span>
              <button onClick={() => setAiOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.sender === "user" ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-200"}`}>{m.text}</div>
                </div>
              ))}
              {aiLoad && <div className="text-center text-zinc-500 text-xs">thinking...</div>}
            </div>
            <div className="border-t border-zinc-800 p-3">
              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="..." className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-zinc-600 placeholder-zinc-600" />
                <button onClick={sendMsg} disabled={aiLoad} className="px-3 py-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 disabled:opacity-50"><Send className="w-4 h-4 text-white" /></button>
              </div>
            </div>
          </section>

          {/* SETTINGS */}
          {modal === "settings" && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => setModal(null)}>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-white">Settings</h2>
                  <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">Cloak Mode</label>
                    <button onClick={() => setCloakOn(!cloakOn)} className={`px-4 py-2 text-xs rounded-lg ${cloakOn ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>{cloakOn ? "ON - Tab shows MathsTutoring" : "OFF"}</button>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">Escape Key</label>
                    <input type="text" value={escKey} onChange={e => setEscKey(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">Escape URL</label>
                    <input type="text" value={escUrl} onChange={e => setEscUrl(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">Mode</label>
                    <select value={proxyMode} onChange={e => setProxyMode(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white">
                      {PROXY_MODES.map(m => <option key={m.id} value={m.id}>{m.name} {m.latency}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
