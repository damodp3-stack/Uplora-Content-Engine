/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@uplora/shared-types'],
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com'],
  },
};

module.exports = nextConfig;
