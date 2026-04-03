import './globals.css';
import Script from 'next/script';
import FlipClock from './_components/FlipClock';
import DailyQuote from './_components/DailyQuote';
import ThemeToggle from './_components/ThemeToggle'; 

export const metadata = {
  // 标题（关键词前置，不超过60字符）
  title: "520Tool - 免费在线实用工具大全 | 在线工具集合",

  // 描述（120-150字符，包含核心关键词，吸引点击）
  description: "520Tool 提供免费无广告在线实用工具，包含文本润色、简历辅助、二维码生成、格式转换、计算查询、开发辅助等，还有摸鱼聊天室，一键使用，无需下载，持续更新。",

  // 关键词（百度友好，5-8个最核心）
  keywords: [
    "在线工具",
    "免费在线工具",
    "实用工具",
    "工具大全",
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
    title: "520Tool - 免费在线实用工具大全",
    description: "多种免费在线工具，无广告，无需登录，一键使用，无需下载",
    url: "https://www.520tool.cc/",
    siteName: "520Tool",
    locale: "zh_CN",
    type: "website"
  },

  // Twitter 卡片
  twitter: {
    title: "520Tool - 免费在线实用工具大全",
    description: "多种免费在线工具，无广告，一键使用",
    card: "summary_large_image",
    site: "@520tool"
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
        <header>
          <div className="header-container">
            <div className="header-main">
              <a href="/" className="logo">
                <span className="logo-brand">520</span>
                <span className="logo-text">tool.cc</span>
              </a>
              <FlipClock />
            </div>
            {/* <span 
              className="header-tag" 
              style={{ 
                fontFamily: "system-ui, -apple-system, sans-serif, emoji",
                fontVariantEmoji: "emoji"
              }}
            >
              🆓 easy to use
            </span> */}
            <DailyQuote />
            
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}