import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  async rewrites() {
    // Keep the Keycloak issuer reachable at the same URL from both the browser
    // and the Next.js container; Docker resolves "keycloak" internally.
    return [{ source: "/idp/:path*", destination: "http://keycloak:8080/idp/:path*" }];
  },
};

export default nextConfig;
