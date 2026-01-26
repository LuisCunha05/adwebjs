import type { NextConfig } from "next";

// /api/* é tratado por app/api/[[...path]]/route.ts (proxy com cookies).
// Não usar rewrites aqui para não perder sessão.
const nextConfig: NextConfig = {};

export default nextConfig;
