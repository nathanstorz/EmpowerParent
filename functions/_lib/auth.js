
import { createRemoteJWKSet, jwtVerify } from "jose";

// Cloudflare Access configuration for the PEA Admin application.
const TEAM_DOMAIN = "long-salad-4e20.cloudflareaccess.com";
const APPLICATION_AUD = "73ce196e55d840be2a4d47d13d27ca8d3002cd8da84ee635fd6217cfe8c93109";

const ISSUER = `https://${TEAM_DOMAIN}`;
const JWKS = createRemoteJWKSet(
  new URL(`${ISSUER}/cdn-cgi/access/certs`)
);

// Shared authentication check for every admin function.
export async function requireAdmin(request, env) {
  // Local development bypass is permitted only in local Wrangler mode.
  // Allow bypass only when running locally on localhost.
  const hostname = new URL(request.url).hostname;

  if (
    env.DEV_BYPASS_AUTH === "true" &&
    hostname === "localhost"
  ) {
    return null;
  }

  // Reject cross-origin writes.
  if (request.method !== "GET") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin) {
      return deny("Forbidden.", 403);
    }
  }

  // Cloudflare Access forwards its signed JWT in this header.
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    return deny("Not authorized.", 401);
  }

  try {
    await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: APPLICATION_AUD,
    });

    return null;
  } catch {
    // Fail closed if verification fails for any reason.
    return deny("Not authorized.", 401);
  }
}

function deny(message, status) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
