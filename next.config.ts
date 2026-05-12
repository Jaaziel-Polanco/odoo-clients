import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["xmlrpc", "postgres", "node-cron"],
};

export default nextConfig;
