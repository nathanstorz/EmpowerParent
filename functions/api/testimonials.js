// functions/api/testimonials.js
// Public endpoint: returns published testimonials, newest first.

export async function onRequestGet({ env }) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store", // always fresh while we build; we can allow short caching later
  };

  try {
    const { results } = await env.DB
      .prepare(
        "SELECT id, quote, attribution FROM testimonials WHERE published = 1 ORDER BY created_at DESC, id DESC"
      )
      .all();

    return new Response(JSON.stringify(results), { headers });
  } catch (err) {
    console.error("Testimonials query failed:", err);
    return new Response(JSON.stringify({ error: "Could not load testimonials." }), {
      status: 500,
      headers,
    });
  }
}