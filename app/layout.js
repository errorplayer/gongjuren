import './globals.css';
import Script from 'next/script';
import FlipClock from './_components/FlipClock';
import DailyQuote from './_components/DailyQuote'; 

export const metadata = {
  title: '实用小工具合集 - 免费好用的日常工具',
  keywords: '实用小工具,字数统计,二维码生成,时间戳转换,免费工具',
  description: '免费好用的实用小工具合集，包含字数统计、二维码生成、时间戳转换等工具，无需下载，在线即用！',
  charset: 'UTF-8',
  viewport: 'width=device-width, initial-scale=1.0',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <Script
          src="https://hm.baidu.com/hm.js?718b1393e46193d3d0e56f399fc7f266"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <header>
          <div className="header-container">
            <div className="header-main">
              <a href="/" className="logo">实用小工具合集</a>
              <FlipClock />
            </div>
            <span 
              className="header-tag" 
              style={{ 
                fontFamily: "system-ui, -apple-system, sans-serif, emoji",
                fontVariantEmoji: "emoji"
              }}
            >
              🆓 easy to use
            </span><DailyQuote />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}