import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "@/lib/security/headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
    "ioredis",
    "node-cron",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/(.*)",
        headers: Object.entries(SECURITY_HEADERS)
          .filter(([key]) =>
            process.env.NODE_ENV === "production" ||
            key !== "Strict-Transport-Security",
          )
          .map(([key, value]) => ({ key, value })),
      },
    ];
  },
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;
