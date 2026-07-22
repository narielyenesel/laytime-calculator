/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false };
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^canvas$/ }));
    return config;
  },
};

module.exports = nextConfig;
