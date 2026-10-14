// functions/api/admin/entries.js
// Admin: list all testimonials (including drafts) and add new ones.

import { requireAdmin } from "../../_lib/auth.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// GET /api/admin/entries: everything, drafts too
export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const { results } = await env.DB
    .prepare(
      "SELECT id, quote, attribution, permission_confirmed, published, created_at FROM testimonials ORDER BY created_at DESC, id DESC"
    )
    .all();
  return json(results);
}

// POST /api/admin/entries: add one
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  let data;
  try {
    data = await request.formData();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const quote = (data.get("quote") || "").toString().trim().slice(0, 2000);
  const attribution = (data.get("attribution") || "").toString().replace(/[\r\n]+/g, " ").trim().slice(0, 120);
  const permission = data.get("permission_confirmed") ? 1 : 0; // ticked checkbox = field present
  const published = data.get("published") ? 1 : 0;

  if (!quote || !attribution) {
    return json({ ok: false, error: "Please enter the quote and who said it." }, 400);
  }
  // The rule lives here, on the server, so it holds even if the page is bypassed.
  if (published === 1 && permission !== 1) {
    return json({ ok: false, error: "Confirm permission before publishing." }, 400);
  }

  const result = await env.DB
    .prepare("INSERT INTO testimonials (quote, attribution, permission_confirmed, published) VALUES (?, ?, ?, ?)")
    .bind(quote, attribution, permission, published)
    .run();

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}