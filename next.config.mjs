/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // This tells Vercel to ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
