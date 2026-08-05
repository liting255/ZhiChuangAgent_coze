import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["coze-coding-dev-sdk"],
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
  // Increase body size limit for API routes
  httpAgentOptions: {
    keepAlive: true,
  },
};

export default nextConfig;
