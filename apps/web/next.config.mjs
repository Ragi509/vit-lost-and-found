/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@vit/ui", "@vit/config"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
