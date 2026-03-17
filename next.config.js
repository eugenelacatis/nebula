/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.glsl$/,
      type: 'asset/source',
    });

    // Ignore React Native modules in web build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'react-native-fs': false,
        'react-native': false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
