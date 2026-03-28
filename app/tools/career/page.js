'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function CareerHub() {
  useEffect(() => {
    fetch('/api/stats/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: 'career' })
    }).catch(() => {});
  }, []);

  return (
    <div className="career-hub">
      <div className="career-header">
        <h1 className="career-title">💼 职场工具箱</h1>
        <p className="career-subtitle">
          AI驱动的求职能力诊断与优化平台
        </p>
      </div>

      <div className="career-tools-grid">
        {/* 求职体检 */}
        <Link href="/tools/career/career-checkup" className="career-tool-card">
          <div className="career-tool-icon">🩺</div>
          <h3 className="career-tool-name">求职体检</h3>
          <p className="career-tool-desc">
            AI诊断求职准备度，简历润色+洞察+专属报告
          </p>
          <div className="career-tool-status">
            <span className="status-badge status-available">立即使用</span>
          </div>
        </Link>

        {/* 占位卡片 - 面试模拟 */}
        <div className="career-tool-card career-tool-disabled">
          <div className="career-tool-icon">📝</div>
          <h3 className="career-tool-name">面试模拟</h3>
          <p className="career-tool-desc">AI模拟面试官，真实场景演练</p>
          <div className="career-tool-status">
            <span className="status-badge status-locked">即将上线</span>
          </div>
        </div>

        {/* 占位卡片 - 薪资谈判助手 */}
        <div className="career-tool-card career-tool-disabled">
          <div className="career-tool-icon">💰</div>
          <h3 className="career-tool-name">薪资谈判助手</h3>
          <p className="career-tool-desc">基于市场数据的薪资评估与谈判策略</p>
          <div className="career-tool-status">
            <span className="status-badge status-locked">即将上线</span>
          </div>
        </div>

        {/* 占位卡片 - 行业趋势 */}
        <div className="career-tool-card career-tool-disabled">
          <div className="career-tool-icon">📊</div>
          <h3 className="career-tool-name">行业趋势</h3>
          <p className="career-tool-desc">各行业薪资水平与发展前景分析</p>
          <div className="career-tool-status">
            <span className="status-badge status-locked">即将上线</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .career-hub {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .career-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .career-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .career-subtitle {
          font-size: 1.1rem;
          color: #666;
        }

        .career-tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .career-tool-card {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          padding: 2rem 1.5rem;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .career-tool-card:not(.career-tool-disabled):hover {
          border-color: #3498db;
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(52, 152, 219, 0.15);
        }

        .career-tool-disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .career-tool-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .career-tool-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 0.75rem;
        }

        .career-tool-desc {
          font-size: 0.95rem;
          color: #666;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .status-badge {
          display: inline-block;
          padding: 0.4rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .status-available {
          background: #e8f5e9;
          color: #4caf50;
        }

        .status-locked {
          background: #f5f5f5;
          color: #999;
        }

        @media (max-width: 768px) {
          .career-title {
            font-size: 2rem;
          }

          .career-tools-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
