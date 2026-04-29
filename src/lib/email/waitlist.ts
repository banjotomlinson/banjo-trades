// Sends an admin notification email when someone joins the waitlist.
// Backed by Resend (https://resend.com). Falls back to a console log when
// RESEND_API_KEY isn't configured so local development never blocks on it.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_ADDRESS = "TraderM8 <hello@traderm8.com>";
const TO_ADDRESS = "banjotomlinson@gmail.com";
const FREE_SPOT_CAP = 100;
const APP_URL = "https://traderm8.com";

interface SignupNotificationInput {
  name: string | null;
  email: string;
  primaryAsset: string | null;
  experience: string | null;
  painPoint: string | null;
  totalCount: number;
}

const ASSET_LABELS: Record<string, string> = {
  futures: "Index futures (NQ, ES, etc.)",
  forex: "Forex",
  crypto: "Crypto",
  commodities: "Commodities (Gold, Oil, etc.)",
  stocks: "Stocks / Indices",
  all: "A bit of everything",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  "<1y": "Less than a year",
  "1-3y": "1–3 years",
  "3-5y": "3–5 years",
  "5+y": "5+ years",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function escape(s: string | null): string {
  if (!s) return "—";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendWaitlistNotification(
  input: SignupNotificationInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[waitlist] RESEND_API_KEY not set — skipping email", {
      ...input,
      painPoint: input.painPoint?.slice(0, 80),
    });
    return;
  }

  const n = input.totalCount;
  const remaining = Math.max(0, FREE_SPOT_CAP - n);
  const overCap = n > FREE_SPOT_CAP;

  const headline = overCap
    ? `Signup #${n} — past the 100 free-spot cap`
    : `Signup #${n} of ${FREE_SPOT_CAP} free spots — ${remaining} ${remaining === 1 ? "spot" : "spots"} remaining`;

  const subject = `🎉 New TraderM8 waitlist signup #${n} — ${input.name ?? input.email}`;

  const assetLabel = input.primaryAsset
    ? (ASSET_LABELS[input.primaryAsset] ?? input.primaryAsset)
    : null;
  const expLabel = input.experience
    ? (EXPERIENCE_LABELS[input.experience] ?? input.experience)
    : null;

  const text = [
    headline,
    "",
    `Name: ${input.name ?? "—"}`,
    `Email: ${input.email}`,
    `Trades: ${assetLabel ?? "—"}`,
    `Experience: ${expLabel ?? "—"}`,
    `Pain point: ${input.painPoint ?? "—"}`,
    "",
    `This is the ${ordinal(n)} signup overall.`,
    "View all signups: https://supabase.com/dashboard/project/ljnstvgruwougxpqtoyf/editor",
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0e17;color:#e2e8f0;margin:0;padding:32px;">
    <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #1e293b;border-radius:14px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #1e293b;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#3b82f6;font-weight:700;margin-bottom:6px;">
          Signup #${n}${overCap ? "" : ` of ${FREE_SPOT_CAP}`}
        </div>
        <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">
          ${escape(input.name ?? input.email)}
        </div>
        <div style="margin-top:8px;font-size:13px;color:${overCap ? "#f59e0b" : "#22c55e"};font-weight:600;">
          ${overCap ? "⚠️ Past the 100 free-spot cap" : `${remaining} ${remaining === 1 ? "spot" : "spots"} remaining out of ${FREE_SPOT_CAP}`}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#e2e8f0;">
        <tr><td style="padding:12px 28px;border-bottom:1px solid #1e293b;color:#94a3b8;width:140px;">Name</td><td style="padding:12px 28px;border-bottom:1px solid #1e293b;font-weight:600;">${escape(input.name)}</td></tr>
        <tr><td style="padding:12px 28px;border-bottom:1px solid #1e293b;color:#94a3b8;">Email</td><td style="padding:12px 28px;border-bottom:1px solid #1e293b;"><a href="mailto:${escape(input.email)}" style="color:#60a5fa;text-decoration:none;font-weight:600;">${escape(input.email)}</a></td></tr>
        <tr><td style="padding:12px 28px;border-bottom:1px solid #1e293b;color:#94a3b8;">Trades</td><td style="padding:12px 28px;border-bottom:1px solid #1e293b;">${escape(assetLabel)}</td></tr>
        <tr><td style="padding:12px 28px;border-bottom:1px solid #1e293b;color:#94a3b8;">Experience</td><td style="padding:12px 28px;border-bottom:1px solid #1e293b;">${escape(expLabel)}</td></tr>
        <tr><td style="padding:12px 28px;color:#94a3b8;vertical-align:top;">Pain point</td><td style="padding:12px 28px;line-height:1.55;">${escape(input.painPoint).replace(/\n/g, "<br>")}</td></tr>
      </table>
      <div style="padding:18px 28px;border-top:1px solid #1e293b;background:#0f172a;font-size:12px;color:#64748b;">
        This is the ${ordinal(n)} signup overall.
        <a href="https://supabase.com/dashboard/project/ljnstvgruwougxpqtoyf/editor" style="color:#60a5fa;text-decoration:none;">View all signups →</a>
      </div>
    </div>
  </body>
</html>`.trim();

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [TO_ADDRESS],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[waitlist] Resend send failed", res.status, body);
    }
  } catch (err) {
    console.error("[waitlist] Resend send threw", err);
  }
}

// ── Applicant-facing welcome email ─────────────────────────────────
// First 100 applicants get a "you're in" email with a sign-in link.
// Everyone after gets a "you're on the waitlist" email with no link.
//
// IMPORTANT: Resend's sandbox FROM (onboarding@resend.dev) only delivers
// to the email of the Resend account owner. To deliver to other people
// you must verify a domain in Resend (e.g. traderm8.com). Until then
// these calls return 403/422 from Resend and just log — the admin email
// to banjotomlinson@gmail.com still works fine.
export async function sendApplicantWelcome(input: {
  name: string | null;
  email: string;
  position: number;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[waitlist] RESEND_API_KEY not set — skipping applicant email");
    return;
  }

  const { name, email, position } = input;
  const firstName = name?.split(/\s+/)[0] ?? null;
  const greeting = firstName ? `Hey ${escape(firstName)},` : "Hey,";
  const inCap = position <= FREE_SPOT_CAP;

  const subject = inCap
    ? `🎉 You're in — your TraderM8 spot is ready`
    : `You're on the TraderM8 waitlist (#${position})`;

  let body: { html: string; text: string };
  if (inCap) {
    const remaining = FREE_SPOT_CAP - position;
    const text = [
      greeting,
      "",
      `You're in. Spot #${position} of ${FREE_SPOT_CAP} is yours — locked into the free-for-life founder tier. Every feature, free, forever, no card required.`,
      "",
      "→ Sign in to TraderM8:",
      `   ${APP_URL}/login`,
      "",
      `Sign in with the Google account that uses ${email} so we can match you to your waitlist spot.`,
      "",
      "── A note from Banjo ──",
      "",
      "I built TraderM8 because I was sick of bouncing between five tabs to do",
      "what should be one workflow. After 500+ hours of paid courses and a lot",
      "of blown setups, I distilled the parts that actually move the needle into",
      "a single dashboard. ICT bias, session timing, news that matters, a",
      "journal that doesn't get in your way — all in one place, beside your",
      "charts.",
      "",
      "You're one of the first 100 inside. That means your feedback shapes what",
      "gets built next. Hit the Feedback tab in the sidebar (or visit",
      `${APP_URL}/feedback once you're signed in) and tell me:`,
      "",
      "  • What's missing or broken",
      "  • What you'd build if you could clone yourself",
      "  • What you'd nuke from the dashboard",
      "",
      "I read every single one. Founder tier means you have the loudest voice.",
      "",
      `${remaining} spot${remaining === 1 ? "" : "s"} remaining out of ${FREE_SPOT_CAP}.`,
      "",
      "Trade with your M8,",
      "— Banjo",
      "",
      "PS: Reply to this email any time. It comes straight to my inbox.",
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
        ✓ You&rsquo;re in &middot; Spot #${position} of ${FREE_SPOT_CAP}
      </div>
      <div style="font-size:24px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.01em;margin-bottom:16px;">${greeting}</div>
      <p style="font-size:15px;line-height:1.65;color:#e2e8f0;margin:0 0 14px;">
        Welcome to TraderM8. You&rsquo;re locked into the <strong style="color:#60a5fa;">free-for-life founder tier</strong> — every feature, every update, free, forever, no card required.
      </p>
      <p style="font-size:14px;line-height:1.65;color:#94a3b8;margin:0 0 26px;">
        Sign in with the Google account that uses <strong style="color:#e2e8f0;">${escape(email)}</strong> so we can match you to your waitlist spot.
      </p>
      <div style="text-align:center;margin-bottom:14px;">
        <a href="${APP_URL}/login" style="display:inline-block;background:linear-gradient(180deg,#3b82f6,#1d4ed8);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 36px;border-radius:10px;box-shadow:0 6px 20px rgba(59,130,246,0.35);">
          Sign in to TraderM8 →
        </a>
      </div>
      <div style="text-align:center;margin-bottom:26px;">
        <a href="${APP_URL}" style="font-size:12px;color:#64748b;text-decoration:none;">${APP_URL.replace(/^https?:\/\//, "")}</a>
      </div>
    </div>

    <div style="margin:0 32px;padding:24px 24px 22px;border:1px solid #1e293b;border-radius:12px;background:#0f172a;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#3b82f6;font-weight:700;margin-bottom:10px;">A note from Banjo</div>
      <p style="font-size:14px;line-height:1.7;color:#e2e8f0;margin:0 0 12px;">
        I built TraderM8 because I was sick of bouncing between five tabs to do what should be one workflow. After 500+ hours of paid courses and a lot of blown setups, I distilled the parts that actually move the needle into a single dashboard.
      </p>
      <p style="font-size:14px;line-height:1.7;color:#94a3b8;margin:0;">
        ICT bias, session timing, news that actually matters, a journal that doesn&rsquo;t get in your way &mdash; all beside your charts.
      </p>
    </div>

    <div style="margin:18px 32px 8px;padding:24px 24px 22px;border:1px solid #3b82f6;border-radius:12px;background:linear-gradient(180deg,rgba(59,130,246,0.08),rgba(59,130,246,0.02));">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#60a5fa;font-weight:700;margin-bottom:10px;">Help shape what gets built</div>
      <p style="font-size:14px;line-height:1.65;color:#e2e8f0;margin:0 0 14px;">
        You&rsquo;re one of the first ${FREE_SPOT_CAP} inside &mdash; your feedback genuinely steers the roadmap. Inside the app, hit the <strong style="color:#60a5fa;">Feedback</strong> tab and tell me:
      </p>
      <ul style="margin:0 0 14px;padding:0 0 0 20px;font-size:14px;line-height:1.7;color:#cbd5e1;">
        <li>What&rsquo;s missing or broken</li>
        <li>What you&rsquo;d build if you could clone yourself</li>
        <li>What you&rsquo;d nuke from the dashboard</li>
      </ul>
      <div style="text-align:center;margin-top:18px;">
        <a href="${APP_URL}/feedback" style="display:inline-block;border:1px solid #3b82f6;color:#60a5fa;text-decoration:none;font-weight:600;font-size:13px;padding:10px 22px;border-radius:8px;">
          Leave feedback →
        </a>
      </div>
      <p style="font-size:12px;line-height:1.6;color:#64748b;margin:14px 0 0;text-align:center;">
        I read every single one. Founder tier means you have the loudest voice.
      </p>
    </div>

    <div style="padding:24px 32px 28px;text-align:left;">
      <p style="font-size:14px;line-height:1.65;color:#94a3b8;margin:0 0 4px;">Trade with your M8,</p>
      <p style="font-size:15px;font-weight:700;color:#ffffff;margin:0 0 12px;">&mdash; Banjo</p>
      <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0;">
        PS: Reply to this email any time &mdash; it comes straight to my inbox.<br>
        ${remaining} ${remaining === 1 ? "spot" : "spots"} remaining out of ${FREE_SPOT_CAP}.
      </p>
    </div>

    <div style="padding:18px 32px;border-top:1px solid #1e293b;background:#0a0e17;font-size:11px;color:#475569;text-align:center;">
      You&rsquo;re getting this because you joined the TraderM8 waitlist at <a href="${APP_URL}" style="color:#64748b;text-decoration:none;">traderm8.com</a>.
    </div>
  </div>
</body></html>`.trim();
    body = { html, text };
  } else {
    const text = [
      greeting,
      "",
      `Thanks for joining the TraderM8 waitlist. Right now we're at capacity — the first ${FREE_SPOT_CAP} traders have locked in the free-for-life founder tier and you're #${position} in line.`,
      "",
      "We'll email you the moment a spot opens up — with your sign-in link and everything you need. Nothing else you need to do for now.",
      "",
      "── A note from Banjo ──",
      "",
      "I'm Banjo, the trader who built TraderM8. I'm capping the founder tier",
      "at 100 because I want to actually read every piece of feedback that",
      "comes back from week one and act on it. The moment one of those 100",
      "frees up, you're in.",
      "",
      "In the meantime — keep an eye on your inbox. If you've got a question",
      "or just want to say hi, reply to this email. It hits me directly.",
      "",
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
      <div style="display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#f59e0b;font-weight:700;background:rgba(245,158,11,0.12);padding:5px 11px;border-radius:999px;margin-bottom:18px;">
        Waitlist &middot; Position #${position}
      </div>
      <div style="font-size:24px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.01em;margin-bottom:16px;">${greeting}</div>
      <p style="font-size:15px;line-height:1.65;color:#e2e8f0;margin:0 0 14px;">
        Thanks for joining the TraderM8 waitlist. Right now we&rsquo;re at capacity &mdash; the first ${FREE_SPOT_CAP} traders have locked in the free-for-life founder tier.
      </p>
      <p style="font-size:14px;line-height:1.65;color:#94a3b8;margin:0 0 22px;">
        You&rsquo;re <strong style="color:#e2e8f0;">#${position}</strong> in line. The moment a spot opens, you&rsquo;ll get an email with your sign-in link &mdash; nothing else you need to do for now.
      </p>
    </div>

    <div style="margin:0 32px;padding:24px 24px 22px;border:1px solid #1e293b;border-radius:12px;background:#0f172a;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#3b82f6;font-weight:700;margin-bottom:10px;">A note from Banjo</div>
      <p style="font-size:14px;line-height:1.7;color:#e2e8f0;margin:0 0 12px;">
        I&rsquo;m Banjo, the trader who built TraderM8. I&rsquo;m capping the founder tier at ${FREE_SPOT_CAP} because I want to actually read every piece of feedback from week one and act on it &mdash; the moment one of those spots frees up, you&rsquo;re in.
      </p>
      <p style="font-size:14px;line-height:1.7;color:#94a3b8;margin:0;">
        Got a question or just want to say hi? Reply to this email &mdash; it hits me directly.
      </p>
    </div>

    <div style="padding:24px 32px 28px;text-align:left;">
      <p style="font-size:14px;line-height:1.65;color:#94a3b8;margin:0 0 4px;">Talk soon,</p>
      <p style="font-size:15px;font-weight:700;color:#ffffff;margin:0;">&mdash; Banjo</p>
    </div>

    <div style="padding:18px 32px;border-top:1px solid #1e293b;background:#0a0e17;font-size:11px;color:#475569;text-align:center;">
      You&rsquo;re getting this because you joined the TraderM8 waitlist at <a href="${APP_URL}" style="color:#64748b;text-decoration:none;">traderm8.com</a>.
    </div>
  </div>
</body></html>`.trim();
    body = { html, text };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [email],
        reply_to: TO_ADDRESS,
        subject,
        html: body.html,
        text: body.text,
      }),
    });
    if (!res.ok) {
      const respBody = await res.text();
      console.error("[waitlist] applicant email failed", res.status, respBody);
    }
  } catch (err) {
    console.error("[waitlist] applicant email threw", err);
  }
}
