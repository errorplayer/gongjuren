'use client';

import Link from 'next/link';
import styles from './Logo.module.css';

/**
 * Logo 组件
 * 包含渐变品牌名 + 光泽扫过动画 + 暗色模式适配
 * 
 * @param {string} href - 链接地址，默认 "/"
 * @param {'sm'|'md'|'lg'} size - 尺寸变体，默认 "md"
 * @param {boolean} showText - 是否显示 ".tool.cc" 文字，默认 true
 */
export default function Logo({ 
  href = '/', 
  size = 'md',
  showText = true 
}) {
  return (
    <Link href={href} className={`${styles.logo} ${styles[size]}`}>
      <span className={styles.brand}>520</span>
      {showText && <span className={styles.text}>tool.cc</span>}
    </Link>
  );
}
