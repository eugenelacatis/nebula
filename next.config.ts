import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  webpack: (config) => {
    config.resolve.alias["react-native-fs"] = false;
    return config;
  },
};

export default nextConfig;
