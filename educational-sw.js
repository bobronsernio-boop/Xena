// Service Worker (sw.js) - Educational Demo for Networking Class
// This Service Worker intercepts network requests and rewrites URLs on-the-fly to bypass CORS filters.

const BACKEND_URL = self.location.origin; // Set to Backend Proxy server address

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Helper to determine if we should intercept and rewrite HTML URLs
function shouldRewrite(url) {
  const parsed = new URL(url);
  return (
    parsed.origin !== self.location.origin && 
    !parsed.pathname.startsWith('/api/') && 
    !parsed.pathname.endsWith('.js') && 
    !parsed.pathname.endsWith('.css')
  );
}

// Rewrites HTML strings to route links and script references through the proxy endpoint
function rewriteHtmlContent(html, baseUrl) {
  // Resolve relative URLs to absolute URLs and wrap them in our fetch proxy path
  function encodeProxyUrl(urlStr) {
    try {
      const absoluteUrl = new URL(urlStr, baseUrl).href;
      return `/fetch/?url=${encodeURIComponent(absoluteUrl)}`;
    } catch (e) {
      return urlStr;
    }
  }

  let rewritten = html;
  
  // Rewrite anchor links: href="..."
  rewritten = rewritten.replace(/href=["'](http[^"']+|[^"']+)["']/gi, (match, url) => {
    if (url.startsWith('#') || url.startsWith('javascript:')) return match;
    return `href="${encodeProxyUrl(url)}"`;
  });

  // Rewrite image and media sources: src="..."
  rewritten = rewritten.replace(/src=["'](http[^"']+|[^"']+)["']/gi, (match, url) => {
    return `src="${encodeProxyUrl(url)}"`;
  });

  // Rewrite action forms: action="..."
  rewritten = rewritten.replace(/action=["'](http[^"']+|[^"']+)["']/gi, (match, url) => {
    return `action="${encodeProxyUrl(url)}"`;
  });

  return rewritten;
}

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Intercept requests that specifically query /fetch/
  if (requestUrl.pathname.startsWith('/fetch/')) {
    const targetUrl = requestUrl.searchParams.get('url');
    if (!targetUrl) {
      event.respondWith(new Response('No target URL requested', { status: 400 }));
      return;
    }

    event.respondWith(
      fetch(`${BACKEND_URL}/proxy/?url=${encodeURIComponent(targetUrl)}`, {
        method: event.request.method,
        headers: event.request.headers,
        body: ['GET', 'HEAD'].includes(event.request.method) ? null : event.request.body,
        redirect: 'follow'
      })
      .then(async (response) => {
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');

        const contentType = response.headers.get('content-type') || '';
        
        // Rewrite HTML files, pass binary content (images, videos, fonts, etc.) straight through
        if (contentType.includes('text/html')) {
          const originalText = await response.text();
          const rewrittenText = rewriteHtmlContent(originalText, targetUrl);
          
          return new Response(rewrittenText, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
          });
        }

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      })
      .catch((error) => {
        return new Response(`Educational Proxy Error: ${error.message}`, { status: 502 });
      })
    );
    return;
  }

  // 2. Resolve normal navigation of URLs outside our origin, wrapping them in /fetch/
  if (event.request.mode === 'navigate' && shouldRewrite(event.request.url)) {
    event.respondWith(
      Response.redirect(`/fetch/?url=${encodeURIComponent(event.request.url)}`, 302)
    );
    return;
  }
});
