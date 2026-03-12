export async function computeJazzCashHash(
  params: Record<string, string>,
  salt: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(salt);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sortedKeys = Object.keys(params)
    .filter((k) => params[k] !== "")
    .sort();
  const valueString = `${salt}&${sortedKeys.map((k) => params[k]).join("&")}`;
  const data = encoder.encode(valueString);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export function formatJazzCashDateTime(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${mo}${d}${h}${mi}${s}`;
}

export function generateTxnRef(): string {
  return `T${formatJazzCashDateTime(new Date())}`;
}
