'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 生成 modules 的内容指纹，用于判断是否需要重新生成报告
const getModulesFingerprint = (modules) => {
  const fingerprintData = {
    project_experience: modules.project_experience.items.map(item => ({
      id: item.id,
      confirmed: item.confirmed
    })),
    work_responsibility: modules.work_responsibility.confirmed,
    self_evaluation: modules.self_evaluation.confirmed,
    cover_letter: modules.cover_letter.confirmed,
  };
  return JSON.stringify(fingerprintData);
};

export default function CareerReport() {
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      const sessionData = localStorage.getItem('career-checkup-session');
      if (!sessionData) {
        throw new Error('未找到会话数据，请先完成各模块润色');
      }

      const data = JSON.parse(sessionData);
      const currentFingerprint = getModulesFingerprint(data.modules);

      // 检查缓存
      const cachedReport = localStorage.getItem('career-checkup-report-cache');
      if (cachedReport) {
        const cache = JSON.parse(cachedReport);
        if (cache.modulesFingerprint === currentFingerprint) {
          // 缓存有效，直接使用
          setReport(cache.report);
          setGeneratedAt(cache.generatedAt);
          setLoading(false);
          return;
        }
      }

      // 缓存无效或不存在，调用 API 生成
      const response = await fetch('/api/career-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: data.profile,
          modules: data.modules,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setReport(result.result);
        const now = Date.now();
        setGeneratedAt(now);

        // 保存到缓存
        const newCache = {
          report: result.result,
          modulesFingerprint: currentFingerprint,
          generatedAt: now,
        };
        localStorage.setItem('career-checkup-report-cache', JSON.stringify(newCache));
      } else {
        throw new Error(result.error || '生成报告失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    alert('报告已复制到剪贴板');
  };

  const handleRegenerate = () => {
    setReport(null);
    setLoading(true);
    setError(null);
    generateReport();
  };

  const parseReport = (text) => {
    // 先尝试 === 标题 === 格式
    const equalsSections = text.split(/===\s*(.*?)\s*===/);
    const equalsResult = [];

    for (let i = 1; i < equalsSections.length; i += 2) {
      const sectionName = equalsSections[i]?.trim();
      const sectionContent = equalsSections[i + 1]?.trim() || '';
      if (sectionName) {
        equalsResult.push({
          name: sectionName,
          content: sectionContent,
        });
      }
    }

    // 如果用 === 解析出有效 sections，直接返回
    if (equalsResult.length > 0) {
      return equalsResult;
    }

    // fallback: 按 ## 标题解析
    const headerRegex = /^##\s+(.+)$/gm;
    const matches = [...text.matchAll(headerRegex)];
    const markdownResult = [];

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const name = matches[i][1].trim();
        const start = matches[i].index + matches[i][0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const content = text.slice(start, end).trim();
        if (name) {
          markdownResult.push({ name, content });
        }
      }
    }

    // 如果仍然解析不出任何 section，把整个文本作为一个 section
    if (markdownResult.length === 0 && text.trim()) {
      markdownResult.push({ name: '求职体检报告', content: text.trim() });
    }

    return markdownResult;
  };

  if (loading) {
    return (
      <div className="report-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>正在生成体检报告，请稍候...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>生成报告失败</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <Link
              href="/tools/career/career-checkup/report-preview"
              className="back-button"
            >
              ← 返回确认页
            </Link>
            <button className="retry-button" onClick={handleRegenerate}>
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sections = parseReport(report);

  return (
    <div className="report-page">
      <div className="report-header">
        <Link
          href="/tools/career/career-checkup"
          className="back-link" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'linear-gradient(90deg, #764ba2 0%, #d2d8f3 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '20px',
            fontWeight: 500,
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
          }}
        >
          ← 返回首页
        </Link>
        <h1 className="report-title">🩺 求职体检报告</h1>
        <p className="report-subtitle">
          基于您的求职信息生成的综合诊断报告
        </p>
      </div>

      <div className="report-actions">
        <button className="action-button copy-button" onClick={handleCopy}>
          📋 复制报告
        </button>
        <button
          className="action-button regenerate-button"
          onClick={handleRegenerate}
        >
          🔄 重新生成
        </button>
      </div>

      <div className="report-content">
        {sections.map((section, index) => (
          <div key={index} className="report-section">
            <h2 className="section-title">
              <span className="section-number">{index + 1}</span>
              {section.name}
            </h2>
            <div className="section-content report-text">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      <div className="report-footer">
        <p>报告生成时间：{generatedAt ? new Date(generatedAt).toLocaleString('zh-CN') : '-'}</p>
        <p>
          温馨提示：报告内容仅供参考，请结合自身情况综合判断
        </p>
      </div>

      <style jsx>{`
        .report-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 1rem;
          gap: 1.5rem;
        }

        .loading-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #e0e0e0;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-container p {
          font-size: 1.1rem;
          color: #666;
        }

        .error-container {
          text-align: center;
          padding: 4rem 2rem;
        }

        .error-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }

        .error-container h2 {
          font-size: 1.8rem;
          color: #1a1a1a;
          margin-bottom: 1rem;
        }

        .error-message {
          color: #666;
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }

        .error-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .back-button {
          display: inline-block;
          padding: 0.75rem 2rem;
          background: #f0f0f0;
          color: #333;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
        }

        .retry-button {
          padding: 0.75rem 2rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .retry-button:hover {
          background: #5568d3;
        }

        .report-header {
          margin-bottom: 2rem;
        }

        .back-link {
          display: inline-block;
          color: #667eea;
          text-decoration: none;
          margin-bottom: 1rem;
          font-weight: 500;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .report-title {
          font-size: 2.2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .report-subtitle {
          color: #666;
          font-size: 1.1rem;
        }

        .report-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .action-button {
          flex: 1;
          min-width: 150px;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .copy-button {
          background: #3498db;
          color: white;
        }

        .copy-button:hover {
          background: #2980b9;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
        }

        .regenerate-button {
          background: #f39c12;
          color: white;
        }

        .regenerate-button:hover {
          background: #e67e22;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(243, 156, 18, 0.4);
        }

        .report-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .report-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border-left: 4px solid #667eea;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.4rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: #1a1a1a;
        }

        .section-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
          font-weight: 700;
          font-size: 1rem;
        }

        .section-content {
          line-height: 1.8;
          color: #333;
        }

        .report-text :global(h1),
        .report-text :global(h2),
        .report-text :global(h3),
        .report-text :global(h4),
        .report-text :global(h5),
        .report-text :global(h6) {
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #1a1a1a;
        }

        .report-text :global(h1) {
          font-size: 1.5rem;
        }

        .report-text :global(h2) {
          font-size: 1.4rem;
        }

        .report-text :global(h3) {
          font-size: 1.3rem;
        }

        .report-text :global(h4) {
          font-size: 1.2rem;
        }

        .report-text :global(p) {
          margin: 0.75rem 0;
          line-height: 1.8;
        }

        .report-text :global(ul),
        .report-text :global(ol) {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }

        .report-text :global(li) {
          margin: 0.5rem 0;
          line-height: 1.7;
        }

        .report-text :global(strong) {
          font-weight: 700;
          color: #1a1a1a;
        }

        .report-text :global(em) {
          font-style: italic;
        }

        .report-text :global(blockquote) {
          margin: 1rem 0;
          padding: 0.5rem 1rem;
          border-left: 4px solid #667eea;
          background: #f8f9fa;
          color: #555;
        }

        .report-text :global(code) {
          background: #f4f4f4;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9em;
          font-family: 'Courier New', monospace;
        }

        .report-text :global(pre) {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .report-text :global(pre code) {
          background: transparent;
          padding: 0;
          color: inherit;
        }

        .report-text :global(a) {
          color: #667eea;
          text-decoration: none;
        }

        .report-text :global(a:hover) {
          text-decoration: underline;
        }

        .report-text :global(table) {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 0.95rem;
        }

        .report-text :global(thead) {
          background: #f0f2ff;
        }

        .report-text :global(th) {
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: #1a1a1a;
          border: 1px solid #e0e0e0;
        }

        .report-text :global(td) {
          padding: 0.75rem 1rem;
          border: 1px solid #e0e0e0;
          color: #333;
        }

        .report-text :global(tbody tr:nth-child(even)) {
          background: #fafbfe;
        }

        .report-text :global(tbody tr:hover) {
          background: #f0f2ff;
        }

        .report-footer {
          margin-top: 3rem;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
          text-align: center;
          color: #666;
          font-size: 0.9rem;
        }

        .report-footer p {
          margin: 0.5rem 0;
        }

        @media (max-width: 768px) {
          .report-title {
            font-size: 1.6rem;
          }

          .report-actions {
            flex-direction: column;
          }

          .action-button {
            width: 100%;
          }

          .section-title {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}
