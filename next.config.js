/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // 流式API路由需要更大的响应限制
  experimental: {},
};

module.exports = nextConfig;
