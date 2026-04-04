/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许开发环境跨域访问的域名
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.199.199'],
  // 兼容内联样式中的Webkit前缀（如-webkit-appearance）
  compiler: {
    styledComponents: true,
  },
  // 禁用严格模式（避免部分事件监听执行两次）
  reactStrictMode: false,
};

module.exports = nextConfig;