import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` otherwise appends a "nextjs-agent-rules" block to CLAUDE.md on
  // every run. CLAUDE.md is a hand-maintained project document here, so the
  // injector stays off. Next.js 16 docs remain readable at
  // node_modules/next/dist/docs/.
  agentRules: false,
};

export default nextConfig;
