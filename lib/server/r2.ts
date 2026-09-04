import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  throw new Error("Thiếu cấu hình Cloudflare R2 (R2_*) trong file .env.");
}

const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function extOf(name: string): string {
  const m = /\.[a-zA-Z0-9]+$/.exec(name);
  return m ? m[0].toLowerCase() : "";
}

/** Upload 1 file lên R2, trả về URL public (đã lưu thẳng vào cột assets.file_path). */
export async function uploadFileToR2(
  ideaId: number,
  file: File
): Promise<{ url: string; key: string }> {
  const key = `ideas/${ideaId}/${randomUUID()}${extOf(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })
  );
  return { url: `${R2_PUBLIC_URL}/${key}`, key };
}

/** Xoá file trên R2 dựa vào URL public đã lưu trong DB. */
export async function deleteFileFromR2(publicUrl: string): Promise<void> {
  if (!publicUrl.startsWith(R2_PUBLIC_URL!)) return; // không phải file của R2 (vd. URL ngoài) -> bỏ qua
  const key = publicUrl.slice(R2_PUBLIC_URL!.length + 1);
  if (!key) return;
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}
