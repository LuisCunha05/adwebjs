import type { NextConfig } from 'next'

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  cacheComponents: true,
} satisfies NextConfig

export default nextConfig
