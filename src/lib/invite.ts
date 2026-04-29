import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-secret-not-for-prod";
}

export function generateInviteToken(email: string): string {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const payload = `${email.toLowerCase()}|${expiry}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyInviteToken(token: string): { email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;
    const [email, expiryStr, sig] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) return null;
    const payload = `${email}|${expiryStr}`;
    const expectedSig = createHmac("sha256", secret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { email };
  } catch {
    return null;
  }
}
