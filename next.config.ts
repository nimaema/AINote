import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep the transformers.js / onnxruntime native bits out of the client bundle;
  // embeddings only ever run in the worker process.
  serverExternalPackages: ["@xenova/transformers", "bullmq", "ioredis"],
  experimental: {
    // Allow large audio blobs through server actions if we ever use them.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
