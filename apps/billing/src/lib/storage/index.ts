import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for storage operations");
  }
  return createClient(url, key);
}

export async function uploadBufferToStorage(path: string, buffer: Uint8Array, contentType: string): Promise<string> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "billing-documents";
  const client = getSupabaseClient();

  const { error } = await client.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
