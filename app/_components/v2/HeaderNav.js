'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { TOOL_CATEGORIES, getToolsByCategory } from '@/lib/tool-categories';
import styles from './HeaderNav.module.css';

export default function HeaderNav() {
  const [activeMenu, setActiveMenu] = useState(null);
  const [activeL2, setActiveL2] = useState('hot');
  const [tools, setTools] = useState([]);
  const menuRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMenuEnter = (menuId) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveMenu(menuId);
    // 默认显示该菜单下的第一个L2分类
    const firstL2 = TOOL_CATEGORIES.subCategories.find(
      (l2) => l2.l1Id === menuId
    );
    if (firstL2) {
      setActiveL2(firstL2.id);
      setTools(getToolsByCategory(firstL2.id));
    }
  };

  const handleMenuLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  const handleMegaMenuEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleMegaMenuLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  const handleL2Click = (l2Id) => {
    setActiveL2(l2Id);
    setTools(getToolsByCategory(l2Id));
  };

  // 初始化显示推荐
  useEffect(() => {
    setTools(getToolsByCategory('hot'));
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        {/* Logo */}
        <Link href="/v2/pc" className={styles.logo}>
          <span className={styles.logoBrand}>520</span>
          <span className={styles.logoText}>.tool</span>
        </Link>

        {/* 一级菜单 */}
        <nav className={styles.nav}>
          {TOOL_CATEGORIES.menus.map((menu) => (
            <div
              key={menu.id}
              className={styles.menuItem}
              onMouseEnter={() => handleMenuEnter(menu.id)}
              onMouseLeave={handleMenuLeave}
            >
              <span
                className={`${styles.menuLink} ${
                  activeMenu === menu.id ? styles.active : ''
                }`}
              >
                {menu.label}
                <svg
                  className={styles.arrowIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          ))}
        </nav>
      </div>

      {/* MegaMenu 下拉大画布 */}
      {activeMenu && (
        <div
          ref={menuRef}
          className={styles.megaMenu}
          onMouseEnter={handleMegaMenuEnter}
          onMouseLeave={handleMegaMenuLeave}
        >
          <div className={styles.megaMenuInner}>
            {/* L2 二级菜单竖排 */}
            <div className={styles.l2Sidebar}>
              {TOOL_CATEGORIES.subCategories.map((l2) => {
                // 过滤：只显示与当前L1相关的，或者hot（推荐）
                if (
                  l2.id !== 'hot' &&
                  l2.l1Id !== activeMenu
                ) {
                  return null;
                }
                return (
                  <button
                    key={l2.id}
                    className={`${styles.l2Item} ${
                      activeL2 === l2.id ? styles.l2Active : ''
                    }`}
                    onClick={() => handleL2Click(l2.id)}
                    onMouseEnter={() => handleL2Click(l2.id)}
                  >
                    <span className={styles.l2Icon}>{l2.icon}</span>
                    <span className={styles.l2Label}>{l2.label}</span>
                    {l2.badge && (
                      <span className={styles.l2Badge}>{l2.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 工具卡片区域 */}
            <div className={styles.toolsArea}>
              <div className={styles.toolsGrid}>
                {tools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={tool.path}
                    className={styles.toolCard}
                  >
                    <div className={styles.toolCardIcon}>{tool.icon}</div>
                    <div className={styles.toolCardContent}>
                      <div className={styles.toolCardTitle}>{tool.title}</div>
                      <div className={styles.toolCardDesc}>{tool.desc}</div>
                    </div>
                    {tool.tags.includes('HOT') && (
                      <span className={styles.toolHotTag}>HOT</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
