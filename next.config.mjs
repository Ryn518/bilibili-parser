/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 允许 127.0.0.1 访问 dev 静态资源（CSS/JS），避免页面无样式
  allowedDevOrigins: ['127.0.0.1']
};

export default nextConfig;
