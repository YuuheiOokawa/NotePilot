/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ws をwebpackにバンドルさせない（バンドルすると bufferUtil.mask エラーになる）
    serverComponentsExternalPackages: ["ws", "@neondatabase/serverless"],
  },
};

export default nextConfig;
