import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep the transformers.js / onnxruntime native bits out of the client bundle;
  // embeddings only ever run in the worker process.
  serverExternalPackages: ["@xenova/transformers", "bullmq", "ioredis"],
  experimental: {
    // Allow large audio blobs through server actions if we ever use them.
    serverActions: { bodySizeLimit: "300mb" },
    // Allow large uploads to pass through middleware without being truncated.
    // Default is 10mb; we match the 300 MB cap from the recordings route.
    proxyClientMaxBodySize: "300mb",
  },
};

export default nextConfig;
