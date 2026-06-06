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

// Simple local fallback canvas component to prevent missing reference crashes
function StarryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;
    
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random(),
      speed: Math.random() * 0.015 + 0.005,
      dir: Math.random() > 0.5 ? 1 : -1
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      stars.forEach(s => {
        s.alpha += s.speed * s.dir;
        if (s.alpha >= 1) { s.alpha = 1; s.dir = -1; }
        else if (s.alpha <= 0.15) { s.alpha = 0.15; s.dir = 1; }
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

export default function App() {
  // Splash screen state control
  const [showSplash, setShowSplash] = useState(true);

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

  // Splash screen timeout hook
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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
      document.title = "MathsTutoring";
      let link: any = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.type = "image/x-icon";
        link.rel = "shortcut icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = "https://ssl.gstatic.com/classroom/favicon.png";
    } else {
      document.title = "Xena";
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
          body: JSON.stringify({ message: userMsg.text })
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
    <>
      {showSplash ? (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-[#fce8d9]">
          <h1 className="text-4xl font-bold text-[#4a3728] mb-4">Riverbend Tutoring</h1>
          <p className="text-[#8b6f5a]">After-School Coaching & Test Prep</p>
          <p className="text-[#8b6f5a] text-sm mt-8">Loading...</p>
        </div>
      ) : (
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
                    Get personalized academic support from certified tutors. We help students build confidence, improve grades, and ace exams.
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
                        Ongoing one-on-one support in math, science, English, and more. Build strong study habits and stay on track all semester.
                      </p>
                    </div>

                    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-700 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                        <GraduationCap className="w-5 h-5 text-blue-400" />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2">Subject-Focused Tutoring</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Deep dives into specific subjects — from Algebra to Chemistry. Master difficult concepts with step-by-step guidance.
                      </p>
                    </div>

                    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-700 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                        <Award className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2">SAT/ACT Prep</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Targeted test-taking strategies, practice exams, and score analysis. Boost your confidence and maximize your results.
                      </p>
                    </div>
                  </div>

                  {/* Quick Link Buttons */}
                  <div className="flex flex-wrap justify-center gap-3 mb-6">
                    <button 
                      onClick={() => handleNavigate("khanacademy.org")}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" /> Khan Academy
                    </button>
                    <button 
                      onClick={() => handleNavigate("quizlet.com")}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" /> Quizlet
                    </button>
                    <button 
                      onClick={() => handleNavigate("desmos.com")}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" /> Desmos
                    </button>
                    <button 
                      onClick={() => setAiOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all"
                    >
                      <Sparkles className="w-3 h-3" /> AI Study Assistant
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-600 font-mono mt-2">
                    © 2026 Riverbend Tutoring. All rights reserved.
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* ============================================================
              AI SIDEBAR PANEL
              ============================================================ */}
          <section className={`fixed top-0 bottom-0 right-0 w-80 sm:w-96 bg-black border-l border-zinc-850 z-40 shadow-2xl flex flex-col transition-all duration-300 transform ${aiOpen ? "translate-x-0" : "translate-x-full"}`}>
            <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-850 bg-black">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="font-semibold text-xs tracking-tight text-white">XENA Neural Assistant</span>
              </div>
              <button 
                onClick={() => setAiOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* ... Rest of sidebar layout ... */}
          </section>
        </div>
      )}
    </>
  );
}
