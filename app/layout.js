import './globals.css';
import Script from 'next/script';
import ConditionalHeader from './_components/ConditionalHeader';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/config';


export const metadata = {
  // 标题（关键词前置，不超过60字符）
  title: SITE_NAME,

  // 描述（120-150字符，包含核心关键词，吸引点击）
  description: SITE_DESCRIPTION,

  // 关键词（百度友好，5-8个最核心）
  keywords: [
    "在线工具",
    "免费在线工具",
    "实用工具",
    "520工具",
    "在线工具集合",
    "无广告工具",
    "摸鱼聊天室"
  ],

  // 作者 & 网站主题
  authors: [{ name: "520Tool" }],
  creator: "520Tool",
  publisher: "520Tool",

  // 搜索引擎索引规则（允许收录，不允许索引无关页）
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },

  // 图标
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico"
  },

  // 开放图谱（社交分享预览，SEO 加分项）
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "https://www.520tool.cc/",
    siteName: "520Tool",
    locale: "zh_CN",
    type: "website"
  },

  // Twitter 卡片
  twitter: {
    title: SITE_NAME,
    description: "多种免费在线工具，无广告，一键使用",
    card: "summary_large_image",
    site: "@520tool.cc"
  },

  //  canonical 主域名（防止重复收录）
  alternates: {
    canonical: "https://www.520tool.cc/"
  },

  // 百度/搜索引擎友好
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,          // 禁止用户手动缩放
  userScalable: 'no',       // 明确禁止缩放（iOS Safari）
  viewportFit: 'cover',     // 覆盖整个屏幕，改善全面屏设备
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="baidu-site-verification" content="codeva-EDoMZkIETx" />

        <Script
          src="https://hm.baidu.com/hm.js?718b1393e46193d3d0e56f399fc7f266"
          strategy="afterInteractive"
        />
        {/* 防闪烁脚本：在页面渲染前读取 localStorage 设置主题 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const initialTheme = theme || (prefersDark ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', initialTheme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ConditionalHeader />
        {children}
      </body>
    </html>
  );
}