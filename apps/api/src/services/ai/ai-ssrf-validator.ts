import { promises as dns } from "node:dns";

const DEFAULT_ALLOWED_HOSTS = [
  "api.modelapi.vn",
  "api.groq.com",
  "api.openai.com",
  "openrouter.ai",
  "generativelanguage.googleapis.com",
];

export function isPrivateOrReservedIp(ip: string): boolean {
  const lower = ip.trim().toLowerCase();
  if (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fe80:") ||
    /^f[cd][0-9a-f]{2}:/i.test(lower)
  ) {
    return true;
  }

  const v4 = lower.startsWith("::ffff:") ? lower.slice(7) : lower;
  const parts = v4.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = parts as [number, number, number, number];
  if (a === 127 || a === 0 || a === 10 || (a === 172 && b >= 16 && b <= 31)) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export class AiSsrfValidator {
  static async validateTargetUrl(
    targetUrl: string,
    allowed?: string[]
  ): Promise<{ valid: boolean; resolvedIp?: string; reason?: string }> {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "https:") {
        return { valid: false, reason: "Only HTTPS protocol is permitted" };
      }

      const envHosts =
        process.env.ALLOWED_AI_HOSTS?.split(",")
          .map((h) => h.trim().toLowerCase())
          .filter(Boolean) ?? [];
      const extraAllowed = (allowed ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean);
      const hostSet = new Set([...DEFAULT_ALLOWED_HOSTS, ...envHosts, ...extraAllowed]);
      const host = parsed.hostname.toLowerCase();

      if (!hostSet.has(host)) {
        return { valid: false, reason: `Host ${host} is not in the allowed AI hosts list` };
      }

      const records = await dns.lookup(host, { all: true });
      if (!records || records.length === 0) {
        return { valid: false, reason: "DNS resolution returned no addresses" };
      }

      for (const rec of records) {
        if (isPrivateOrReservedIp(rec.address)) {
          return {
            valid: false,
            resolvedIp: rec.address,
            reason: `Host resolved to forbidden IP: ${rec.address}`,
          };
        }
      }

      const resolvedIp = records[0]?.address;
      return resolvedIp ? { valid: true, resolvedIp } : { valid: true };
    } catch (err) {
      return { valid: false, reason: err instanceof Error ? err.message : "Invalid URL" };
    }
  }
}
