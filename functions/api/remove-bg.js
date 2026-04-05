/**
 * Cloudflare Pages Function: /api/remove-bg
 * Proxies image upload to Remove.bg API
 * Env var required: REMOVE_BG_API_KEY
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse the multipart form data from the client
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const imageFile = formData.get('image_file');
  if (!imageFile) {
    return new Response(JSON.stringify({ error: 'No image_file field in request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(imageFile.type)) {
    return new Response(JSON.stringify({ error: 'Unsupported image type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Forward to Remove.bg
  const upstreamForm = new FormData();
  upstreamForm.append('image_file', imageFile);
  upstreamForm.append('size', 'auto');

  let upstreamRes;
  try {
    upstreamRes = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: upstreamForm,
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to reach Remove.bg API' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!upstreamRes.ok) {
    const errBody = await upstreamRes.text().catch(() => '');
    return new Response(JSON.stringify({ error: 'Remove.bg API error', detail: errBody }), {
      status: upstreamRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Stream the PNG back to the client
  const imageBlob = await upstreamRes.arrayBuffer();
  return new Response(imageBlob, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
