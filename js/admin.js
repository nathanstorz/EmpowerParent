// js/admin.js
// Admin page: add, edit, show/hide and delete testimonials via /api/admin/entries.

const form = document.getElementById("adm-form");
const formTitle = document.getElementById("adm-form-title");
const quoteEl = document.getElementById("adm-quote");
const attrEl = document.getElementById("adm-attribution");
const permEl = document.getElementById("adm-permission");
const pubEl = document.getElementById("adm-published");
const submitBtn = document.getElementById("adm-submit");
const cancelBtn = document.getElementById("adm-cancel");
const statusEl = document.getElementById("adm-status");
const listEl = document.getElementById("adm-list");
const countEl = document.getElementById("adm-count");

let items = [];        // every testimonial, drafts included
let editingId = null;  // id of the one being edited, or null when adding

/* ---------- small helpers ---------- */

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = "adm-status" + (kind ? " adm-status--" + kind : "");
}

async function api(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      res.status === 401 || res.status === 403
        ? "You aren't signed in, or don't have access. Please reload the page and sign in again."
        : body.error || "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return body;
}

// Builds the form data the server expects. A checkbox is sent only when ticked.
function bodyFrom({ quote, attribution, permission, published }) {
  const fd = new FormData();
  fd.append("quote", quote);
  fd.append("attribution", attribution);
  if (permission) fd.append("permission_confirmed", "on");
  if (published) fd.append("published", "on");
  return fd;
}

function formatDate(value) {
  const d = new Date(value.replace(" ", "T") + "Z"); // the database stores UTC
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // text only, never HTML
  return node;
}

/* ---------- the form ---------- */

// "Show now" can only be ticked once permission is ticked
function syncPublishedBox() {
  pubEl.disabled = !permEl.checked;
  if (!permEl.checked) pubEl.checked = false;
}
permEl.addEventListener("change", syncPublishedBox);

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = "Add a testimonial";
  submitBtn.textContent = "Save testimonial";
  cancelBtn.hidden = true;
  syncPublishedBox();
}
cancelBtn.addEventListener("click", () => {
  resetForm();
  setStatus("", "");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const body = bodyFrom({
    quote: quoteEl.value,
    attribution: attrEl.value,
    permission: permEl.checked,
    published: pubEl.checked,
  });

  submitBtn.disabled = true;
  setStatus("Saving…", "info");
  try {
    if (editingId) {
      await api(`/api/admin/entries/${editingId}`, { method: "PUT", body });
    } else {
      await api("/api/admin/entries", { method: "POST", body });
    }
    const wasEditing = Boolean(editingId);
    resetForm();
    await loadList();
    setStatus(wasEditing ? "Changes saved." : "Testimonial saved.", "success");
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

function startEditing(item) {
  editingId = item.id;
  quoteEl.value = item.quote;
  attrEl.value = item.attribution;
  permEl.checked = Boolean(item.permission_confirmed);
  syncPublishedBox();
  pubEl.checked = Boolean(item.published) && permEl.checked;
  formTitle.textContent = "Edit testimonial";
  submitBtn.textContent = "Save changes";
  cancelBtn.hidden = false;
  setStatus("", "");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  quoteEl.focus();
}

/* ---------- the list ---------- */

function buildCard(item) {
  const card = el("article", "adm-item");

  card.append(el("blockquote", "", item.quote));
  card.append(el("p", "adm-who", item.attribution));

  const meta = el("div", "adm-meta");
  meta.append(
    el("span", "adm-badge " + (item.published ? "adm-badge--live" : "adm-badge--draft"),
       item.published ? "Showing on website" : "Not showing")
  );
  meta.append(el("span", "", "Added " + formatDate(item.created_at)));
  card.append(meta);

  const actions = el("div", "adm-item-actions");

  const edit = el("button", "adm-btn adm-btn--outline adm-btn--small", "Edit");
  edit.type = "button";
  edit.dataset.action = "edit";
  edit.dataset.id = item.id;

  const toggle = el("button", "adm-btn adm-btn--outline adm-btn--small",
                    item.published ? "Hide from website" : "Show on website");
  toggle.type = "button";
  toggle.dataset.action = "toggle";
  toggle.dataset.id = item.id;
  const needsPermission = !item.published && !item.permission_confirmed;
  if (needsPermission) toggle.disabled = true;

  const del = el("button", "adm-btn adm-btn--outline adm-btn--small adm-btn--danger", "Delete");
  del.type = "button";
  del.dataset.action = "delete";
  del.dataset.id = item.id;

  actions.append(edit, toggle, del);
  if (needsPermission) {
    actions.append(el("span", "adm-note", "Confirm permission (use Edit) before showing this."));
  }
  card.append(actions);
  return card;
}

function render() {
  countEl.textContent = items.length ? `(${items.length})` : "";
  if (!items.length) {
    listEl.replaceChildren(el("p", "adm-message", "No testimonials yet. Add your first one above."));
    return;
  }
  listEl.replaceChildren(...items.map(buildCard));
}

async function loadList() {
  items = await api("/api/admin/entries");
  render();
}

// One listener handles every button in the list
listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn || btn.disabled) return;

  const item = items.find((i) => i.id === Number(btn.dataset.id));
  if (!item) return;

  if (btn.dataset.action === "edit") {
    startEditing(item);
    return;
  }

  btn.disabled = true;
  try {
    if (btn.dataset.action === "toggle") {
      await api(`/api/admin/entries/${item.id}`, {
        method: "PUT",
        body: bodyFrom({
          quote: item.quote,
          attribution: item.attribution,
          permission: Boolean(item.permission_confirmed),
          published: !item.published,
        }),
      });
      setStatus(item.published ? "Hidden from the website." : "Now showing on the website.", "success");
    }

    if (btn.dataset.action === "delete") {
      if (!confirm("Delete this testimonial? This can't be undone.")) {
        btn.disabled = false;
        return;
      }
      await api(`/api/admin/entries/${item.id}`, { method: "DELETE" });
      if (editingId === item.id) resetForm();
      setStatus("Testimonial deleted.", "success");
    }

    await loadList();
  } catch (err) {
    setStatus(err.message, "error");
    btn.disabled = false;
  }
});

/* ---------- start ---------- */

syncPublishedBox();
loadList().catch((err) => {
  listEl.replaceChildren(el("p", "adm-message", err.message));
});