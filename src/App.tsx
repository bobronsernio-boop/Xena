import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Globe, Plus, Settings, Shield, X } from 'lucide-react';
import StarryBg from './StarryBg';
import { PROXY_MODES, DDG_OPTIONS, FUN_FACTS, rewriteHtml, generateSW } from './proxyEngine';

function b64e(v: string): string {
  try { return btoa(unescape(encodeURIComponent(v))).replace(/[+/=]/g, c => c==="+"?"-":c==="/"?"_":""); } catch { return encodeURIComponent(v); }
}
function b64d(v: string): string {
  try { let t=v.replace(/-/g,"+").replace(/_/g,"/"); while(t.length%4) t+="="; return decodeURIComponent(escape(atob(t))); } catch { return v; }
}

// Placeholder for missing components
function TikTokClone({onBack}:{onBack:()=>void}) {
  return <div className="w-full h-screen bg-black flex items-center justify-center">
    <button onClick={onBack} className="text-white">Back</button>
  </div>;
}

function DevConsole({onClose,reports}:{onClose:()=>void,reports:Report[]}) {
  return <div className="w-full h-screen bg-black flex items-center justify-center">
    <button onClick={onClose} className="text-white">Close</button>
  </div>;
}

function AdminConsole({onClose,reports,onLogout}:{onClose:()=>void,reports:Report[],onLogout:()=>void}) {
  return <div className="w-full h-screen bg-black flex items-center justify-center">
    <button onClick={onClose} className="text-white">Close</button>
  </div>;
}

interface Tab{id:string;title:string;url:string;proxyUrl:string;}
interface ChatMessage{sender:"user"|"ai";text:string;timestamp:string;}
interface Report{id:string;kind:"bug"|"suggestion";title:string;url?:string;details:string;important?:boolean;}
interface Shortcut{id:string;name:string;url:string;icon:string;}
interface SearchHistoryItem{id:string;query:string;engine:string;timestamp:string;}
interface AIHistoryItem{id:string;message:string;response:string;mode:string;timestamp:string;}

