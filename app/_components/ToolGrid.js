'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPrefs, DEFAULT_TOOL_ORDER } from '@/lib/user-prefs';

export default function ToolGrid({ tools, statsMap }) {
  const [sortedTools, setSortedTools] = useState(tools);

  useEffect(() => {
    const prefs = getPrefs();

    const ordered = [...tools].sort((a, b) => {
      const indexA = prefs.tool_order.indexOf(a.id);
      const indexB = prefs.tool_order.indexOf(b.id);

      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });

    const visible = ordered.filter(t => !prefs.tool_hidden.includes(t.id));
    setSortedTools(visible);
  }, []);

  return (
    <div className="tools-grid">
      {sortedTools.map(tool => (
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
  );
}
