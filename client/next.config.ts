import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          process.env.NODE_ENV === "production"
            ? "https://pocketlancer.onrender.com/api/:path*"
            : "http://localhost:5001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
