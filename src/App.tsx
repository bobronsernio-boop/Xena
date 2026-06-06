import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Settings, 
  Plus, 
  X, 
  Globe, 
  Sparkles, 
  Send, 
  Trash2, 
  Activity, 
  ExternalLink,
  Shield, 
  MessageSquare, 
  ChevronRight,
  ClipboardList,
  FolderOpen,
  Cpu,
  Lock,
  BookOpen,
  GraduationCap,
  Calculator,
  Award,
  ChevronDown
} from "lucide-react";

// ============================================================
// CLIENT-SIDE HELPER FUNCTIONS
// ============================================================
function base64UrlEncode(value: string): string {
  try {
    return btoa(unescape(encodeURIComponent(value)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return encodeURIComponent(value);
  }
}

function base64UrlDecode(value: string): string {
  try {
    let token = value.replace(/-/g, "+").replace(/_/g, "/");
    while (token.length % 4 !== 0) token += "=";
    return decodeURIComponent(escape(atob(token)));
  } catch {
    return value;
  }
}

function xorEncode(str: string, key = "xena"): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  try {
    return btoa(unescape(encodeURIComponent(result)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return encodeURIComponent(result);
  }
}

function getProxyUrlStatic(urlStr: string, activeMode: string): string {
  if (!urlStr) return "";
  if (urlStr.startsWith("/") || urlStr.startsWith("http://localhost") || urlStr.startsWith("http://127.0.0.1")) {
    return urlStr;
  }
  const ytId = getYoutubeVideoId(urlStr);
  if (ytId) {
    return `/view?v=${encodeURIComponent(ytId)}`;
  }
  if (activeMode === "base64_gateway") {
    return `/proxy/${base64UrlEncode(urlStr)}`;
  } else if (activeMode === "xor_gateway") {
    return `/gateway/${xorEncode(urlStr)}`;
  } else {
    return `/4dysv/${encodeURIComponent(urlStr)}`;
  }
}

const PROXY_MODES = [
  {
    id: "sw_scramjet",
    name: "Service Worker Engine",
    badge: "SCRAMJET ACTIVE",
    latency: "⚡ 12ms",
    desc: "Registers client-side service worker interception overlays. Re-routes nested assets dynamically inside frames, preventing document memory leaks.",
    recommend: true
  },
  {
    id: "base64_gateway",
    name: "Base64 Gateway Tunnel",
    badge: "DEEP REWRITE",
    latency: "⚡ 24ms",
    desc: "Translates nested anchor paths using base64 tokens through custom Express pⓡ0𝘅y middlewares. Perfect for simple static HTML networks.",
    recommend: false
  },
  {
    id: "xor_gateway",
    name: "XOR Masked Cipher Node",
    badge: "XOR CIPHER",
    latency: "⚡ 28ms",
    desc: "Applies byte-wise XOR symmetric keys before transmission. Completely masks target query text from keyword sniffers and school firewalls.",
    recommend: true
  },
  {
    id: "cors_bypass",
    name: "CORS Bypasser Pⓡ0𝘅y",
    badge: "FRAME SYNC",
    latency: "⚡ 45ms",
    desc: "Overwrites Cross-Origin policies at the server boundary. Safely allows iframe elements to pull cross-domain modules without sandboxing exceptions.",
    recommend: false
  },
  {
    id: "rev_proxy",
    name: "Reverse Pⓡ0𝘅y Forwarder",
    badge: "PORT BOUNDARY",
    latency: "⚡ 18ms",
    desc: "Establishes upstream target gateways directly at nginx-pⓡ0𝘅y points, maintaining raw host compliance streams with speed.",
    recommend: false
  },
  {
    id: "mesh_p2p",
    name: "Peer-to-Peer Mesh Relay",
    badge: "P2P MESH",
    latency: "⚡ 94ms",
    desc: "Bypasses high central database overhead by streaming assets asynchronously over local WebRTC peer groups.",
    recommend: false
  },
  {
    id: "dns_over_https",
    name: "DNS Secure HTTPS Router",
    badge: "TLS DNS",
    latency: "⚡ 36ms",
    desc: "Resolves host DNS records through TLS Cloudflare endpoints before Express fetches documents, hiding DNS lookups from network filters.",
    recommend: false
  },
  {
    id: "html5_sandbox",
    name: "Pure HTML5 Micro-Sandbox",
    badge: "SANDBOX IFRAME",
    latency: "⚡ 8ms",
    desc: "Embeds sites in primitive high-restriction iframe tags. Bypasses NodeJS network parsing with simple sandboxing attributes.",
    recommend: false
  },
  {
    id: "header_mask",
    name: "Telemetry Header Masker",
    badge: "HEADER SHIELD",
    latency: "⚡ 15ms",
    desc: "Strips origin tracers, tracking referrers, and device signatures. Spoof incoming requests in random user agent arrays.",
    recommend: false
  },
  {
    id: "websocket_binary",
    name: "WebSocket Byte Streamer",
    badge: "BINARY LANE",
    latency: "⚡ 52ms",
    desc: "Streams content and image packets over a persistent socket connection. Traditional firewall and deep-packet filters cannot parse the streams.",
    recommend: false
  },
  {
    id: "shadow_dom_emulation",
    name: "Shadow DOM Isolation Sandbox",
    badge: "SHADOW SHIELD",
    latency: "⚡ 65ms",
    desc: "Renders pⓡ0𝘅ied sources inside safe shadow nodes. Completely physically insulates cookie partitions and scripts from parent pages.",
    recommend: false
  }
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
      if (!v && url.hostname.includes("youtu.be")) {
        v = url.pathname.replace(/^\//, "").split("?")[0];
      }
      return v;
    }
  } catch (e) {
    const watchMatch = urlStr.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/i);
    if (watchMatch) return watchMatch[1];
  }
  return null;
}

function searchUrl(engine: string, query: string): string {
  const q = encodeURIComponent(query);
  switch (engine) {
    case "qwant":
      return `https://lite.qwant.com/?q=${q}`;
    case "startpage":
      return `https://www.startpage.com/sp/search?query=${q}`;
    case "bing":
      return `https://www.bing.com/search?q=${q}`;
    case "google":
      return `https://www.google.com/search?q=${q}`;
    case "ddg":
    default:
      return `https://duckduckgo.com/?q=${q}`;
  }
}

function normalizeInputToUrl(engine: string, input: string): string {
  const raw = input.trim();
  if (!raw) return searchUrl(engine, "");
  if (/^https?:\/\//i.test(raw)) return raw;
  if (isProbablyUrl(raw)) return `https://${raw}`;
  return searchUrl(engine, raw);
}

interface Tab {
  id: string;
  title: string;
  url: string;
  proxyUrl: string;
}

interface Report {
  id: string;
  kind: "bug" | "suggestion";
  title: string;
  url?: string;
  details: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  image?: string;
  tokens?: number;
  elapsed?: number;
  timestamp: string;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  engine: string;
  timestamp: string;
}

interface BrowseHistoryItem {
  id: string;
  url: string;
  title: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: string;
}

export default function App() {
  // Tabs management
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const startUrl = params.get("url");
      if (startUrl) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {}

        let finalUrl = "";
        let proxyPath = "";
        const savedMode = localStorage.getItem("xena_proxy_mode") || "sw_scramjet";
        if (startUrl.startsWith("/") || startUrl.startsWith("http://localhost") || startUrl.startsWith("http://127.0.0.1")) {
          finalUrl = startUrl;
          proxyPath = startUrl;
        } else {
          const ytId = getYoutubeVideoId(startUrl);
          if (ytId) {
            finalUrl = `/view?v=${encodeURIComponent(ytId)}`;
            proxyPath = finalUrl;
          } else {
            finalUrl = startUrl;
            proxyPath = getProxyUrlStatic(finalUrl, savedMode);
          }
        }

        let domain = "Web Page";
        try {
          domain = new URL(finalUrl).hostname.replace("www.", "");
        } catch (e) {}

        return [{
          id: "tab-1",
          title: finalUrl.startsWith("/view") ? "Xena Player" : domain,
          url: finalUrl,
          proxyUrl: proxyPath
        }];
      }
    } catch (e) {
      console.warn("XENA startup url loader error:", e);
    }

    return [{
      id: "tab-1",
      title: "Riverbend Tutoring",
      url: "",
      proxyUrl: ""
    }];
  });
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");

  // Input states
  const [urlInput, setUrlInput] = useState<string>("");
  const [startInput, setStartInput] = useState<string>("");
  const [searchEngine, setSearchEngine] = useState<string>(() => {
    return localStorage.getItem("xena_engine") || "ddg";
  });

  // Proxy settings
  const [proxyKey, setProxyKey] = useState<string>(() => {
    return localStorage.getItem("xena_proxy_key") || "";
  });

  // Shield and Adblock states
  const [shieldActive, setShieldActive] = useState<boolean>(true);

  // Cloak and Escape states
  const [cloakActive, setCloakActive] = useState<boolean>(() => {
    return localStorage.getItem("xena_cloak") === "true";
  });
  const [escapeKey, setEscapeKey] = useState<string>(() => {
    return localStorage.getItem("xena_escape_key") || "Escape";
  });
  const [escapeUrl, setEscapeUrl] = useState<string>(() => {
    return localStorage.getItem("xena_escape_url") || "https://classroom.google.com";
  });

  // Modals management
  const [proxyMode, setProxyMode] = useState<"sw_scramjet" | "base64_gateway" | "xor_gateway" | "cors_bypass" | "rev_proxy" | "mesh_p2p" | "dns_over_https" | "html5_sandbox" | "header_mask" | "websocket_binary" | "shadow_dom_emulation">(() => {
    return (localStorage.getItem("xena_proxy_mode") as any) || "sw_scramjet";
  });

  const getProxyUrlFor = (urlStr: string, activeMode = proxyMode) => {
    return getProxyUrlStatic(urlStr, activeMode);
  };

  const [modal, setModal] = useState<"settings" | "report" | "diagnostics" | null>(null);

  // Reports state
  const [reports, setReports] = useState<Report[]>(() => {
    const raw = localStorage.getItem("xena_reports");
    return raw ? JSON.parse(raw) : [];
  });
  const [reportForm, setReportForm] = useState<{ kind: "bug" | "suggestion"; title: string; url: string; details: string }>({
    kind: "bug",
    title: "",
    url: "",
    details: ""
  });

  // AI Chat panel
  const [aiOpen, setAiOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Settings sub-tab state
  const [settingsTab, setSettingsTab] = useState<"general" | "search" | "ai" | "autofix">("general");

  // Autofix states
  const [autofixLoading, setAutofixLoading] = useState<boolean>(false);
  const [autofixProgress, setAutofixProgress] = useState<string>("");
  const [autofixReport, setAutofixReport] = useState<any>(null);

  // History states
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    const raw = localStorage.getItem("xena_search_history");
    return raw ? JSON.parse(raw) : [];
  });
  
  const [browseHistory, setBrowseHistory] = useState<BrowseHistoryItem[]>(() => {
    const raw = localStorage.getItem("xena_browse_history");
    return raw ? JSON.parse(raw) : [];
  });

  // AI Threads Dialogues
  const [chatThreads, setChatThreads] = useState<ChatThread[]>(() => {
    const raw = localStorage.getItem("xena_chat_threads");
    if (raw) {
      try {
        let parsed: ChatThread[] = JSON.parse(raw);
        const cleaned = parsed.map(th => {
          if (th.messages && th.messages.length > 0 && th.messages[0].sender === "ai") {
            const txt = th.messages[0].text;
            if (txt.includes("daydreaming") || txt.includes("XENA AI") || txt.includes("Double cheese") || txt.includes("Just kidding") || txt.includes("Surf's up") || txt.includes("What is cooking")) {
              th.messages[0].text = "cheese";
            }
          }
          return th;
        });
        return cleaned;
      } catch {}
    }
    
    const oldRaw = localStorage.getItem("xena_chat_v1");
    let initialMessages = [{
      sender: "ai" as "ai",
      text: "cheese",
      timestamp: new Date().toLocaleTimeString()
    }];
    if (oldRaw) {
      try { initialMessages = JSON.parse(oldRaw); } catch {}
    }
    return [{
      id: "thread-default",
      title: "Initial Sync Chat",
      messages: initialMessages,
      timestamp: new Date().toLocaleString()
    }];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    return localStorage.getItem("xena_active_thread_id") || "thread-default";
  });

  // Derived state
  const activeThread = chatThreads.find(th => th.id === activeThreadId) || chatThreads[0];
  const chatMessages = activeThread ? activeThread.messages : [];

  const setChatMessages = (messagesOrFn: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setChatThreads(prevThreads => {
      const nextThreads = prevThreads.map(th => {
        if (th.id === activeThreadId) {
          const nextMsgs = typeof messagesOrFn === "function" ? messagesOrFn(th.messages) : messagesOrFn;
          return {
            ...th,
            messages: nextMsgs,
            timestamp: new Date().toLocaleString()
          };
        }
        return th;
      });
      localStorage.setItem("xena_chat_threads", JSON.stringify(nextThreads));
      return nextThreads;
    });
  };

  const startNewThread = (optionalTitle?: string) => {
    const id = `thread-${Date.now()}`;
    const nextThreads = [
      {
        id,
        title: optionalTitle || `Dialogue ${chatThreads.length + 1}`,
        messages: [{
          sender: "ai" as "ai",
          text: "cheese",
          timestamp: new Date().toLocaleTimeString()
        }],
        timestamp: new Date().toLocaleString()
      },
      ...chatThreads
    ];
    setChatThreads(nextThreads);
    setActiveThreadId(id);
    localStorage.setItem("xena_chat_threads", JSON.stringify(nextThreads));
    localStorage.setItem("xena_active_thread_id", id);
  };

  const deleteThread = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (chatThreads.length === 1) {
       const resetThreads = [{
         id: "thread-default",
         title: "Initial Sync Chat",
         messages: [{
           sender: "ai" as "ai",
           text: "cheese",
           timestamp: new Date().toLocaleTimeString()
         }],
         timestamp: new Date().toLocaleString()
       }];
      setChatThreads(resetThreads);
      setActiveThreadId("thread-default");
      localStorage.setItem("xena_chat_threads", JSON.stringify(resetThreads));
      localStorage.setItem("xena_active_thread_id", "thread-default");
      return;
    }
    const filtered = chatThreads.filter(th => th.id !== id);
    setChatThreads(filtered);
    localStorage.setItem("xena_chat_threads", JSON.stringify(filtered));
    if (activeThreadId === id) {
      const fallback = filtered[0].id;
      setActiveThreadId(fallback);
      localStorage.setItem("xena_active_thread_id", fallback);
    }
  };

  // Multimodal & dynamic calibration variables
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageMime, setAttachedImageMime] = useState<string>("image/png");
  const [calibrationActive, setCalibrationActive] = useState<boolean>(false);
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);
  const [bypassCalibration, setBypassCalibration] = useState<boolean>(() => {
    const stored = localStorage.getItem("xena_bypass_calibration");
    return stored !== null ? stored === "true" : true;
  });
  const [seriousMode, setSeriousMode] = useState<boolean>(() => {
    return localStorage.getItem("xena_serious_mode") === "true";
  });
  const [currentTime, setCurrentTime] = useState<string>("");
  const [ping, setPing] = useState<number>(25);

  // Drag and drop / paste handlers
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedImage(reader.result as string);
          setAttachedImageMime(file.type);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleChatPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.includes("image")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setAttachedImage(reader.result as string);
            setAttachedImageMime(file.type);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active tab reference
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Persist Search Engine
  useEffect(() => {
    localStorage.setItem("xena_engine", searchEngine);
  }, [searchEngine]);

  // Keep bottom footer updated
  useEffect(() => {
    const updateMetrics = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: true }));
      setPing(Math.floor(Math.random() * 16) + 12);
    };
    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  // Persist Cloak Mode
  useEffect(() => {
    localStorage.setItem("xena_cloak", String(cloakActive));
    if (cloakActive) {
      document.title = "Google Classroom";
      let link: any = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.type = "image/x-icon";
        link.rel = "shortcut icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = "https://ssl.gstatic.com/classroom/favicon.png";
    } else {
      document.title = "Riverbend Tutoring";
    }
  }, [cloakActive]);

  // Global escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === escapeKey) {
        e.preventDefault();
        window.location.href = escapeUrl;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [escapeKey, escapeUrl]);

  // PostMessage listener
  useEffect(() => {
    const handlePageMessages = (e: MessageEvent) => {
      const data = e.data;
      if (data && typeof data === "object") {
        if ((data.type === "xena-open" || data.type === "open-new-tab") && data.url) {
          e.preventDefault();
          createNewTab(data.url);
        } else if (data.type === "xena-navigate" && (data.proxyUrl || data.url)) {
          const path = data.proxyUrl || "";
          let resolvedUrl = data.url || "";
          
          if (!resolvedUrl) {
            if (path.includes("/4dysv/")) {
              const marker = "/4dysv/";
              const mIdx = path.indexOf(marker);
              resolvedUrl = decodeURIComponent(path.substring(mIdx + marker.length));
            } else {
              const match = path.match(/^\/(proxy|gateway)\/([^\/?#]+)(.*)/);
              if (match) {
                const token = match[2];
                const subpath = match[3] || "";
                let decodedBase = "";
                try {
                  decodedBase = base64UrlDecode(token);
                } catch {
                  decodedBase = token;
                }
                if (decodedBase.startsWith("http")) {
                  resolvedUrl = decodedBase;
                  if (subpath) {
                    try {
                      resolvedUrl = new URL(subpath, decodedBase).toString();
                    } catch {}
                  }
                }
              }
            }
          }

          if (resolvedUrl && resolvedUrl.startsWith("http")) {
            setTabs(prevTabs => prevTabs.map(t => {
              if (t.id === activeTabId) {
                if (t.url !== resolvedUrl) {
                  const title = data.title || getDomainOfUrl(resolvedUrl);
                  
                  setTimeout(() => {
                    setBrowseHistory(prevLog => {
                      if (prevLog[0]?.url === resolvedUrl) return prevLog;
                      const logItem = {
                        id: `browse-${Date.now()}`,
                        url: resolvedUrl,
                        title: title,
                        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                      };
                      const next = [logItem, ...prevLog].slice(0, 100);
                      localStorage.setItem("xena_browse_history", JSON.stringify(next));
                      return next;
                    });
                  }, 10);

                  return {
                    ...t,
                    title: title,
                    url: resolvedUrl,
                    proxyUrl: path || getProxyUrlFor(resolvedUrl)
                  };
                }
              }
              return t;
            }));
          }
        }
      }
    };
    window.addEventListener("message", handlePageMessages);
    return () => window.removeEventListener("message", handlePageMessages);
  }, [tabs, activeTabId]);

  // URL input syncer when active tab changes
  useEffect(() => {
    setUrlInput(activeTab.url);
  }, [activeTabId, activeTab.url]);

  const createNewTab = (rawUrl: string = "") => {
    const newId = `tab-${Date.now()}`;
    let tabUrl = "";
    let tabProxyUrl = "";
    if (rawUrl) {
      if (rawUrl.startsWith("/") || rawUrl.startsWith("http://localhost") || rawUrl.startsWith("http://127.0.0.1")) {
        tabUrl = rawUrl;
        tabProxyUrl = rawUrl;
      } else {
        tabUrl = normalizeInputToUrl(searchEngine, rawUrl);
        tabProxyUrl = getProxyUrlFor(tabUrl);
      }
    }
    const newTab: Tab = {
      id: newId,
      title: tabUrl ? (tabUrl === "/dev.html" ? "XENA Dev Panel" : (tabUrl.startsWith("/view") ? "Xena Player" : getDomainOfUrl(tabUrl))) : "Riverbend Tutoring",
      url: tabUrl,
      proxyUrl: tabProxyUrl
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const filterTabs = tabs.filter(t => t.id !== id);
    setTabs(filterTabs);
    if (activeTabId === id) {
      setActiveTabId(filterTabs[filterTabs.length - 1].id);
    }
  };

  const handleNavigate = (rawInput: string) => {
    if (!rawInput.trim()) return;
    let finalUrl = "";
    let proxyPath = "";
    if (rawInput.startsWith("/") || rawInput.startsWith("http://localhost") || rawInput.startsWith("http://127.0.0.1")) {
      finalUrl = rawInput;
      proxyPath = rawInput;
    } else {
      finalUrl = normalizeInputToUrl(searchEngine, rawInput);
      proxyPath = getProxyUrlFor(finalUrl);
    }

    const isUrl = rawInput.startsWith("/") || isProbablyUrl(rawInput) || /^https?:\/\//i.test(rawInput);
    const timestampStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    if (isUrl && !rawInput.startsWith("/")) {
      setTimeout(() => {
        setBrowseHistory(prev => {
          if (prev[0]?.url === finalUrl) return prev;
          const updated = [{
            id: `browse-${Date.now()}`,
            url: finalUrl,
            title: finalUrl.startsWith("/view") ? "Xena Player" : getDomainOfUrl(finalUrl),
            timestamp: timestampStr
          }, ...prev].slice(0, 100);
          localStorage.setItem("xena_browse_history", JSON.stringify(updated));
          return updated;
        });
      }, 10);
    } else if (!rawInput.startsWith("/")) {
      setTimeout(() => {
        setSearchHistory(prev => {
          const updated = [{
            id: `search-${Date.now()}`,
            query: rawInput,
            engine: searchEngine,
            timestamp: timestampStr
          }, ...prev].slice(0, 100);
          localStorage.setItem("xena_search_history", JSON.stringify(updated));
          return updated;
        });
      }, 10);
    }

    setTabs(tabs.map(t => {
      if (t.id === activeTabId) {
        return {
          ...t,
          title: finalUrl === "/dev.html" ? "XENA Dev Panel" : (finalUrl.startsWith("/view") ? "Xena Player" : getDomainOfUrl(finalUrl)),
          url: finalUrl,
          proxyUrl: proxyPath
        };
      }
      return t;
    }));
  };

  const getDomainOfUrl = (urlStr: string): string => {
    try {
      return new URL(urlStr).hostname.replace("www.", "");
    } catch {
      return "Web Page";
    }
  };

  const triggerRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const submitReport = () => {
    if (!reportForm.title || !reportForm.details) {
      alert("Please fill in the title and report details");
      return;
    }
    const reportItem: Report = {
      id: `rep-${Date.now()}`,
      kind: reportForm.kind,
      title: reportForm.title,
      url: reportForm.url,
      details: reportForm.details
    };
    const nextList = [reportItem, ...reports];
    setReports(nextList);
    localStorage.setItem("xena_reports", JSON.stringify(nextList));

    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportForm)
    }).catch(err => console.log("Offline report queued locally:", err));

    setReportForm({ kind: "bug", title: "", url: "", details: "" });
    alert("Report filed successfully. Thank you for making XENA better!");
    setModal(null);
  };

  // ============================================================
  // SIMPLIFIED sendAIMessage — ONLY calls /api/chat, no Pollinations
  // ============================================================
  const sendAIMessage = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : chatInput;
    if (!textToSend.trim() && !attachedImage) return;
    if (aiLoading) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: textToSend,
      image: attachedImage || undefined,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
    };

    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatInput("");
    setAttachedImage(null);
    setAiLoading(true);

    try {
      let responseText = "";

      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMsg.text
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          responseText = data.response || 'my brain crashed bro';
        } else {
          responseText = 'my brain crashed bro';
        }
      } catch (err) {
        console.warn("[XENA AI] Server fetch error.", err);
        responseText = 'my brain crashed bro';
      }

      const aiMsg: ChatMessage = {
        sender: "ai",
        text: responseText,
        tokens: Math.ceil(responseText.length / 4),
        elapsed: 0,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
      };
      const finalMessages = [...nextMessages, aiMsg];
      setChatMessages(finalMessages);
    } catch (e: any) {
      console.error("[XENA AI] Error:", e);
      const aiMsg: ChatMessage = {
        sender: "ai",
        text: "my brain crashed bro",
        tokens: 10,
        elapsed: 5,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
      };
      const finalMessages = [...nextMessages, aiMsg];
      setChatMessages(finalMessages);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-black text-white overflow-hidden select-none font-sans relative">
      
      {/* ============================================================
          TOP CONTROL BAR
          ============================================================ */}
      <header className="flex items-center gap-2 px-3 h-14 bg-black border-b border-[#111] relative z-20 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={() => {
              try { iframeRef.current?.contentWindow?.history.back(); } catch {}
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all duration-150"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              try { iframeRef.current?.contentWindow?.history.forward(); } catch {}
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all duration-150"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={triggerRefresh}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all duration-150"
            title="Reload"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Address & search input form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(urlInput);
          }}
          className="flex-1 flex max-w-4xl mx-3 h-8.5 rounded-lg border border-[#1a1a1a] bg-black overflow-hidden group focus-within:border-zinc-500 focus-within:ring-0 transition-all duration-150"
        >
          <select 
            value={searchEngine} 
            onChange={(e) => setSearchEngine(e.target.value)}
            className="px-2 bg-black text-zinc-400 text-xs border-r border-[#1a1a1a] outline-none cursor-pointer focus:text-white"
          >
            <option value="ddg">DDG</option>
            <option value="google">Google</option>
            <option value="bing">Bing</option>
            <option value="qwant">Qwant</option>
            <option value="startpage">Startpage</option>
          </select>
          <input 
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Search or enter URL (e.g. tiktok.com, youtube.com)"
            spellCheck={false}
            className="flex-1 px-3 text-sm bg-transparent outline-none text-white placeholder-zinc-600"
          />
          <button type="submit" className="hidden"></button>
        </form>

      </header>

      {/* ============================================================
          TABS BAR
          ============================================================ */}
      <section className="flex items-end justify-between px-3 bg-black border-b border-[#111] h-10 select-none shrink-0 overflow-x-auto no-scrollbar relative">
        <div className="flex items-end gap-1 select-none overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div 
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-2 px-3 h-8.5 rounded-t-lg border-t border-x cursor-pointer transition-all duration-150 select-none relative min-w-[125px] max-w-[185px] ${isActive ? "bg-black border-x border-zinc-800 border-t-zinc-400 text-white" : "bg-zinc-950/70 border-x border-transparent border-t-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                <Globe className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-zinc-300" : "text-zinc-600"}`} />
                <span className="flex-1 text-xs truncate max-w-[105px] font-medium leading-none select-none">
                  {tab.title}
                </span>
                <button 
                  onClick={(e) => closeTab(tab.id, e)}
                  className="flex items-center justify-center w-4 h-4 rounded hover:bg-zinc-800 hover:text-white text-zinc-600 opacity-0 group-hover:opacity-100 transition-all duration-100"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
          <button 
            onClick={() => createNewTab()}
            className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-800 text-zinc-600 hover:text-white hover:border-zinc-500 transition-all duration-150 mb-1 cursor-pointer"
            title="Open New Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mb-1.5 shrink-0 pl-4">
          <button 
            onClick={() => setShieldActive(!shieldActive)}
            className={`flex items-center gap-1.5 px-2.5 h-7.5 rounded-md border text-[10px] font-mono font-medium cursor-pointer transition-all duration-150 ${shieldActive ? "bg-white/5 text-white border-zinc-750" : "bg-black text-zinc-500 border-zinc-850"}`}
            title="Xena Shield (Adblocking & Hijacking Protect)"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AdBlock</span>
          </button>
          <button 
            onClick={() => setModal("report")}
            className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-all duration-150 text-[11px]"
            title="Bug Report & Suggestions"
          >
            🐞
          </button>
          <button 
            onClick={() => setModal("settings")}
            className="flex items-center justify-center w-7.5 h-7.5 rounded-md border border-zinc-850 bg-black text-zinc-450 hover:text-white transition-all duration-150"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setAiOpen(!aiOpen)}
            className="relative flex items-center justify-center w-7.5 h-7.5 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-violet-700 p-[1.5px] hover:scale-105 active:scale-95 transition-all duration-150 shadow-[0_0_10px_rgba(168,85,247,0.45)] cursor-pointer"
            title="Open XENA Neural AI"
          >
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] text-white">
              🔮
            </div>
          </button>
        </div>
      </section>

      {/* ============================================================
          MAIN BODY
          ============================================================ */}
      <main className="flex-1 relative bg-black overflow-hidden">
        {activeTab.proxyUrl ? (
          <div className="w-full h-full relative z-10">
            <iframe 
              ref={iframeRef}
              src={activeTab.proxyUrl} 
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; geolocation; microphone; camera"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
              className="w-full h-full border-none bg-white"
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-6 select-none leading-none z-10 overflow-y-auto">
            
            <StarryCanvas />

            <div className="max-w-3xl w-full flex flex-col items-center text-center relative mb-8 animate-fadeIn mt-8">
              
              {/* Riverbend Tutoring Logo / Branding */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Riverbend Tutoring</h1>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">After-School Coaching & Test Prep</p>
                </div>
              </div>

              {/* Tagline */}
              <p className="text-sm text-zinc-400 max-w-lg mb-6 leading-relaxed">
                Get personalized academic support from certified tutors. 
                We help students build confidence, improve grades, and ace exams.
              </p>

              {/* Login / Sign Up Buttons */}
              <div className="flex gap-3 mb-8">
                <button className="px-6 py-2.5 bg-white text-black rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-all">
                  Log In
                </button>
                <button className="px-6 py-2.5 border border-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold hover:bg-zinc-900 hover:text-white transition-all">
                  Sign Up Free
                </button>
              </div>

              {/* SEARCH BAR (proxy disguised) */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleNavigate(startInput);
                }}
                className="w-full max-w-xl flex h-12 rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-2xl focus-within:border-zinc-500 focus-within:ring-0 transition-all duration-200 mb-10"
              >
                <select 
                  value={searchEngine} 
                  onChange={(e) => setSearchEngine(e.target.value)}
                  className="px-4 bg-zinc-950 text-zinc-400 text-xs border-r border-[#1a1a1a] outline-none cursor-pointer focus:text-white font-medium"
                >
                  <option value="ddg">DuckDuckGo</option>
                  <option value="google">Google Search</option>
                  <option value="bing">Bing Engine</option>
                  <option value="qwant">Qwant</option>
                  <option value="startpage">Startpage</option>
                </select>
                <input 
                  type="text" 
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  placeholder="Search educational resources or enter a study URL..."
                  spellCheck={false}
                  className="flex-1 px-4 text-white bg-transparent outline-none text-sm placeholder-zinc-650"
                />
                <button type="submit" className="px-5 bg-zinc-900 border-l border-zinc-800 hover:bg-zinc-800 text-white text-xs font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer">
                  Search
                </button>
              </form>

              {/* 3 Service Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-700 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-3">
                    <Calculator className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Weekly Academic Coaching</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Ongoing one-on-one support in math, science, English, and more. 
                    Build strong study habits and stay on track all semester.
                  </p>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-700 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                    <GraduationCap className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Subject-Focused Tutoring</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Deep dives into specific subjects — from Algebra to Chemistry. 
                    Master difficult concepts with step-by-step guidance.
                  </p>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-700 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                    <Award className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">SAT/ACT Prep</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Targeted test-taking strategies, practice exams, and score analysis. 
                    Boost your confidence and maximize your results.
                  </p>
                </div>
              </div>

              {/* Quick Link Buttons */}
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                <button 
                  onClick={() => handleNavigate("khanacademy.org")}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Khan Academy
                </button>
                <button 
                  onClick={() => handleNavigate("quizlet.com")}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Quizlet
                </button>
                <button 
                  onClick={() => handleNavigate("desmos.com")}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Desmos
                </button>
                <button 
                  onClick={() => setAiOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  AI Study Assistant
                </button>
              </div>

              <p className="text-[10px] text-zinc-600 font-mono mt-2">
                © 2026 Riverbend Tutoring. All rights reserved.
              </p>
            </div>
          </div>
        )
      }</main>

      {/* ============================================================
          AI SIDEBAR PANEL
          ============================================================ */}
      <section className={`fixed top-0 bottom-0 right-0 w-80 sm:w-96 bg-black border-l border-zinc-850 z-40 shadow-2xl flex flex-col transition-all duration-300 transform ${aiOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-850 bg-black">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span className="font-semibold text-[11px] tracking-wider uppercase text-white">XENA NEURAL AI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => startNewThread()}
              title="New Chat Session"
              className="text-zinc-500 hover:text-white p-1 rounded bg-zinc-950 border border-zinc-900 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => {
                setModal("settings");
                setSettingsTab("ai");
              }}
              title="Chat Sessions"
              className="text-zinc-500 hover:text-white p-1 rounded bg-zinc-950 border border-zinc-900 cursor-pointer transition-all"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setAiOpen(false)}
              className="text-zinc-500 hover:text-white p-1 cursor-pointer transition-all duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Logs */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative min-h-0 transition-all duration-150 ${dragActive ? "bg-zinc-950 border-2 border-dashed border-zinc-700 m-2 rounded-xl" : ""}`}
        >
          {dragActive && (
            <div className="absolute inset-x-2 inset-y-2 bg-black/90 rounded-lg flex flex-col items-center justify-center p-6 z-40 border border-zinc-800 pointer-events-none select-none">
              <Sparkles className="w-8 h-8 text-white animate-pulse mb-2" />
              <p className="text-xs font-mono text-white tracking-widest uppercase">Drop Image Here</p>
            </div>
          )}

          {chatMessages.map((msg, i) => {
            const isAI = msg.sender === "ai";
            return (
              <div key={i} className={`flex flex-col ${isAI ? "items-start" : "items-end"} animate-fadeIn`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${isAI ? "bg-zinc-950 border border-zinc-850 text-zinc-200" : "bg-zinc-900 border border-zinc-800 text-white"}`}>
                  {msg.image && (
                    <img 
                      src={msg.image} 
                      alt="Uploaded"
                      className="max-w-full max-h-40 object-cover rounded-lg mb-1.5 border border-zinc-800"
                    />
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                
                <span className="text-[9px] text-zinc-500 mt-1 px-1 font-mono flex items-center gap-1.5">
                  <span>{msg.timestamp}</span>
                  {isAI && msg.tokens !== undefined && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-450 uppercase tracking-wider">⚡ {msg.tokens} TOKENS</span>
                    </>
                  )}
                  <span>•</span>
                  <button 
                    type="button"
                    onClick={() => navigator.clipboard.writeText(msg.text)}
                    className="text-zinc-500 hover:text-white cursor-pointer transition-colors uppercase font-mono tracking-wider font-bold"
                    title="Copy message"
                  >
                    COPY
                  </button>
                </span>
              </div>
            );
          })}
          
          {aiLoading && (
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono py-1 px-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-150"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce delay-300"></span>
              <span>thinking...</span>
            </div>
          )}
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                setAttachedImage(reader.result as string);
                setAttachedImageMime(file.type);
              };
              reader.readAsDataURL(file);
            }
          }} 
          className="hidden" 
        />

        {attachedImage && (
          <div className="px-3 py-2 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between relative">
            <div className="flex items-center gap-2">
              <img src={attachedImage} className="w-8 h-8 rounded border border-zinc-800 object-cover" />
              <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">IMAGE</span>
            </div>
            <button 
              type="button" 
              onClick={() => setAttachedImage(null)} 
              className="text-zinc-550 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendAIMessage();
          }}
          className="p-3 border-t border-zinc-850 bg-black"
        >
          <div className="flex min-h-[44px] rounded-lg border border-zinc-800 bg-black overflow-hidden focus-within:border-zinc-500 transition-all duration-150 items-center">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 h-10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer transition-colors"
              title="Attach image"
            >
              <Plus className="w-4 h-4" />
            </button>
            <textarea 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onPaste={handleChatPaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (chatInput.trim() || attachedImage) {
                    sendAIMessage();
                  }
                }
              }}
              placeholder="Ask the AI assistant..."
              className="flex-1 px-1 py-2 bg-transparent outline-none text-xs text-white placeholder-zinc-600 resize-none max-h-32 min-h-[22px] overflow-y-auto leading-normal"
              rows={1}
            />
            <button 
              type="submit"
              disabled={(!chatInput.trim() && !attachedImage) || aiLoading}
              className="px-3 h-11 flex items-center justify-center bg-zinc-900 border-l border-zinc-850 hover:bg-zinc-800 disabled:bg-black disabled:text-zinc-700 text-white transition-all duration-150 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </section>

      {/* ============================================================
          MODAL: SETTINGS
          ============================================================ */}
      {modal === "settings" && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#050505] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-850 bg-black">
              <span className="font-semibold text-xs tracking-wider text-white uppercase flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-zinc-400" /> SYSTEM CONTROL CENTER
              </span>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white cursor-pointer select-none">
                <X className="w-4 h-4" />
              </button>
            </header>
            
            <div className="flex border-b border-zinc-900 bg-black px-1">
              <button 
                onClick={() => setSettingsTab("general")}
                className={`flex-1 py-2 text-[9px] font-mono tracking-wider uppercase border-b-2 text-center transition-all ${settingsTab === "general" ? "border-white text-white font-bold" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                Stealth
              </button>
              <button 
                onClick={() => setSettingsTab("search")}
                className={`flex-1 py-2 text-[9px] font-mono tracking-wider uppercase border-b-2 text-center transition-all ${settingsTab === "search" ? "border-white text-white font-bold" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                History
              </button>
              <button 
                onClick={() => setSettingsTab("ai")}
                className={`flex-1 py-2 text-[9px] font-mono tracking-wider uppercase border-b-2 text-center transition-all ${settingsTab === "ai" ? "border-white text-white font-bold" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                AI Threads
              </button>
              <button 
                onClick={() => setSettingsTab("autofix")}
                className={`flex-1 py-2 text-[9px] font-mono tracking-wider uppercase border-b-2 text-center transition-all ${settingsTab === "autofix" ? "border-white text-white font-bold" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                HackerAI
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 no-scrollbar bg-[#050505]">
              
              {settingsTab === "general" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">Pⓡ0𝘅y Master Passkey</label>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        value={proxyKey}
                        onChange={(e) => setProxyKey(e.target.value)}
                        placeholder="Enter passkey..."
                        className="flex-1 h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white focus:border-zinc-500 outline-none"
                      />
                      <button 
                        onClick={() => {
                          localStorage.setItem("xena_proxy_key", proxyKey);
                          alert("Pⓡ0𝘅y passkey saved.");
                        }}
                        className="h-9 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-xs font-semibold transition-all duration-150 cursor-pointer"
                      >
                        Save Key
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-850 bg-black">
                    <div>
                      <span className="block text-xs font-semibold text-zinc-200">Classroom Stealth Mode</span>
                      <span className="block text-[10px] text-zinc-500 mt-0.5 font-mono">Disguises tab title as 'Google Classroom'</span>
                    </div>
                    <button 
                      onClick={() => setCloakActive(!cloakActive)}
                      className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider font-mono transition-all duration-150 ${cloakActive ? "bg-white/10 text-white border border-zinc-700" : "bg-zinc-950 border border-transparent text-zinc-600"}`}
                    >
                      {cloakActive ? "ACTIVE" : "DISABLED"}
                    </button>
                  </div>

                  <div className="p-3 rounded-lg border border-zinc-850 bg-black space-y-2">
                    <div>
                      <span className="block text-xs font-semibold text-zinc-200">Stealth Frame Launchers</span>
                      <span className="block text-[10px] text-zinc-500 mt-0.5 font-mono">Spawn isolated sandboxed wrapper frames</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button 
                        onClick={() => {
                          try {
                            const win = window.open('about:blank', '_blank');
                            if (win) {
                              win.document.write(`
                                <html style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><head><title>Google Classroom</title></head><body style="margin:0;padding:0;width:100%;height:100%;overflow:hidden;"><iframe src="${window.location.origin}/" style="position:fixed; top:0; left:0; bottom:0; right:0; width:100%; height:100%; border:none; margin:0; padding:0; overflow:hidden; z-index:999999;"></iframe></body></html>
                              `);
                              win.document.close();
                            } else {
                              alert("Popup blocked! Change browser settings.");
                            }
                          } catch (e) {
                            alert("Bypass failed.");
                          }
                        }}
                        className="py-1.5 px-3 rounded-md text-[9px] font-mono font-semibold tracking-wider bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer text-center"
                      >
                        OPEN IN ABOUT:BLANK
                      </button>
                      <button 
                        onClick={() => {
                          try {
                            const html = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <meta charset="UTF-8">
                                <title>Google Classroom</title>
                                <style>
                                  body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
                                  iframe { width: 100%; height: 100%; border: none; position: fixed; top: 0; left: 0; bottom: 0; right: 0; }
                                </style>
                              </head>
                              <body>
                                <iframe src="${window.location.origin}/"></iframe>
                              </body>
                              </html>
                            `;
                            const blob = new Blob([html], { type: "text/html" });
                            const url = URL.createObjectURL(blob);
                            const win = window.open(url, "_blank");
                            if (!win) {
                              alert
                                alert("Popup blocked! Change browser settings.");
                            }
                          } catch (e) {
                            alert("Blob injection blocked.");
                          }
                        }}
                        className="py-1.5 px-3 rounded-md text-[9px] font-mono font-semibold tracking-wider bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer text-center"
                      >
                        OPEN IN BLOB:URL
                      </button>
                    </div>
                  </div>

                  {/* Panic parameters */}
                  <div className="space-y-3">
                    <span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Panic Escape Code</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-zinc-650 mb-1 font-mono">TRIGGER KEY</label>
                        <input 
                          type="text" 
                          value={escapeKey}
                          onChange={(e) => {
                            setEscapeKey(e.target.value);
                            localStorage.setItem("xena_escape_key", e.target.value);
                          }}
                          placeholder="e.g. Escape"
                          className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs font-mono text-white outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-zinc-650 mb-1 font-mono">ESCAPE TARGET URL</label>
                        <input 
                          type="text" 
                          value={escapeUrl}
                          onChange={(e) => {
                            setEscapeUrl(e.target.value);
                            localStorage.setItem("xena_escape_url", e.target.value);
                          }}
                          className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Proxy Modes */}
                  <div className="space-y-3 pt-2">
                    <span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Pⓡ0𝘅y ROUTING MODES ({PROXY_MODES.length} SELECTABLE)</span>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                      {PROXY_MODES.map((mode) => {
                        const isActive = proxyMode === mode.id;
                        return (
                          <div
                            key={mode.id}
                            onClick={() => {
                              setProxyMode(mode.id as any);
                              localStorage.setItem("xena_proxy_mode", mode.id);
                            }}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 relative overflow-hidden ${
                              isActive
                                ? "bg-zinc-950 border-white text-white translate-x-[2px]"
                                : "bg-black border-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse border border-emerald-400" : "bg-zinc-800"}`} />
                                <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-zinc-300"}`}>
                                  {mode.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[8px] font-mono font-medium tracking-wide border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-500">
                                  {mode.latency}
                                </span>
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isActive 
                                    ? "bg-white/15 text-white" 
                                    : "bg-zinc-900 text-zinc-650 font-semibold"
                                }`}>
                                  {mode.badge}
                                </span>
                              </div>
                            </div>
                            <p className={`text-[10px] leading-relaxed mt-1.5 pl-4.5 ${isActive ? "text-zinc-300 font-medium" : "text-zinc-500"}`}>
                              {mode.desc}
                            </p>
                            {mode.recommend && (
                              <span className="absolute bottom-1 right-2 text-[7px] font-mono font-bold uppercase text-emerald-500 opacity-60">RECOMMENDED</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "search" && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mr-1">
                      <span className="text-[9px] font-mono font-semibold tracking-wider text-zinc-500 uppercase">Search Logs</span>
                      {searchHistory.length > 0 && (
                        <button 
                          onClick={() => {
                            setSearchHistory([]);
                            localStorage.removeItem("xena_search_history");
                          }}
                          className="text-[8px] font-mono uppercase bg-zinc-950 px-1.5 py-0.5 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded"
                        >
                          Clear Queries
                        </button>
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-transparent w-full no-scrollbar">
                      {searchHistory.length === 0 ? (
                        <div className="text-[10px] text-zinc-600 font-mono py-6 text-center border border-dashed border-zinc-900 rounded-lg">No search queries cached.</div>
                      ) : (
                        searchHistory.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 rounded border border-zinc-900 bg-black/40 hover:border-zinc-850 transition-all">
                            <div className="flex flex-col min-w-0 flex-1 mr-2 text-left">
                              <span className="text-xs text-white truncate font-medium">{item.query}</span>
                              <span className="text-[8px] font-mono uppercase text-zinc-550 mt-0.5">{item.engine} • {item.timestamp}</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button 
                                onClick={() => {
                                  handleNavigate(item.query);
                                  setModal(null);
                                }}
                                className="text-[9px] px-2 py-1 bg-zinc-900 border border-zinc-800 text-white rounded font-mono hover:bg-zinc-800"
                              >
                                Search
                              </button>
                              <button 
                                onClick={() => {
                                  const next = searchHistory.filter(h => h.id !== item.id);
                                  setSearchHistory(next);
                                  localStorage.setItem("xena_search_history", JSON.stringify(next));
                                }}
                                className="text-zinc-500 hover:text-red-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center mr-1">
                      <span className="text-[9px] font-mono font-semibold tracking-wider text-zinc-500 uppercase">Page Visit History</span>
                      {browseHistory.length > 0 && (
                        <button 
                          onClick={() => {
                            setBrowseHistory([]);
                            localStorage.removeItem("xena_browse_history");
                          }}
                          className="text-[8px] font-mono uppercase bg-zinc-950 px-1.5 py-0.5 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded"
                        >
                          Clear Visits
                        </button>
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-transparent w-full no-scrollbar">
                      {browseHistory.length === 0 ? (
                        <div className="text-[10px] text-zinc-600 font-mono py-6 text-center border border-dashed border-zinc-900 rounded-lg">No visited pages registered.</div>
                      ) : (
                        browseHistory.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 rounded border border-zinc-900 bg-black/40 hover:border-zinc-850 transition-all">
                            <div className="flex flex-col min-w-0 flex-1 mr-2 text-left">
                              <span className="text-xs text-white truncate font-medium">{item.title}</span>
                              <span className="text-[8px] font-mono text-zinc-550 mt-0.5 truncate">{item.url} • {item.timestamp}</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button 
                                onClick={() => {
                                  setTabs(tabs.map(t => t.id === activeTabId ? { ...t, title: item.title, url: item.url, proxyUrl: getProxyUrlFor(item.url) } : t));
                                  setModal(null);
                                }}
                                className="text-[9px] px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-white rounded font-mono hover:bg-zinc-800"
                              >
                                Go
                              </button>
                              <button 
                                onClick={() => {
                                  const next = browseHistory.filter(h => h.id !== item.id);
                                  setBrowseHistory(next);
                                  localStorage.setItem("xena_browse_history", JSON.stringify(next));
                                }}
                                className="text-zinc-500 hover:text-red-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "ai" && (
                <div className="space-y-3">
                  <div className="p-3 border border-zinc-850 bg-black rounded-lg flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-semibold text-zinc-200 font-mono">Neural Calibration Bypass</span>
                      <span className="block text-[9px] text-zinc-550 mt-1 font-mono uppercase">Skip delay tuning sequences</span>
                    </div>
                    <button 
                      onClick={() => {
                        const nextVal = !bypassCalibration;
                        setBypassCalibration(nextVal);
                        localStorage.setItem("xena_bypass_calibration", String(nextVal));
                      }}
                      className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider font-mono transition-all duration-150 ${bypassCalibration ? "bg-white/10 text-white border border-zinc-700" : "bg-zinc-950 border border-zinc-900 text-zinc-600"}`}
                    >
                      {bypassCalibration ? "BYPASSED" : "ACTIVE"}
                    </button>
                  </div>

                  <div className="flex justify-between items-center mr-1 pt-1">
                    <span className="text-[9px] font-mono font-semibold tracking-wider text-zinc-500 uppercase">Dialogue Sessions ({chatThreads.length})</span>
                    <button 
                      onClick={() => startNewThread()}
                      className="text-[8px] font-mono uppercase bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 px-2 py-1 hover:bg-emerald-900/40 rounded flex items-center gap-1 font-bold cursor-pointer transition-all"
                    >
                      <Plus className="w-2.5 h-2.5" /> New Session
                    </button>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                    {chatThreads.map((thread) => {
                      const isActive = thread.id === activeThreadId;
                      return (
                        <div 
                          key={thread.id} 
                          onClick={() => {
                            setActiveThreadId(thread.id);
                            localStorage.setItem("xena_active_thread_id", thread.id);
                          }}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${isActive ? "bg-white/5 border-zinc-700 text-white" : "bg-black/40 border-zinc-900 text-zinc-500 hover:border-zinc-805"}`}
                        >
                          <div className="flex flex-col min-w-0 mr-3">
                            <span className="text-xs font-semibold font-mono truncate text-zinc-200">{thread.title}</span>
                            <span className="text-[8px] font-mono uppercase text-zinc-555 mt-1">{thread.messages.length} messages • {thread.timestamp}</span>
                          </div>
                          <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={(e) => deleteThread(thread.id, e)}
                              className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-950 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {settingsTab === "autofix" && (
                <div className="space-y-4 font-mono text-center py-6">
                  <Cpu className="w-12 h-12 mx-auto text-zinc-750 animate-pulse mb-3" />
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Access Restricted</h4>
                  <p className="text-[10px] leading-relaxed text-zinc-550 max-w-xs mx-auto font-sans">
                    HackerAI dynamic self-repair interfaces are restricted to the <strong className="text-zinc-300">XENA Dev Panel</strong>.
                  </p>
                  <button 
                    onClick={() => {
                      createNewTab("/dev.html");
                      setModal(null);
                    }}
                    className="mt-3 px-4 py-1.5 bg-zinc-950 border border-zinc-850 text-[10px] font-mono font-bold tracking-wider text-white hover:bg-zinc-900 rounded-md cursor-pointer transition-all hover:border-zinc-700"
                  >
                    LAUNCH DEV PANEL
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: REPORT
          ============================================================ */}
      {modal === "report" && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#050505] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-850 bg-black">
              <span className="font-semibold text-xs tracking-wider text-white uppercase">BUG REPORT & SUGGESTIONS</span>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white cursor-pointer select-none">
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">KIND</label>
                  <select 
                    value={reportForm.kind}
                    onChange={(e: any) => setReportForm({ ...reportForm, kind: e.target.value })}
                    className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-2 text-xs text-white focus:border-zinc-500"
                  >
                    <option value="bug">BUG REPORT</option>
                    <option value="suggestion">SUGGESTION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">TITLE</label>
                  <input 
                    type="text" 
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    placeholder="Short summary"
                    className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">RELATED URL (OPTIONAL)</label>
                <input 
                  type="text" 
                  value={reportForm.url}
                  onChange={(e) => setReportForm({ ...reportForm, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full h-9 rounded-lg border border-zinc-800 bg-black px-3 text-xs text-white outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono tracking-wider text-zinc-500 mb-1.5 uppercase">DETAILS</label>
                <textarea 
                  rows={4}
                  value={reportForm.details}
                  onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })}
                  placeholder="What occurred..."
                  className="w-full rounded-lg border border-zinc-800 bg-black p-3 text-xs text-white outline-none resize-none focus:border-zinc-500"
                />
              </div>

              <button 
                onClick={submitReport}
                className="w-full h-10 mt-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all duration-150 cursor-pointer"
              >
                SUBMIT REPORT
              </button>

              {reports.length > 0 && (
                <div className="pt-4 border-t border-zinc-850 space-y-2">
                  <span className="block text-[9px] font-mono tracking-wider text-zinc-500 uppercase font-bold">YOUR SUBMISSIONS ({reports.length})</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                    {reports.map((rep) => (
                      <div key={rep.id} className="p-2 border border-zinc-800 bg-black/50 rounded-lg text-[10px] leading-relaxed">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mr-1.5 ${rep.kind === "bug" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"}`}>{rep.kind}</span>
                        <strong className="text-zinc-200">{rep.title}</strong>
                        <p className="text-zinc-550 mt-1 font-mono">{rep.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="h-6 border-t border-zinc-900 bg-black text-[9px] font-mono tracking-wider text-zinc-500 flex items-center justify-between px-3 select-none shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.2 font-bold uppercase text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SYS_SECURE_ACTIVE
          </span>
          <span className="text-zinc-800">|</span>
          <span className="uppercase text-zinc-600">ENCRYPTION: SW_TUNNEL_ON</span>
          <span className="text-zinc-800">|</span>
          <span className="uppercase text-zinc-600">POPUP_CONTAINMENT: BLOCKED</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">PORT: 3000 (LOCAL)</span>
          <span className="text-zinc-800 hidden sm:inline">|</span>
          <span>LATENCY: {ping}MS</span>
          <span className="text-zinc-800">|</span>
          <span className="text-zinc-400 font-medium">{currentTime || new Date().toLocaleTimeString()}</span>
        </div>
      </footer>

    </div>
  );
}

// ============================================================
// STARRY BACKGROUND CANVAS
// ============================================================
function StarryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let stars: Array<{ x: number; y: number; r: number; alpha: number; speed: number; dir: number }> = [];

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
        initStars(canvas.width, canvas.height);
      }
    });

    resizeObserver.observe(canvas.parentElement || canvas);

    const initStars = (w: number, h: number) => {
      stars = [];
      const numStars = Math.floor((w * h) / 8000);
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.5 + 0.5,
          alpha: Math.random(),
          speed: Math.random() * 0.015 + 0.005,
          dir: Math.random() > 0.5 ? 1 : -1
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.alpha += s.speed * s.dir;
        if (s.alpha >= 1) { s.alpha = 1; s.dir = -1; }
        else if (s.alpha <= 0.15) { s.alpha = 0.15; s.dir = 1; }

        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-60" 
    />
  );
}
