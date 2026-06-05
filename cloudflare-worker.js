// Cloudflare Worker CORS-Bypassing Fetch Proxy - Educational Demo
// Listens to incoming HTTP requests, fetches the target URL, and returns it with CORS headers enabled.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Only route requests directed to /proxy/ endpoint
    if (url.pathname !== '/proxy/' && url.pathname !== '/proxy') {
      return new Response('Educational CORS Proxy. Usage: /proxy/?url=https://example.com', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('Error: Missing target url query parameter.', { status: 400 });
    }

    try {
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('Origin', new URL(targetUrl).origin);
      reqHeaders.set('Referer', targetUrl);
      
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: reqHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
        redirect: 'follow'
      });

      const resHeaders = new Headers(response.headers);
      resHeaders.set('Access-Control-Allow-Origin', '*');
      resHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
      resHeaders.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*');
      resHeaders.set('Access-Control-Expose-Headers', '*');
      resHeaders.set('Access-Control-Allow-Credentials', 'true');

      // Forward cookies that were set
      const cookieHeader = response.headers.get('Set-Cookie');
      if (cookieHeader) resHeaders.set('Set-Cookie', cookieHeader);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders
      });
    } catch (err) {
      return new Response(`Cloudflare Worker proxy gateway error: ${err.message}`, {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
}
