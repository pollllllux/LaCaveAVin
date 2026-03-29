/** @type {import('next').NextConfig} */
const nextConfig = {
  // On désactive le minificateur Rust (SWC) qui fait paniquer ton CPU Ivy Bridge
  swcMinify: false, 
  // On ignore les erreurs de types pour le moment pour que ça lance vite
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
