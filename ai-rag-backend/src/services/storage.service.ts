import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "documents";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase Storage environment variables are missing");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadPdf(
  filePath: string,
  fileBuffer: Buffer,
  contentType = "application/pdf",
) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }

  return data;
}

export async function downloadPdf(filePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(filePath);

  if (error) {
    throw new Error(`Failed to download PDF: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function deletePdf(filePath: string) {
  const { error } = await supabase.storage.from(bucketName).remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}
