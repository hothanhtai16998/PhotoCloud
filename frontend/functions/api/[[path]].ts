/**
 * Cloudflare Pages Function to proxy API requests
 * This handles POST/PUT/DELETE requests that _redirects cannot handle
 * 
 * Cloudflare Pages _redirects only works for GET requests.
 * This function properly proxies all HTTP methods to the backend.
 */

export async function onRequest(context: {
  request: Request;
  env: { BACKEND_URL?: string };
  params: { path?: string[] };
}): Promise<Response> {
  const { request, env, params } = context;
  
  // Get backend URL from environment variable or use default
  const backendUrl = env.BACKEND_URL || 'https://api.uploadanh.cloud';
  
  // Reconstruct the path from params
  const pathSegments = params.path || [];
  const apiPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
  
  // Get query string from original request
  const url = new URL(request.url);
  const queryString = url.search;
  
  // Construct backend URL
  const backendApiUrl = `${backendUrl}/api${apiPath}${queryString}`;
  
  // Clone the request with new URL
  const backendRequest = new Request(backendApiUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' 
      ? await request.clone().arrayBuffer() 
      : null,
  });
  
  // Forward the request to backend
  try {
    const response = await fetch(backendRequest);
    
    // Clone response to modify headers if needed
    const responseHeaders = new Headers(response.headers);
    
    // Add CORS headers if needed
    responseHeaders.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-XSRF-TOKEN, X-CSRF-Token');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to proxy request to backend',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

