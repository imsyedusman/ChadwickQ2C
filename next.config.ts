import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    middlewareClientMaxBodySize: 512 * 1024 * 1024, // 512MB
  },
};

export default nextConfig;

// Restarting dev server to release Prisma lock
