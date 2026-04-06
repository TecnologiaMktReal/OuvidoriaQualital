import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

const DEFAULT_BUCKET = ENV.supabaseStorageBucket ?? "avatars";

const storageClient =
  ENV.supabaseUrl && ENV.supabaseServiceKey
    ? createClient(ENV.supabaseUrl, ENV.supabaseServiceKey)
    : null;

const ensuredBuckets = new Set<string>();

async function ensureBucketExists(bucket: string) {
  if (!storageClient || ensuredBuckets.has(bucket)) return;
  try {
    const { data, error } = await storageClient.storage.getBucket(bucket);
    if (!error && data) {
      ensuredBuckets.add(bucket);
      return;
    }
    const { error: createError } = await storageClient.storage.createBucket(bucket, {
      public: true,
    });
    if (createError) {
      console.error("[Storage] Falha ao criar bucket no Supabase:", createError);
      return;
    }
    ensuredBuckets.add(bucket);
  } catch (err) {
    console.error("[Storage] Erro ao garantir bucket do Supabase:", err);
  }
}

function buildKey(pathHint?: string, mimeType?: string) {
  const ext = mimeType?.split("/")[1] ?? "png";
  const base = pathHint?.replace(/^\/+/, "").replace(/\s+/g, "-") || `${Date.now()}`;
  return `${base}.${ext}`;
}

function toBufferFromBase64(dataUrl: string): Buffer {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop()! : dataUrl;
  return Buffer.from(base64, "base64");
}

export async function uploadToSupabaseStorage(opts: {
  bucket?: string;
  base64Data: string;
  mimeType: string;
  pathHint?: string;
  upsert?: boolean;
}): Promise<string | null> {
  if (!storageClient) {
    console.warn("[Storage] Supabase Storage não está configurado.");
    return null;
  }

  const bucket = opts.bucket ?? DEFAULT_BUCKET;
  await ensureBucketExists(bucket);
  if (!ensuredBuckets.has(bucket)) return null;

  const key = buildKey(opts.pathHint, opts.mimeType);
  const buffer = toBufferFromBase64(opts.base64Data);

  const { error } = await storageClient.storage
    .from(bucket)
    .upload(key, buffer, { contentType: opts.mimeType, upsert: opts.upsert ?? true });

  if (error) {
    console.error("[Storage] Falha ao enviar arquivo para Supabase:", error);
    return null;
  }

  const { data } = storageClient.storage.from(bucket).getPublicUrl(key);
  return data?.publicUrl ?? null;
}

export async function uploadAvatarToSupabase(
  base64Data: string,
  mimeType: string
): Promise<string | null> {
  return uploadToSupabaseStorage({
    base64Data,
    mimeType,
    bucket: DEFAULT_BUCKET,
    pathHint: `${DEFAULT_BUCKET}/${Date.now()}-${Math.random().toString(36).slice(2)}`,
    upsert: false,
  });
}



