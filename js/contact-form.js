// js/contact-form.js
// Handles every form marked with data-contact-form (home page + contact page).

document.querySelectorAll("form[data-contact-form]").forEach((form) => {
  const status = form.querySelector("[data-form-status]");
  const button = form.querySelector('button[type="submit"]');

  const show = (text, kind) => {
    status.textContent = text;
    status.className = "form-status form-status--" + kind;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    button.disabled = true;
    show("Sending…", "info");

    try {
      const res = await fetch("/api/contact", { method: "POST", body: new FormData(form) });
      const result = await res.json().catch(() => ({}));

      if (res.ok && result.ok) {
        form.reset();
        show("Thank you! Your message was sent. We'll be in touch soon.", "success");
      } else {
        show(result.error || "Something went wrong. Please try again.", "error");
      }
    } catch {
      show("Couldn't reach the server. Please check your connection and try again.", "error");
    } finally {
      button.disabled = false;
      if (window.turnstile) window.turnstile.reset(); // tokens are single-use
    }
  });
});