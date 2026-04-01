'use client';

import { useState } from 'react';
import Link from 'next/link';

export const metadata = {
  title: "用药次数计算器 | 服药间隔周期推算工具 - 520Tool",

  description: "520Tool免费用药次数计算器，一键推算服药间隔、每日用药次数、吃药周期提醒，辅助规划合理服药时间，纯参考工具，无广告无需下载。",

  keywords: [
    "用药次数计算器",
    "服药间隔推算",
    "吃药周期计算",
    "每日用药次数",
    "服药时间规划",
    "用药提醒辅助工具"
  ],

  authors: [{ name: "520Tool" }],
  creator: "520Tool",
  publisher: "520Tool",

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

  openGraph: {
    title: "用药次数计算器 - 服药间隔周期推算 | 520Tool",
    description: "免费服药次数&间隔推算工具，规划吃药周期与用药时间，仅作日常参考，无广告免登录",
    url: "https://www.520tool.cc/tools/drug-calculator",
    siteName: "520Tool",
    locale: "zh_CN",
    type: "website"
  },

  twitter: {
    title: "用药次数计算器 | 520Tool",
    description: "推算服药间隔、用药次数、吃药周期，日常用药时间规划辅助",
    card: "summary_large_image"
  },

  alternates: {
    canonical: "https://www.520tool.cc/tools/drug-calculator"
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false
  }
};

