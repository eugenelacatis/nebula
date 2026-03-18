import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.glsl$/,
      use: 'raw-loader',
    });
    // jsmediatags tries to import react-native-fs which doesn't exist in browser
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native-fs': false,
    };
    return config;
  },
};

export default nextConfig;
