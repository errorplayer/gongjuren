'use client';

import { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import Logo from '@/app/_components/Logo';
import { TOOL_CATEGORIES, getToolsByGroup, enrichToolsWithStats } from '@/lib/tool-categories';
import styles from './HeaderNav.module.css';

const { menus, subCategories } = TOOL_CATEGORIES;

// 获取 L1 菜单对应的 L2 分类
const getSubCategoriesByL1 = (l1Id) => {
  return subCategories.filter((sub) => sub.l1Id === l1Id);
};

export default function HeaderNav({ statsMap = {} }) {
  const [activeL1Id, setActiveL1Id] = useState(null);
  const [activeL2Id, setActiveL2Id] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closingRef = useRef(false);

  // 处理 L1 鼠标进入
  const handleL1MouseEnter = (l1Id) => {
    closingRef.current = false;
    setIsClosing(false);
    setActiveL1Id(l1Id);

    // 获取该 L1 对应的 L2 分类
    const l2Categories = getSubCategoriesByL1(l1Id);
    if (l2Categories.length > 0) {
      // 不需要默认选中第二个 L2
      setActiveL2Id(l2Categories[0].id);
    }
    setIsMenuOpen(true);
  };

  // 处理 L1 鼠标离开，开始关闭流程
  const handleL1MouseLeave = () => {
    closingRef.current = true;
    setIsClosing(true);
    setTimeout(() => {
      if (closingRef.current) {
        setActiveL1Id(null);
        setIsMenuOpen(false);
        setIsClosing(false);
        closingRef.current = false;
      }
    }, 150);
  };

  // 保持 MegaMenu 打开
  const handleMegaMenuMouseEnter = () => {
    closingRef.current = false;
    setIsClosing(false);
    setActiveL1Id(activeL1Id);
    setIsMenuOpen(true);
  };

  // MegaMenu 鼠标离开，关闭
  const handleMegaMenuMouseLeave = () => {
    closingRef.current = true;
    setIsClosing(true);
    setTimeout(() => {
      if (closingRef.current) {
        setActiveL1Id(null);
        setIsMenuOpen(false);
        setIsClosing(false);
        closingRef.current = false;
      }
    }, 150);
  };

  // 获取当前 L1 对应的 L2 分类
  const currentL2Categories = activeL1Id ? getSubCategoriesByL1(activeL1Id) : [];

  // 获取当前 L2 分类对应的工具，并注入真实 usageCount
  const currentTools = useMemo(() => {
    if (!activeL2Id) return [];
    return enrichToolsWithStats(getToolsByGroup(activeL2Id), statsMap);
  }, [activeL2Id, statsMap]);

  // 构建 MegaMenu 左侧分类列表（推荐始终第一位）
  const getMegaMenuL2List = () => {
    const l2List = [...subCategories.filter((sub) => sub.l1Id === activeL1Id)];
    // 将 "推荐" 插入到第一个位置
    // const hotCategory = subCategories.find((sub) => sub.id === 'hot');
    // if (hotCategory && !l2List.find((sub) => sub.id === 'hot')) {
    //   l2List.unshift(hotCategory);
    // }
    return l2List;
  };

  const megaMenuL2List = activeL1Id ? getMegaMenuL2List() : [];

  return (
    <header className={styles.header}>
      {/* 顶部导航栏 */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <Logo size="dm" showText href="/v2/pc" />
        </div>

        <div className={styles.navRight}>
          {menus.map((menu) => (
            <div
              key={menu.id}
              className={`${styles.menuItem} ${activeL1Id === menu.id ? styles.menuItemActive : ''} ${menu.id === 'moyu' ? styles.menuItemHot : ''}`}
              onMouseEnter={() => handleL1MouseEnter(menu.id)}
              onMouseLeave={handleL1MouseLeave}
            >
              <span className={styles.menuLabel}>{menu.label}</span>
              <svg
                className={`${styles.arrowIcon} ${isMenuOpen && activeL1Id === menu.id ? styles.arrowUp : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          ))}
        </div>
        <div className={styles.navGuestbook}>
        <Link href="/guestbook" className={styles.guestbookEntry}>
          <svg className={styles.guestbookIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span className={styles.guestbookText}>留言板</span>
        </Link>
      </div>
      </nav>
      

      {/* Mega Menu 全幅下拉 */}
      {isMenuOpen && activeL1Id && (
        <div
          className={styles.megaMenu}
          onMouseEnter={handleMegaMenuMouseEnter}
          onMouseLeave={handleMegaMenuMouseLeave}
        >
          <div className={styles.megaMenuInner}>
            {/* 左侧：L2 分类列表 */}
            <div className={styles.l2List}>
              {megaMenuL2List.map((sub) => (
                <div
                  key={sub.id}
                  className={`${styles.l2Item} ${activeL2Id === sub.id ? styles.l2ItemActive : ''}`}
                  onClick={() => setActiveL2Id(sub.id)}
                  onMouseEnter={() => setActiveL2Id(sub.id)}   // ← 新增这行
                >
                  <span className={styles.l2Icon}>{sub.icon}</span>
                  <span className={styles.l2Label}>{sub.label}</span>
                  {sub.badge && (
                    <span className={styles.l2Badge}>{sub.badge}</span>
                  )}
                </div>
              ))}
            </div>

            {/* 右侧：工具卡片 */}
            <div className={styles.toolCards}>
              {currentTools.length > 0 ? (
                currentTools.map((tool) => (
                  <Link
                    key={tool.id}
                    href={tool.path}
                    className={styles.toolCard}
                    {...(tool.path.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    <div className={styles.toolCardIcon}>{tool.icon}</div>
                    <div className={styles.toolCardContent}>
                      <div className={styles.toolCardTitle}>{tool.title}</div>
                      <div className={styles.toolCardDesc}>{tool.desc}</div>
                    </div>
                    {tool.tags.length > 0 && (
                      <div className={styles.toolCardTags}>
                        {tool.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`${styles.toolTag} ${tag === 'HOT' ? styles.tagHot : styles.tagAi}`}
                          >
                            {tag === 'HOT' ? '🔥' : '🤖'} {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))
              ) : (
                <div className={styles.noTools}>暂无工具</div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}