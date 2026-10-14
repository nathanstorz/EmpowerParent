// functions/_lib/auth.js
// Shared check that every admin function calls first.

export function requireAdmin(request, env) {
  // Block cross-site form posts: browsers always send Origin on cross-site POSTs.
  if (request.method !== "GET") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin) {
      return deny("Forbidden.", 403);
    }
  }

  // Local development only: .dev.vars sets this. It does not exist on the live site.
  if (env.DEV_BYPASS_AUTH === "true") return null;

  // TODO: verify the Cloudflare Access login here once the site is deployed.
  // Until then it fails closed: on the live site, every admin request is refused.
  return deny("Not authorized.", 401);
}

function deny(message, status) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}