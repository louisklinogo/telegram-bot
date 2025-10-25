import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zvatkstmsyuytbajzuvn.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  experimental: {
    // PPR disabled - requires Next.js canary, we're on stable 15.5.4
    // Will enable when PPR is stable in Next.js 16+
    // ppr: 'incremental',

    // Optimize package imports for smaller bundles
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "recharts",
      "framer-motion",
      "@tanstack/react-query",
    ],
  },
};

export default nextConfig;
