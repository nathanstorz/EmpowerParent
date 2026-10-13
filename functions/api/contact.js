// functions/api/contact.js
// Cloudflare Pages Function: receives the consultation form, checks it, emails it via Resend.

export async function onRequestPost({ request, env }) {
    const json = (body, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        });

    // 1. Read the form
    let data;
    try {
        data = await request.formData();
    } catch {
        return json({ ok: false, error: "Invalid request." }, 400);
    }

    // 2. Honeypot: real visitors never see this field, bots fill it in.
    //    Reply "ok" so the bot thinks it worked, but send nothing.
    if ((data.get("website") || "").toString().trim() !== "") {
        return json({ ok: true });
    }

    // 3. Clean and validate (single-line fields lose newlines to block header tricks)
    const oneLine = (key, max) =>
        (data.get(key) || "").toString().replace(/[\r\n]+/g, " ").trim().slice(0, max);

    const firstName = oneLine("firstName", 80);
    const lastName = oneLine("lastName", 80);
    const email = oneLine("email", 254);
    const phone = oneLine("phone", 40);
    const message = (data.get("message") || "").toString().trim().slice(0, 5000);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!firstName || !lastName || !emailOk || !message) {
        return json({ ok: false, error: "Please fill in your name, a valid email, and a message." }, 400);
    }

    // 4. Turnstile check (server side, so bots can't skip it)
    const token = (data.get("cf-turnstile-response") || "").toString();
    if (!token) {
        return json({ ok: false, error: "Please complete the security check and try again." }, 400);
    }
    const verifyBody = new FormData();
    verifyBody.append("secret", env.TURNSTILE_SECRET_KEY);
    verifyBody.append("response", token);
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) verifyBody.append("remoteip", ip);

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: verifyBody,
    });
    const verify = await verifyRes.json();
    if (!verify.success) {
        return json({ ok: false, error: "Security check failed. Please refresh and try again." }, 400);
    }

    // 5. Build the email to the partners
    const esc = (s) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const recipients = (env.TO_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const fullName = `${firstName} ${lastName}`;

    const notify = await sendEmail(env, {
        from: env.FROM_EMAIL,
        to: recipients,
        reply_to: email, // hitting Reply goes to the parent
        subject: `New consultation request from ${fullName}`,
        text: `Name: ${fullName}\nEmail: ${email}\nPhone: ${phone || "(not given)"}\n\nMessage:\n${message}`,
        html: `<p><strong>Name:</strong> ${esc(fullName)}<br>
           <strong>Email:</strong> ${esc(email)}<br>
           <strong>Phone:</strong> ${esc(phone || "(not given)")}</p>
           <p><strong>Message:</strong></p>
           <p>${esc(message).replace(/\n/g, "<br>")}</p>
           <p style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;color:#666;font-size:13px;">
             To respond, just hit <strong>Reply</strong>. Your reply goes directly to
             ${esc(fullName)} (${esc(email)}).<br>
             This message was sent from the contact form on empowerparent.com.
           </p>`,
    });

    if (!notify.ok) {
        console.error("Resend error:", notify.status, notify.detail);
        return json({ ok: false, error: "Sorry, something went wrong sending your message. Please try again later." }, 502);
    }

    // 6. Optional confirmation to the parent (off unless SEND_CONFIRMATION = "true")
    if (env.SEND_CONFIRMATION === "true") {
        const confirm = await sendEmail(env, {
            from: env.FROM_EMAIL,
            to: [email],
            reply_to: recipients,
            subject: "We received your message",
            text: `Hi ${firstName},\n\nThank you for reaching out to Partners in Educational Advocacy. We received your message and will be in touch soon.\n\nPartners in Educational Advocacy`,
        });
        if (!confirm.ok) console.error("Confirmation email failed:", confirm.status, confirm.detail);
        // Never fail the request because of this: the partners already got the inquiry.
    }

    return json({ ok: true });
}

async function sendEmail(env, payload) {
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true };
    return { ok: false, status: res.status, detail: await res.text() };
}