// Sends an admin notification email when someone joins the waitlist.
// Backed by Resend (https://resend.com). Falls back to a console log when
// RESEND_API_KEY isn't configured so local development never blocks on it.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_ADDRESS = "TraderM8 Waitlist <onboarding@resend.dev>";
const TO_ADDRESS = "banjotomlinson@gmail.com";
const FREE_SPOT_CAP = 100;

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
