import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { Readable } from "node:stream";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";

export const BUCKET = process.env.S3_BUCKET ?? "glacianav-audio";

// MinIO speaks S3 with path-style addressing.
export const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

// Streamed upload — the audio body never has to be fully buffered in memory.
export async function putObject(
  key: string,
  body: Readable | Buffer | Uint8Array,
  contentType?: string
) {
  const upload = new Upload({
    client: s3,
    params: { Bucket: BUCKET, Key: key, Body: body, ContentType: contentType },
  });
  await upload.done();
  return key;
}

// Returns the object as a Node stream (used to proxy audio playback through the
// app). Passing an HTTP Range yields a partial response so the browser can seek.
export async function getObjectStream(key: string, range?: string) {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: range })
  );
  return {
    body: res.Body as Readable,
    contentType: res.ContentType,
    contentLength: res.ContentLength,
    contentRange: res.ContentRange,
  };
}

export async function removeObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