export default function DrugCalculatorPage() {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [frequency, setFrequency] = useState('');
  const [customHour, setCustomHour] = useState('');
  const [timeRule, setTimeRule] = useState('include-both');
  const [totalCount, setTotalCount] = useState('--');
  const [timeList, setTimeList] = useState('请点击「开始计算」生成列表');

  const handleCalc = () => {
    fetch('/api/stats/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: 'drug-calculator' })
    }).catch(() => { });
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (!startTime || !endTime || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setTotalCount('--');
      setTimeList('请选择有效的开始/结束时间！');
      return;
    }
    if (startDate > endDate) {
      setTotalCount('--');
      setTimeList('开始时间不能晚于结束时间！');
      return;
    }
    if (frequency === 'custom' && (isNaN(parseFloat(customHour)) || parseFloat(customHour) <= 0)) {
      setTotalCount('--');
      setTimeList('请输入有效的自定义频率（>0）！');
      return;
    }

    const intervalHour = frequency === 'custom' ? parseFloat(customHour) : parseFloat(frequency);
    const intervalMs = intervalHour * 60 * 60 * 1000;
    const times = [];
    let currentTime = new Date(startDate);

    while (currentTime <= endDate) {
      times.push(new Date(currentTime));
      currentTime.setTime(currentTime.getTime() + intervalMs);
    }

    let filteredTimes = [...times];
    switch (timeRule) {
      case 'include-start':
        filteredTimes = filteredTimes.filter(t => t.getTime() !== endDate.getTime());
        break;
      case 'include-end':
        filteredTimes = filteredTimes.filter(t => t.getTime() !== startDate.getTime());
        break;
      case 'exclude-both':
        filteredTimes = filteredTimes.filter(t => t.getTime() !== startDate.getTime() && t.getTime() !== endDate.getTime());
        break;
      default: break;
    }

    setTotalCount(filteredTimes.length);
    setTimeList(filteredTimes.map(t => t.toLocaleString('zh-CN')).join('\n'));
  };

  const handleReset = () => {
    setStartTime('');
    setEndTime('');
    setFrequency('');
    setCustomHour('');
    setTotalCount('--');
    setTimeList('请点击「开始计算」生成列表');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(timeList);
      alert('复制成功！');
    } catch (err) {
      alert('复制失败，请手动复制！');
    }
  };

  return (
    <div className="tool-page" id="drug-calculator" style={{ display: 'block' }}>
      <h2>药品服用次数计算（临研必备）</h2>
      <div className="tool-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <label style={{ fontSize: '16px', fontWeight: '500', color: '#2c3e50', marginBottom: '10px', display: 'block' }}>
              给药开始时间(首次服用时间)
            </label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', background: '#fff' }} />
          </div>
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <label style={{ fontSize: '16px', fontWeight: '500', color: '#2c3e50', marginBottom: '10px', display: 'block' }}>
              药品回收时间
            </label>
            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', background: '#fff' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <label style={{ fontSize: '16px', fontWeight: '500', color: '#2c3e50', marginBottom: '10px', display: 'block' }}>
              给药频率
            </label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', background: '#fff', marginBottom: '10px' }}>
              <option value="">请选择给药频率</option>
              <option value="24h">每日一次 (qd) - 每24小时</option>
              <option value="12h">每日两次 (bid) - 每12小时</option>
              <option value="8h">每日三次 (tid) - 每8小时</option>
              <option value="6h">每日四次 (qid) - 每6小时</option>
              <option value="1h">每小时一次 (qh) - 每1小时</option>
              <option value="custom">自定义频率（小时）</option>
            </select>
            {frequency === 'custom' && (
              <div>
                <input type="number" value={customHour} onChange={(e) => setCustomHour(e.target.value)} placeholder="输入间隔小时数（如8=每8小时）" min="0.1" step="0.1"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
                <span style={{ fontSize: '12px', color: '#666', marginTop: '5px', display: 'block' }}>支持小数（如0.5=每30分钟）</span>
              </div>
            )}
          </div>

          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <label style={{ fontSize: '16px', fontWeight: '500', color: '#2c3e50', marginBottom: '10px', display: 'block' }}>
              时间范围规则
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="time-rule" value="include-both" checked={timeRule === 'include-both'} onChange={() => setTimeRule('include-both')} style={{ accentColor: '#3498db' }} />
                <span>包含开始时间和结束时间</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="time-rule" value="include-start" checked={timeRule === 'include-start'} onChange={() => setTimeRule('include-start')} style={{ accentColor: '#3498db' }} />
                <span>仅包含开始时间</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="time-rule" value="include-end" checked={timeRule === 'include-end'} onChange={() => setTimeRule('include-end')} style={{ accentColor: '#3498db' }} />
                <span>仅包含结束时间</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="time-rule" value="exclude-both" checked={timeRule === 'exclude-both'} onChange={() => setTimeRule('exclude-both')} style={{ accentColor: '#3498db' }} />
                <span>不包含开始和结束时间</span>
              </label>
            </div>
          </div>
        </div>

        <button className="btn" onClick={handleCalc} style={{ background: '#3498db', padding: '12px 30px', fontSize: '16px', borderRadius: '8px' }}>
          开始计算/刷新结果
        </button>
        <button className="btn" onClick={handleReset} style={{ background: '#95a5a6', padding: '12px 30px', fontSize: '16px', borderRadius: '8px', marginLeft: '10px' }}>
          清空
        </button>

        <div className="result-area" style={{ marginTop: '20px', background: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div className="result-title" style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
            计算结果
          </div>
          <div style={{ fontSize: '16px', marginBottom: '15px' }}>
            <span style={{ fontWeight: '500' }}>总服药次数：</span>
            <span style={{ color: '#3498db', fontSize: '20px', fontWeight: '600' }}>{totalCount}</span>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <span style={{ fontWeight: '500' }}>服药时间列表：</span>
            <button className="btn" onClick={handleCopy} style={{ padding: '8px 16px', fontSize: '14px', marginLeft: '10px', touchAction: 'manipulation', WebkitTapHighlightColor: 'rgba(0,0,0,0)' }}>
              复制列表
            </button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'monospace', fontSize: '14px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {timeList}
          </pre>
        </div>
        <Link href="/" className="back-btn" style={{ marginTop: '20px' }}>← 返回工具目录</Link>
      </div>
    </div>
  );
}
