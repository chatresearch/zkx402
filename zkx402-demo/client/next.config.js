/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      porto: false,
      'porto/internal': false,
      '@react-native-async-storage/async-storage': false,
    };

    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Ignore porto module completely
    config.resolve.alias = {
      ...config.resolve.alias,
      porto: false,
      'porto/internal': false,
      '@react-native-async-storage/async-storage': false,
    };

    return config;
  },
  transpilePackages: ['wagmi', '@wagmi/connectors', '@wagmi/core'],
};

module.exports = nextConfig;
