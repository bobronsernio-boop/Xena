import * as cheerio from "cheerio";
import { Request, Response } from "express";

function b64UrlEncode(value: string): string {
  return Buffer.from(String(value || ""), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64UrlDecode(value: string): string {
  try {
    let token = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    while (token.length % 4 !== 0) token += "=";
    return Buffer.from(token, "base64").toString("utf8");
  } catch {
    return String(value || "");
  }
}

const PROXY_PREFIX = "/proxy";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function rewriteHtml(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
      try { const absolute = new URL(href, baseUrl).href; $(el).attr("href", `${PROXY_PREFIX}/${b64UrlEncode(absolute)}`); } catch {}
    }
  });
  $("form[action]").each((_, el) => {
    const action = $(el).attr("action");
    if (action) {
      try { const absolute = new URL(action, baseUrl).href; $(el).attr("action", `${PROXY_PREFIX}/${b64UrlEncode(absolute)}`); } catch {}
    }
  });
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      try { const absolute = new URL(src, baseUrl).href; $(el).attr("src", `${PROXY_PREFIX}/${b64UrlEncode(absolute)}`); } catch {}
    }
  });
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      try { const absolute = new URL(src, baseUrl).href; $(el).attr("src", `${PROXY_PREFIX}/${b64UrlEncode(absolute)}`); } catch {}
    }
  });
  $("link[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      try { const absolute = new URL(href, baseUrl).href; $(el).attr("href", `${PROXY_PREFIX}/${b64UrlEncode(absolute)}`); } catch {}
    }
  });
  $("[style]").each((_, el) => {
    const style = $(el).attr("style");
    if (style && style.includes("url(")) {
      $(el).attr("style", style.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (_match: string, url: string) => {
        try { const absolute = new URL(url, baseUrl).href; return `url(${PROXY_PREFIX}/${b64UrlEncode(absolute)})`; } catch { return _match; }
      }));
    }
  });

  return $.html();
}

export async function handleProxy(req: Request, res: Response): Promise<void> {
  const encodedUrl = req.path.replace(PROXY_PREFIX, "").replace(/^\//, "");
  if (!encodedUrl) {
    res.status(400).send("Missing target URL. Usage: /proxy/<base64url>");
    return;
  }
  let targetUrl: string;
  try {
    targetUrl = b64UrlDecode(encodedUrl);
    new URL(targetUrl);
  } catch {
    res.status(400).send("Invalid encoded URL");
    return;
  }
  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.5" },
      redirect: "follow",
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.status(response.status).send(buffer);
      return;
    }
    const html = await response.text();
    const rewritten = rewriteHtml(html, targetUrl);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.status(response.status).send(rewritten);
  } catch (err: any) {
    console.error(`[ProxyEngine] Error fetching ${targetUrl}:`, err.message);
    res.status(502).send(`Proxy error: ${err.message}`);
  }
}

export function generateSW(): string {
  return `
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(clients.claim()); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname === "/" || url.pathname.startsWith("/assets/") || url.pathname === "/sw.js" || url.pathname.match(/\\.(js|css|png|jpg|svg|ico|woff2?)$/)) return;
  if (url.pathname.startsWith("/proxy/")) {
    e.respondWith(handleProxyFetch(e.request));
    return;
  }
  if (url.hostname !== self.location.hostname) {
    const encoded = btoa(url.href).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
    e.respondWith(fetch(self.location.origin + "/proxy/" + encoded));
  }
});
async function handleProxyFetch(request) {
  const url = new URL(request.url);
  const encoded = url.pathname.replace("/proxy/", "");
  let targetUrl;
  try { targetUrl = atob(encoded.replace(/-/g, "+").replace(/_/g, "")); }
  catch { return new Response("Invalid proxy URL", { status: 400 }); }
  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": navigator.userAgent, "Accept": request.headers.get("Accept") || "*/*" },
      redirect: "follow",
    });
    return response;
  } catch (err) {
    return new Response("Proxy fetch failed: " + err.message, { status: 502 });
  }
}`;
}
