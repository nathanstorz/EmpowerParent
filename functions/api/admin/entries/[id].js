// functions/api/admin/entries/[id].js
// Admin: edit or delete one testimonial.

import { requireAdmin } from "../../../_lib/auth.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// Turns the URL part into a safe whole number, or null if it isn't one
function parseId(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PUT /api/admin/entries/4: save changes to one testimonial
export async function onRequestPut({ request, env, params }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const id = parseId(params);
  if (!id) return json({ ok: false, error: "Invalid id." }, 400);

  let data;
  try {
    data = await request.formData();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const quote = (data.get("quote") || "").toString().trim().slice(0, 2000);
  const attribution = (data.get("attribution") || "").toString().replace(/[\r\n]+/g, " ").trim().slice(0, 120);
  const permission = data.get("permission_confirmed") ? 1 : 0;
  const published = data.get("published") ? 1 : 0;

  if (!quote || !attribution) {
    return json({ ok: false, error: "Please enter the quote and who said it." }, 400);
  }
  if (published === 1 && permission !== 1) {
    return json({ ok: false, error: "Confirm permission before publishing." }, 400);
  }

  const result = await env.DB
    .prepare("UPDATE testimonials SET quote = ?, attribution = ?, permission_confirmed = ?, published = ? WHERE id = ?")
    .bind(quote, attribution, permission, published, id)
    .run();

  if (result.meta.changes === 0) return json({ ok: false, error: "Not found." }, 404);
  return json({ ok: true });
}

// DELETE /api/admin/entries/4: remove one testimonial
export async function onRequestDelete({ request, env, params }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const id = parseId(params);
  if (!id) return json({ ok: false, error: "Invalid id." }, 400);

  const result = await env.DB
    .prepare("DELETE FROM testimonials WHERE id = ?")
    .bind(id)
    .run();

  if (result.meta.changes === 0) return json({ ok: false, error: "Not found." }, 404);
  return json({ ok: true });
}