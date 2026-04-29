// Coaching-call email pipeline. Mirrors the waitlist module: one admin
// notification to Banjo, one confirmation to the booker. Both go via
// Resend with the verified hello@traderm8.com sender.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_ADDRESS = "TraderM8 <hello@traderm8.com>";
const ADMIN_ADDRESS = "banjotomlinson@gmail.com";
const APP_URL = "https://traderm8.com";

interface BookingInput {
  name: string;
  email: string;
  startsAt: Date;
  topic: string | null;
}

function escape(s: string | null): string {
  if (!s) return "—";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtSlot(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

export async function sendCoachingAdminNotification(
  input: BookingInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[coaching] RESEND_API_KEY not set — skipping admin email");
    return;
  }

  const londonTime = fmtSlot(input.startsAt, "Europe/London");
  const subject = `📅 New TraderM8 call booking — ${input.name} (${londonTime.replace(/ \w+$/, "")})`;

  const text = [
    `New 30-minute call booked.`,
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `When: ${londonTime}`,
    `Topic: ${input.topic ?? "—"}`,
    "",
    "Reply to this email to reach the booker directly.",
  ].join("\n");

  const html = `
<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0e17;color:#e2e8f0;margin:0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #1e293b;border-radius:14px;overflow:hidden;">
    <div style="padding:24px 28px;border-bottom:1px solid #1e293b;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#3b82f6;font-weight:700;margin-bottom:6px;">
        New call booking
      </div>
      <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">
        ${escape(input.name)}
      </div>
      <div style="margin-top:8px;font-size:13px;color:#22c55e;font-weight:600;">
        ${escape(londonTime)}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#e2e8f0;">
      <tr><td style="padding:12px 28px;border-bottom:1px solid #1e293b;color:#94a3b8;width:120px;">Email</td><td style="padding:12px 28px;border-bottom:1px solid #1e293b;"><a href="mailto:${escape(input.email)}" style="color:#60a5fa;text-decoration:none;font-weight:600;">${escape(input.email)}</a></td></tr>
      <tr><td style="padding:12px 28px;border-bottom:1px solid #1e293b;color:#94a3b8;">When</td><td style="padding:12px 28px;border-bottom:1px solid #1e293b;font-weight:600;">${escape(londonTime)}</td></tr>
      <tr><td style="padding:12px 28px;color:#94a3b8;vertical-align:top;">Topic</td><td style="padding:12px 28px;line-height:1.55;">${escape(input.topic).replace(/\n/g, "<br>")}</td></tr>
    </table>
    <div style="padding:18px 28px;border-top:1px solid #1e293b;background:#0f172a;font-size:12px;color:#64748b;">
      Reply to this email to reach the booker directly.
    </div>
  </div>
</body></html>`.trim();

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [ADMIN_ADDRESS],
        reply_to: input.email,
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const respBody = await res.text();
      console.error("[coaching] admin email failed", res.status, respBody);
    }
  } catch (err) {
    console.error("[coaching] admin email threw", err);
  }
}

export async function sendCoachingBookerConfirmation(
  input: BookingInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const londonTime = fmtSlot(input.startsAt, "Europe/London");
  const firstName = input.name.split(/\s+/)[0] ?? null;
  const greeting = firstName ? `Hey ${escape(firstName)},` : "Hey,";

  const subject = `✓ Your TraderM8 call is booked — ${londonTime.replace(/ \w+$/, "")}`;

  const text = [
    greeting,
    "",
    `Your 30-minute call with Banjo is locked in for ${londonTime}.`,
    "",
    "What happens next:",
    "  • Banjo will reply with a meeting link before your slot.",
    "  • Reply to this email any time to add context, share a chart, or reschedule.",
    "",
    `If you wrote down a topic, here's what we'll cover: ${input.topic ?? "(no topic — Banjo will check in on what's been on your mind)"}`,
    "",
    "Talk soon,",
    "— Banjo",
  ].join("\n");

  const html = `
<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0e17;color:#e2e8f0;margin:0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #1e293b;border-radius:14px;overflow:hidden;">
    <div style="padding:32px 32px 24px;border-bottom:1px solid #1e293b;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Trader<span style="color:#3b82f6;">M8</span></div>
      <div style="margin-top:6px;font-size:13px;color:#64748b;letter-spacing:0.02em;">Your mate of the market</div>
    </div>
    <div style="padding:32px 32px 8px;">
      <div style="display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#22c55e;font-weight:700;background:rgba(34,197,94,0.12);padding:5px 11px;border-radius:999px;margin-bottom:18px;">
        ✓ Call confirmed
      </div>
      <div style="font-size:24px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.01em;margin-bottom:16px;">${greeting}</div>
      <p style="font-size:15px;line-height:1.65;color:#e2e8f0;margin:0 0 14px;">
        Your 30-minute call with Banjo is locked in for <strong style="color:#60a5fa;">${escape(londonTime)}</strong>.
      </p>
    </div>

    <div style="margin:0 32px;padding:24px 24px 22px;border:1px solid #1e293b;border-radius:12px;background:#0f172a;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#3b82f6;font-weight:700;margin-bottom:10px;">What happens next</div>
      <ul style="margin:0;padding:0 0 0 20px;font-size:14px;line-height:1.7;color:#e2e8f0;">
        <li>Banjo will reply with a meeting link before your slot.</li>
        <li>Reply to this email any time to add context, share a chart, or reschedule.</li>
      </ul>
    </div>

    ${input.topic ? `
    <div style="margin:18px 32px 8px;padding:24px 24px 22px;border:1px solid #1e293b;border-radius:12px;background:#0f172a;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#60a5fa;font-weight:700;margin-bottom:10px;">What we'll cover</div>
      <p style="font-size:14px;line-height:1.7;color:#e2e8f0;margin:0;white-space:pre-wrap;">${escape(input.topic)}</p>
    </div>
    ` : ""}

    <div style="padding:24px 32px 28px;text-align:left;">
      <p style="font-size:14px;line-height:1.65;color:#94a3b8;margin:0 0 4px;">Talk soon,</p>
      <p style="font-size:15px;font-weight:700;color:#ffffff;margin:0;">— Banjo</p>
    </div>

    <div style="padding:18px 32px;border-top:1px solid #1e293b;background:#0a0e17;font-size:11px;color:#475569;text-align:center;">
      You booked this call at <a href="${APP_URL}" style="color:#64748b;text-decoration:none;">traderm8.com</a>.
    </div>
  </div>
</body></html>`.trim();

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [input.email],
        reply_to: ADMIN_ADDRESS,
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const respBody = await res.text();
      console.error("[coaching] booker email failed", res.status, respBody);
    }
  } catch (err) {
    console.error("[coaching] booker email threw", err);
  }
}
