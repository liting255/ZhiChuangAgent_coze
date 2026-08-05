import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["coze-coding-dev-sdk"],
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;