function getGreeting(): string { const h=new Date().getHours(); if(h<12) return "Good morning"; if(h<17) return "Good afternoon"; return "Good evening"; }
function getDomain(u:string):string { try { return new URL(u).hostname.replace("www.",""); } catch { return "Web"; } }
function isUrl(t:string):boolean { if(!t.trim()) return false; if(/^https?:\/\//i.test(t)) return true; return /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(t); }

function normalizeInput(engine: string, input: string): string {
  if (isUrl(input)) return input;
  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}

function getProxyUrl(u: string, mode: string): string {
  return `/fetch/${b64e(u)}`;
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: '1', title: 'Home', url: 'about:blank', proxyUrl: '' }]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { sender: 'ai', text: `${getGreeting()}! I'm XENA, your AI gateway. Type a URL or search query.`, timestamp: new Date().toLocaleTimeString() }
  ]);
  const [input, setInput] = useState('');
  const [aiMode, setAiMode] = useState('chill');
  const [shieldOn, setShieldOn] = useState(false);
  const [showTikTok, setShowTikTok] = useState(false);
  const [modal, setModal] = useState('');
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: true }));
  const [ping, setPing] = useState(12);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [ddgMode, setDdgMode] = useState('ddg2');
  const [newShortcut, setNewShortcut] = useState({ name: '', url: '', icon: '🔗' });
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [reportForm, setReportForm] = useState({ kind: 'bug' as const, title: '', details: '', url: '' });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const u = () => { setTime(new Date().toLocaleTimeString("en-US", { hour12: true })); setPing(Math.floor(Math.random() * 16) + 12); };
    u();
    const i = setInterval(u, 1000);
    return () => clearInterval(i);
  }, []);

  const createTab = (raw = "") => {
    const newTab: Tab = { id: `tab-${Date.now()}`, title: 'New Tab', url: raw, proxyUrl: '' };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const filtered = tabs.filter(t => t.id !== id);
    setTabs(filtered);
    if (activeTabId === id) setActiveTabId(filtered[filtered.length - 1].id);
  };

  const go = (input: string) => {
    const url = normalizeInput(DDG_OPTIONS[ddgMode]?.url || DDG_OPTIONS.ddg2.url, input);
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      activeTab.url = url;
      activeTab.proxyUrl = getProxyUrl(url, 'rv');
      setTabs([...tabs]);
      if (iframeRef.current) iframeRef.current.src = activeTab.proxyUrl;
    }
  };

  const refresh = () => {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  };

  const sendMsg = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { sender: 'user', text: input, timestamp: new Date().toLocaleTimeString() };
    setMsgs([...msgs, userMsg]);
    const aiResponse: ChatMessage = {
      sender: 'ai',
      text: aiMode === 'serious' ? 'Processing request...' : '✨ Got it!',
      timestamp: new Date().toLocaleTimeString()
    };
    setMsgs(prev => [...prev, aiResponse]);
    setInput('');
  };

  const submitReport = () => {
    if (!reportForm.title || !reportForm.details) {
      alert("Fill in title and details");
      return;
    }
    const item: Report = { id: `rep-${Date.now()}`, ...reportForm };
    const next = [item, ...reports];
    setReports(next);
    localStorage.setItem("xena_reports", JSON.stringify(next));
    setReportForm({ kind: 'bug', title: '', details: '', url: '' });
    setModal('');
  };

  const addShortcut = () => {
    if (!newShortcut.name || !newShortcut.url) return;
    let url = newShortcut.url;
    if (!url.startsWith("http")) url = "https://" + url;
    const item: Shortcut = { id: `sc-${Date.now()}`, name: newShortcut.name, url, icon: newShortcut.icon };
    const updated = [...shortcuts, item];
    setShortcuts(updated);
    localStorage.setItem("xena_shortcuts", JSON.stringify(updated));
    setNewShortcut({ name: '', url: '', icon: '🔗' });
  };

  if (showTikTok || window.location.pathname === "/tiktok")
    return <TikTokClone onBack={() => { setShowTikTok(false); window.history.pushState({}, "", "/"); }} />;

  if (window.location.pathname === "/dev-console" && devUnlocked)
    return <DevConsole onClose={() => { window.history.pushState({}, "", "/"); setDevUnlocked(false); }} reports={reports} />;

  if (window.location.pathname === "/admin-console" && adminUnlocked)
    return <AdminConsole onClose={() => { window.history.pushState({}, "", "/"); setAdminUnlocked(false); }} reports={reports} onLogout={() => { setAdminUnlocked(false); window.history.pushState({}, "", "/"); }} />;

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex flex-col text-white font-sans">
      <StarryBg />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-black/80 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">⚡ XENA</span>
          <span className="text-xs text-zinc-500">{time} • {ping}ms</span>
        </div>
        <button onClick={() => setModal("settings")} className="text-zinc-400 hover:text-white">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-black border-b border-zinc-800 overflow-x-auto">
        {tabs.map(tab => (
          <div key={tab.id} onClick={() => setActiveTabId(tab.id)} className={`group flex items-center gap-2 px-3 py-1 rounded-t-lg border cursor-pointer min-w-[100px] ${activeTabId === tab.id ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
            <Globe className="w-3 h-3 shrink-0" />
            <span className="text-xs truncate flex-1">{tab.title}</span>
            <button onClick={(e) => closeTab(tab.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button onClick={() => createTab()} className="flex items-center gap-1.5 px-2 py-1 text-zinc-500 hover:text-white">
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden p-4">
        {/* Iframe */}
        <div className="flex-1 rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950">
          {activeTab?.proxyUrl ? (
            <iframe ref={iframeRef} src={activeTab.proxyUrl} className="w-full h-full border-none" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              Enter a URL or search query
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-64 flex flex-col gap-4 overflow-y-auto">
          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && go(input)}
              placeholder="URL or search..."
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-xs text-white placeholder-zinc-600"
            />
            <button onClick={() => go(input)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold">
              Go
            </button>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col gap-2 bg-zinc-900 rounded-lg p-3 overflow-y-auto">
            {msgs.map((msg, i) => (
              <div key={i} className={`text-xs p-2 rounded ${msg.sender === 'ai' ? 'bg-zinc-800 text-zinc-100' : 'bg-blue-900 text-blue-100'}`}>
                {msg.text}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 mb-1.5 shrink-0 pl-0">
            <button onClick={() => setShieldOn(!shieldOn)} className={`flex items-center gap-1.5 px-2.5 h-7.5 rounded-md border text-[10px] font-mono font-medium ${shieldOn ? "bg-white/5 text-white border-zinc-750" : "bg-black text-zinc-500 border-zinc-850"}`}>
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AdBlock</span>
            </button>
            <button onClick={() => setModal("report")} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-red-400 hover:text-red-300" title="Bug Report">
              🐞
            </button>
            <button onClick={() => refresh()} className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-zinc-400 hover:text-white">
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold mb-4">
              {modal === "settings" ? "Settings" : modal === "report" ? "Report Bug" : ""}
            </h2>
            {modal === "report" && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Title"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm"
                />
                <textarea
                  placeholder="Details"
                  value={reportForm.details}
                  onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm"
                  rows={4}
                />
                <button onClick={submitReport} className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-bold">
                  Submit Report
                </button>
              </div>
            )}
            <button onClick={() => setModal("")} className="mt-4 w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
