'use client';

import { useState, useEffect, useRef } from 'react';

const tagColors = {
  'Hot': { bg: '#fff0f0', color: '#d93025' },
  '喝彩': { bg: '#fff0f0', color: '#d93025' },
  '突发': { bg: '#fff8f0', color: '#e65100' },
  '科技': { bg: '#f0f7ff', color: '#1565c0' },
  '娱乐': { bg: '#f8f0ff', color: '#7b1fa2' },
  '财经': { bg: '#fffdf0', color: '#f9a825' },
  '体育': { bg: '#f0fff4', color: '#2e7d32' },
  '军事': { bg: '#f0fff4', color: '#2e7d32' },
  '轻松': { bg: '#f0f7ff', color: '#1565c0' },
  'New': { bg: '#f0fffe', color: '#00838f' },
  'Shock': { bg: '#fff0f0', color: '#d93025' },
  '励志': { bg: '#f5e9e1', color: '#f14a08' },
  '社会': { bg: '#f5e9e1', color: '#f14a08' },
  '气候': { bg: '#f0fffe', color: '#00838f' },
  '时事': { bg: '#f0f7ff', color: '#1565c0' },
  '局势': { bg: '#fff8f0', color: '#e65100' },
};

export default function DailyHot() {
  const [items, setItems] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch('/api/daily-hot')
      .then(res => res.json())
      .then(json => {
        if (json.data) setItems(json.data);
      })
      .catch(() => { });
  }, []);

  if (items.length === 0) return null;

  // 复制两份实现无缝滚动
  const allItems = [...items, ...items];

  return (
    <div className="daily-hot-wrapper">
      <div className="daily-hot" ref={scrollRef}>
        <div className="daily-hot-track">
          {allItems.map((item, i) => {
            const style = tagColors[item.tag] || { bg: '#f5f5f5', color: '#666' };
            const content = (
              <span
                className="daily-hot-tag"
                style={{ backgroundColor: style.bg, color: style.color }}
              >
                {item.tag && <span className="daily-hot-tag-label">{item.tag}</span>}
                {item.title}
              </span>
            );

            return item.link ? (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="daily-hot-item daily-hot-link">
                {content}
              </a>
            ) : (
              <span key={i} className="daily-hot-item">{content}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
