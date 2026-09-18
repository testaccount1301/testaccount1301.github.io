/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // This tells Vercel to ignore linting errors during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This tells Vercel to ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
