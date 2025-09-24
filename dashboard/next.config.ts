import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    // This can help with turbopack and development performance
    optimizePackageImports: ['@supabase/supabase-js']
  }
};

export default nextConfig;
