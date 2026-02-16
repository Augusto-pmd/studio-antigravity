/** @type {import('next').NextConfig} */
const { loadEnvConfig } = require('@next/env');

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY || "AlzaSyAjWVuu25cJ6pqRZGVFayaAzo6UkJuJA_A",
  },
};

module.exports = nextConfig;
