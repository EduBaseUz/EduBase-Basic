/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // We rely on `tsc` for type safety; skip eslint during production builds.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
