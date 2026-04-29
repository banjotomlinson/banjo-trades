import { generateInviteToken } from "@/lib/invite";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_ADDRESS = "TraderM8 <hello@traderm8.com>";
const REPLY_TO = "banjotomlinson@gmail.com";
const APP_URL = "https://traderm8.com";

function escape(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendInviteEmail(input: {
  name: string | null;
  email: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[invite] RESEND_API_KEY not set — skipping invite email", input.email);
    return;
  }

  const token = generateInviteToken(input.email);
  const signupUrl = `${APP_URL}/signup?token=${token}`;
  const firstName = input.name?.split(/\s+/)[0] ?? null;
  const greeting = firstName ? `Hey ${escape(firstName)},` : "Hey,";

  const subject = "🎉 Your TraderM8 spot is ready — create your account";

  const text = [
    greeting,
    "",
    "You've been approved for TraderM8. Your spot is locked in — free for life, every feature, no card required.",
    "",
    "Create your account here:",
    `  ${signupUrl}`,
    "",
    "This link expires in 7 days.",
    "",
    "── A note from Banjo ──",
    "",
    "I built TraderM8 because I was sick of bouncing between five tabs to do",
    "what should be one workflow. Bias cards, session levels, sizing in three",
    "inputs, a journal that actually tells the truth — all beside your charts.",
    "",
    "You're one of the first 100 inside. Hit the Feedback tab once you're in",
    "and tell me what's working and what isn't. I read every single one.",
    "",
    "Trade with your M8,",
    "— Banjo",
    "",
    "PS: Reply to this email any time — it comes straight to my inbox.",
  ].join("\n");

  const html = `
<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0e17;color:#e2e8f0;margin:0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #1e293b;border-radius:14px;overflow:hidden;">

    <div style="padding:32px 32px 24px;border-bottom:1px solid #1e293b;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">
        Trader<span style="color:#3b82f6;">M8</span>
      </div>
      <div style="margin-top:6px;font-size:13px;color:#64748b;">Your mate of the market</div>
    </div>

    <div style="padding:32px 32px 24px;">
      <div style="display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#22c55e;font-weight:700;background:rgba(34,197,94,0.12);padding:5px 12px;border-radius:999px;border:1px solid rgba(34,197,94,0.2);margin-bottom:20px;">
        ✓ You're approved
      </div>
      <div style="font-size:24px;font-weight:700;color:#ffffff;line-height:1.25;margin-bottom:16px;">
        ${greeting}
      </div>
      <p style="font-size:15px;line-height:1.65;color:#e2e8f0;margin:0 0 12px;">
        Welcome to TraderM8. Your spot is locked in — <strong style="color:#60a5fa;">free for life</strong>, every feature, every update, no card ever required.
      </p>
      <p style="font-size:14px;line-height:1.65;color:#94a3b8;margin:0 0 28px;">
        Click below to create your account. It takes about 30 seconds.
      </p>
      <div style="text-align:center;margin-bottom:12px;">
        <a href="${signupUrl}" style="display:inline-block;background:linear-gradient(180deg,#3b82f6,#1d4ed8);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 40px;border-radius:10px;box-shadow:0 6px 20px rgba(59,130,246,0.35);">
          Create my account →
        </a>
      </div>
      <p style="text-align:center;font-size:12px;color:#475569;margin:0 0 28px;">
        Link expires in 7 days &middot; <a href="${signupUrl}" style="color:#64748b;">${signupUrl.replace(/^https?:\/\//, "").slice(0, 50)}…</a>
      </p>
    </div>

    <div style="margin:0 32px 24px;padding:24px;border:1px solid #1e293b;border-radius:12px;background:#0f172a;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#3b82f6;font-weight:700;margin-bottom:10px;">A note from Banjo</div>
      <p style="font-size:14px;line-height:1.7;color:#e2e8f0;margin:0 0 10px;">
        I built TraderM8 because I was sick of bouncing between five tabs to do what should be one workflow. After 500+ hours of paid courses, I distilled what actually moves the needle into a single dashboard.
      </p>
      <p style="font-size:14px;line-height:1.7;color:#94a3b8;margin:0;">
        You're one of the first 100 inside — your feedback shapes what gets built next. Hit the <strong style="color:#e2e8f0;">Feedback</strong> tab once you're in. I read every single one.
      </p>
    </div>

    <div style="padding:20px 32px 28px;">
      <p style="font-size:14px;line-height:1.65;color:#94a3b8;margin:0 0 4px;">Trade with your M8,</p>
      <p style="font-size:15px;font-weight:700;color:#ffffff;margin:0 0 10px;">&mdash; Banjo</p>
      <p style="font-size:12px;color:#64748b;margin:0;">PS: Reply to this email any time &mdash; it comes straight to my inbox.</p>
    </div>

    <div style="padding:18px 32px;border-top:1px solid #1e293b;background:#0a0e17;font-size:11px;color:#475569;text-align:center;">
      You're getting this because you applied for early access at
      <a href="${APP_URL}" style="color:#64748b;text-decoration:none;">traderm8.com</a>.
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
        to: [input.email],
        reply_to: REPLY_TO,
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[invite] Resend failed", res.status, body);
    }
  } catch (err) {
    console.error("[invite] Resend threw", err);
  }
}
