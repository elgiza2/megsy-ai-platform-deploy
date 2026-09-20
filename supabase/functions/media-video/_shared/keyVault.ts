import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type VaultKey = { id: string; key: string };
let client: any;

function db() {
  return (client ??= createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  ));
}

async function decrypt(ciphertext: string, iv: string) {
  const secret = Deno.env.get("KEY_VAULT_SECRET")?.trim();
  if (!secret) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
  try {
    return new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: Uint8Array.from(atob(iv), (x) => x.charCodeAt(0)) },
        key,
        Uint8Array.from(atob(ciphertext), (x) => x.charCodeAt(0)),
      ),
    );
  } catch {
    return null;
  }
}

export async function vaultKeys(provider: string, limit = 10): Promise<VaultKey[]> {
  const { data } = await db()
    .from("service_keys")
    .select("id,key_cipher,key_iv")
    .eq("provider", provider)
    .eq("status", "active")
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  const result: VaultKey[] = [];
  for (const row of data ?? []) {
    const key = await decrypt(row.key_cipher, row.key_iv);
    if (key) result.push({ id: row.id, key });
  }
  if (result.length === 0) {
    const { data: providerRows } = await db()
      .from("provider_api_keys")
      .select("id,api_key")
      .eq("provider", provider)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit);
    for (const row of providerRows ?? []) {
      if (row.api_key) result.push({ id: row.id, key: row.api_key });
    }
  }
  return result;
}

export async function noteKeyOk(id: string) {
  await db()
    .from("service_keys")
    .update({ fail_count: 0, last_error: null, last_used_at: new Date().toISOString() })
    .eq("id", id);
}

export async function noteKeyFail(id: string, error: string) {
  const { data } = await db().from("service_keys").select("fail_count").eq("id", id).maybeSingle();
  const failCount = Number(data?.fail_count || 0) + 1;
  await db()
    .from("service_keys")
    .update({
      fail_count: failCount,
      status: failCount >= 3 ? "banned" : "active",
      last_error: error.slice(0, 400),
      banned_at: failCount >= 3 ? new Date().toISOString() : null,
    })
    .eq("id", id);
}
