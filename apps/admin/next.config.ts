import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ["lucide-react", "@/components/ui"],
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
};

export default nextConfig;
