import type { NextConfig } from 'next'

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
agentRules:false,
  experimental: {
    useTypeScriptCli: true,

  },
  logging: {
    browserToTerminal:true,
  }

} satisfies NextConfig

export default nextConfig
