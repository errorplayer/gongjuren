'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getHotTools } from '@/lib/tool-categories';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const hotTools = getHotTools();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  // 自动轮播
  useEffect(() => {
    if (isPaused) return;

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % hotTools.length);
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, hotTools.length]);

  const handleItemClick = (index) => {
    setActiveIndex(index);
  };

  const currentTool = hotTools[activeIndex];

  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        {/* 左侧：热门工具竖排列表 */}
        <div
          className={styles.sidebar}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className={styles.sidebarHeader}>
            <svg
              className={styles.sidebarIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span>热门工具</span>
          </div>

          <div className={styles.toolList}>
            {hotTools.map((tool, index) => (
              <div
                key={tool.id}
                className={`${styles.toolItem} ${
                  index === activeIndex ? styles.active : ''
                }`}
                onClick={() => handleItemClick(index)}
              >
                <div className={styles.toolItemMain}>
                  <span className={styles.toolItemIcon}>{tool.icon}</span>
                  <span className={styles.toolItemTitle}>{tool.title}</span>
                </div>
                <div className={styles.toolItemTags}>
                  {tool.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`${styles.tag} ${
                        tag === 'HOT' ? styles.tagHot : styles.tagAi
                      }`}
                    >
                      {tag === 'HOT' ? '🔥' : '🤖'} {tag}
                    </span>
                  ))}
                </div>
                {index === activeIndex && <div className={styles.activeBar} />}
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：工具详情展示 */}
        <div className={styles.content}>
          <div className={styles.contentInner}>
            <div className={styles.toolDisplay}>
              <div className={styles.toolEmoji}>{currentTool.icon}</div>
              <h1 className={styles.toolName}>{currentTool.title}</h1>
              <p className={styles.toolDesc}>{currentTool.brochure}</p>

              <Link href={currentTool.path} className={styles.ctaButton}>
                立即体验
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>

              <div className={styles.stats}>
                <span className={styles.statItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {currentTool.usageCount.toLocaleString()} 次使用
                </span>
              </div>
            </div>

            {/* 装饰插图 */}
            <div className={styles.illustration}>
              <div className={styles.decorCircle1} />
              <div className={styles.decorCircle2} />
              <div className={styles.decorCircle3} />
              <div className={styles.floatingEmoji}>{currentTool.icon}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
