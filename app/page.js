import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DailyHot from './_components/DailyHot';

export const dynamic = 'force-dynamic';   // ← 加这一行，禁用缓存

const tools = [
  { id: 'text-heal', icon: '✨', title: '文本治愈排版', desc: 'AI智能优化，让工作邮件/社交媒体/文章更有温度', badge: ['AI'] },
  { id: 'random-chat', icon: '⚧️', title: '随机聊天室', desc: '上班累了吧？来这里遇见陌生的Ta ~', badge: ['New'] },
  { id: 'career', icon: '💼', title: '职场工具箱', desc: 'AI驱动的求职能力诊断与优化平台', badge: ['Beta'] },
  { id: 'drug-calculator', icon: '💊', title: '药品服用次数计算', desc: '临研必备 | 按给药时间/频率精准计算服药次数' },
  { id: 'json-format', icon: '🔧', title: 'JSON格式化', desc: 'JSON美化/压缩/校验，支持高亮显示和元素折叠', badge: ['New'] },
  { id: 'word-count', icon: '📝', title: '字数统计工具', desc: '统计中文、英文、字符数，含空格/不含空格' },
  { id: 'qrcode-generator', icon: '📱', title: '二维码生成器', desc: '输入文字/链接，一键生成二维码，可保存' },
  { id: 'timestamp-convert', icon: '⏰', title: '时间戳转换', desc: 'Unix时间戳与普通日期时间互转' },
  { id: 'case-convert', icon: '🔤', title: '大小写转换', desc: '文本全部大写/小写/首字母大写，一键转换' },
  { id: 'number-case-convert', icon: '🔢', title: '数字大小写转换', desc: '阿拉伯数字转中文大写（财务专用，支持小数）' },
  { id: 'unit-convert', icon: '📏', title: '常用单位换算', desc: '长度/重量/面积换算，支持米/千米/斤/公斤/平方米等' },
];

export default async function Home() {
  const { data: stats } = await supabase
    .from('tool_stats')
    .select('id, use_count');

  const statsMap = stats ? Object.fromEntries(stats.map(s => [s.id, s.use_count])) : {};

  return (
    <div className="container">
      {/* <div className="ad-top">
        <p>【广告位】- 顶部横幅广告</p>
      </div> */}

      <DailyHot />

      <p style={{ margin: '15px 0', color: '#666' }}>精选好用的免费工具，在线即用</p>
      <div className="tools-grid">
        {tools.map(tool => (
          <Link href={`/tools/${tool.id}`} key={tool.id} className="tool-card">
            {tool.badge && (
              <div className="tool-badges">
                {tool.badge.map(b => (
                  <span key={b} className={`tool-badge badge-${b.toLowerCase()}`}>{b}</span>
                ))}
              </div>
            )}
            <div className="tool-icon">{tool.icon}</div>
            <div className="tool-title">{tool.title}</div>
            <div className="tool-desc">{tool.desc}</div>
            <div className="tool-usage-count">使用量： {statsMap[tool.id] || 0} </div>
          </Link>
        ))}
        <Link href="/guestbook" key="guestbook" className="tool-card">
          <div className="tool-badges"><span className="tool-badge badge-hot">Hot</span></div>
          <div className="tool-icon">💬</div>
          <div className="tool-title">留言板</div>
          <div className="tool-desc">欢迎大家留言交流，分享使用体验和建议</div>
        </Link>
        <Link href="#" className="tool-card">
          <div className="tool-icon">➕</div>
          <div className="tool-title">更多工具</div>
          <div className="tool-desc">持续更新中，敬请期待...</div>
        </Link>
      </div>

      {/* <div className="ad-bottom">
        <p>【广告位】- 底部广告</p>
      </div> */}
    </div>
  );
}
