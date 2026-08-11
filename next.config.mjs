/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 开发时允许 localhost / 127.0.0.1 加载 CSS/JS，避免页面变纯文本
  allowedDevOrigins: ['localhost', '127.0.0.1']
};

export default nextConfig;
