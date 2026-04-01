'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { sceneList, getSceneById } from '../../lib/text-heal-scenes';
import { getExamplesByScene } from '../../lib/text-heal-examples';

export const metadata = {
  title: "文本润色工具 - 在线优化文案、语句通顺、表达提升 | 520Tool",

  description: "520Tool免费在线文本润色工具，自动优化文案、修正语句、提升表达流畅度，支持文章、文案、句子润色，无广告无需登录，一键生成优质文本。",

  keywords: [
    "文本润色",
    "在线文本润色",
    "文案优化",
    "语句优化",
    "文章润色",
    "文案润色工具",
    "免费文本润色"
  ],

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title: "文本润色工具 - 在线优化文案 | 520Tool",
    description: "免费在线文本润色，自动优化语句、提升文案表达，无广告一键使用",
    url: "https://www.520tool.cc/tools/text-heal",
    siteName: "520Tool",
    locale: "zh_CN",
    type: "website",
  },

  alternates: {
    canonical: "https://www.520tool.cc/tools/text-heal",
  },
};
// 可用的 AI 模型提供商
const PROVIDERS = [
  { id: 'kimi', name: 'Kimi', icon: '🤖', description: '月之暗面，支持多轮对话' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🧠', description: '深度求索，开源实力' },
];

export default function TextHeal() {
  const [selectedScene, setSelectedScene] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('kimi');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimit, setRateLimit] = useState(null);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [isExampleVisible, setIsExampleVisible] = useState(false);
  const [fadeState, setFadeState] = useState('visible');
  const carouselRef = useRef(null);
  const intervalRef = useRef(null);

  const handleSceneSelect = (sceneId) => {
    setSelectedScene(sceneId);
    setError('');
  };

  const handleHeal = async () => {
    fetch('/api/stats/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: 'text-heal' })
    }).catch(() => { });
    if (!selectedScene) {
      setError('请选择使用场景');
      return;
    }
    if (!inputText.trim()) {
      setError('请输入需要优化的文本');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const res = await fetch('/api/text-heal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText.trim(),
          sceneId: selectedScene,
          provider: selectedProvider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || '请求过于频繁，请稍后再试');
          setRateLimit(data.resetTime);
        } else {
          setError(data.error || '处理失败，请稍后重试');
        }
        return;
      }

      setResult(data.result);
      setRateLimit({
        remaining: data.remaining,
        resetTime: data.resetTime,
      });
    } catch (err) {
      setError('网络错误，请检查连接后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setResult('');
    setError('');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      alert('已复制到剪贴板');
    } catch (err) {
      alert('复制失败，请手动复制');
    }
  };

  const handleApply = () => {
    setInputText(result);
    setResult('');
  };

  const getSceneIcon = (id) => {
    const icons = {
      email: '📧',
      social: '💬',
      article: '📝',
      review: '⭐',
      chat: '💭',
      group_anouncement: '📢'
    };
    return icons[id] || '🔧';
  };

  // 获取当前场景的示例数据
  const getCurrentExamples = useCallback(() => {
    return selectedScene ? getExamplesByScene(selectedScene) : [];
  }, [selectedScene]);

  // 轮播控制 - 先淡出，再切换，再淡入
  const nextExample = useCallback(() => {
    const examples = getCurrentExamples();
    if (examples.length > 0) {
      setFadeState('fading');
      setTimeout(() => {
        setCurrentExampleIndex((prev) => (prev + 1) % examples.length);
        setFadeState('visible');
      }, 300);
    }
  }, [getCurrentExamples]);

  // 自动轮播
  useEffect(() => {
    const examples = getCurrentExamples();
    if (selectedScene && examples.length > 1) {
      setIsExampleVisible(true);
      setCurrentExampleIndex(0);
      
      intervalRef.current = setInterval(() => {
        nextExample();
      }, 4000);
    } else {
      setIsExampleVisible(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedScene, nextExample, getCurrentExamples]);

  return (
    <div className="text-heal-page">
      <div className="tool-header">
        <h1>文本智能润色</h1>
        <p>AI 驱动，一键优化您的文本内容</p>
      </div>

      {/* 示例轮播 */}
      {isExampleVisible && getCurrentExamples().length > 0 && (
        <div className="example-carousel" ref={carouselRef}>
          <div className="carousel-title">
            <span className="carousel-icon">✨</span>
            优化示例
          </div>
          <div className={`carousel-content ${fadeState === 'fading' ? 'fade-out' : ''}`}>
            <div className="example-box before">
              <div className="example-label">优化前</div>
              <div className="example-text">
                {getCurrentExamples()[currentExampleIndex]?.before}
              </div>
            </div>
            <div className="arrow-separator">→</div>
            <div className="example-box after">
              <div className="example-label">优化后</div>
              <div className="example-text">
                {getCurrentExamples()[currentExampleIndex]?.after}
              </div>
            </div>
          </div>
          <div className="carousel-indicators">
            {getCurrentExamples().map((_, index) => (
              <div
                key={index}
                className={`indicator ${index === currentExampleIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 场景选择 */}
      <div className="scene-selector">
        <div className="scene-title">选择使用场景</div>
        <div className="scene-grid">
          {sceneList.map((scene) => (
            <div
              key={scene.id}
              className={`scene-card ${selectedScene === scene.id ? 'active' : ''}`}
              onClick={() => handleSceneSelect(scene.id)}
            >
              <div className="scene-icon">{getSceneIcon(scene.id)}</div>
              <div className="scene-name">{scene.name}</div>
              <div className="scene-desc">{scene.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 编辑区 */}
      <div className="editor-container">
        <div className="editor-header">
          <div className="editor-label">输入文本</div>
          <div className="char-count">
            {inputText.length} / 2000 字
          </div>
        </div>
        <textarea
          className="editor-textarea"
          placeholder="请输入需要优化的文本..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading}
        />
        <div className="editor-footer">
          <div className="inline-provider-selector">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                className={`inline-provider-chip ${selectedProvider === provider.id ? 'active' : ''}`}
                onClick={() => setSelectedProvider(provider.id)}
                disabled={loading}
              >
                {provider.icon} {provider.name}
              </button>
            ))}
          </div>
          <button
            className="btn-clear"
            onClick={handleClear}
            disabled={loading}
          >
            清空
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* 操作栏 */}
      <div className="action-bar">
        <button
          className="btn-primary"
          onClick={handleHeal}
          disabled={loading || !selectedScene || !inputText.trim()}
        >
          {loading ? '处理中...' : '开始润色'}
        </button>
        {rateLimit && (
          <div className="rate-limit-info">
            本小时剩余次数: {rateLimit.remaining}
          </div>
        )}
      </div>

      {/* 结果展示区 */}
      {result && (
        <div className="result-container">
          <div className="result-header">
            <div className="result-label">优化结果</div>
            <div className="result-actions">
              <button className="btn-copy" onClick={handleCopy}>
                复制
              </button>
              <button className="btn-apply" onClick={handleApply}>
                应用到输入
              </button>
            </div>
          </div>
          <div className="result-content">{result}</div>
        </div>
      )}

      {loading && (
        <div className="result-container loading">
          <div className="loading-spinner"></div>
          <p>AI 正在精心优化您的文本...</p>
        </div>
      )}

      <Link href="/" className="back-btn">← 返回工具目录</Link>
    </div>
  );
}
