// js/testimonials.js
// Loads published testimonials from /api/testimonials and draws a card for each.

const grid = document.getElementById("tst-grid");

function showMessage(text) {
  const p = document.createElement("p");
  p.className = "tst-message";
  p.textContent = text;
  grid.replaceChildren(p);
}

async function loadTestimonials() {
  try {
    const res = await fetch("/api/testimonials");
    if (!res.ok) throw new Error("Bad response");
    const items = await res.json();

    if (!items.length) {
      showMessage("Testimonials are coming soon.");
      return;
    }

    const cards = items.map((item) => {
      const card = document.createElement("figure");
      card.className = "tst-card";

      const blockquote = document.createElement("blockquote");
      const quote = document.createElement("p");
      quote.className = "tst-quote";
      quote.textContent = item.quote;          // textContent: text only, never HTML
      blockquote.appendChild(quote);

      const caption = document.createElement("figcaption");
      caption.className = "tst-attribution";
      caption.textContent = item.attribution;

      card.append(blockquote, caption);
      return card;
    });

    grid.replaceChildren(...cards);
  } catch {
    showMessage("We couldn't load testimonials right now. Please try again later.");
  }
}

loadTestimonials();