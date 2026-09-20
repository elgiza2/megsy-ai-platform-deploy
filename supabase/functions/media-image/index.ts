import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function ratio(aspect?: string) {
  if (aspect === "9:16") return "768:1360";
  if (aspect === "16:9") return "1360:768";
  return "1024:1024";
}

function firstImage(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  if (typeof value === "string" && /^https?:\/\/\S+/.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = firstImage(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const hit = firstImage(item, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

async function runwayKey() {
  const { data } = await db
    .from("provider_api_keys")
    .select("api_key")
    .eq("provider", "runway")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.api_key ? String((data as any).api_key) : null;
}

async function generateRunway(
  key: string,
  prompt: string,
  model: string,
  aspect?: string,
  refs: string[] = [],
) {
  const body: Record<string, unknown> = {
    model,
    promptText: prompt,
    ratio: ratio(aspect),
    referenceImages: refs.map((uri) => ({ uri })),
  };

  const create = await fetch("https://api.dev.runwayml.com/v1/text_to_image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "X-Runway-Version": "2024-11-06",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const createText = await create.text();
  if (!create.ok) throw new Error(`Runway image ${create.status}: ${createText.slice(0, 400)}`);
  const task = JSON.parse(createText);
  if (!task?.id) throw new Error("Runway image returned no task id");

  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${task.id}`, {
      headers: { Authorization: `Bearer ${key}`, "X-Runway-Version": "2024-11-06" },
    });
    const status: any = await statusResponse.json().catch(() => null);
    const state = String(status?.status ?? "").toUpperCase();
    if (state === "SUCCEEDED") {
      const url = firstImage(status?.output ?? status);
      if (!url) throw new Error("Runway image completed without an image URL");
      return url;
    }
    if (["FAILED", "CANCELED", "CANCELLED"].includes(state)) {
      throw new Error(`Runway image task ${state}: ${JSON.stringify(status).slice(0, 400)}`);
    }
  }
  throw new Error("Runway image timed out waiting for output");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return out({ error: true, message: "invalid json" }, 400);
  }

  const prompt = String(body?.prompt ?? "").trim();
  if (!prompt) return out({ error: true, message: "prompt is required" }, 400);

  const slug = String(body?.model_slug ?? "runway-gen4-image-turbo");
  if (!/runway|gen4_image_turbo/i.test(slug)) {
    return out({ error: true, message: "This compatibility endpoint supports Runway image models only." }, 400);
  }

  const key = await runwayKey();
  if (!key) return out({ error: true, message: "No active Runway key configured." }, 503);

  const model = slug.includes("gen4") ? "gen4_image_turbo" : slug.replace(/^runway-/, "");
  const rawRefs = body?.reference_image_urls ?? body?.reference_image_url ?? body?.image_url;
  const refs = (Array.isArray(rawRefs) ? rawRefs : rawRefs ? [rawRefs] : [])
    .map((item) => String(item))
    .filter((item) => /^https?:\/\//.test(item));

  try {
    const url = await generateRunway(key, prompt, model, body?.aspect_ratio, refs);
    return out({ image_url: url, image_urls: [url], url, provider: "runway", model_slug: slug });
  } catch (error) {
    return out(
      { error: true, message: error instanceof Error ? error.message : "Runway image failed" },
      502,
    );
  }
});
