'use client';

import { useEffect } from 'react';

/**
 * 强制当前页面使用亮色主题，忽略用户在 settings 中设置的暗色模式。
 * 组件卸载时自动恢复原始主题。
 */
export default function ForceLightTheme() {
  useEffect(() => {
    const html = document.documentElement;
    const previousTheme = html.getAttribute('data-theme');

    // 强制设置为亮色
    html.setAttribute('data-theme', 'light');

    // 卸载时恢复原来的主题
    return () => {
      if (previousTheme) {
        html.setAttribute('data-theme', previousTheme);
      } else {
        html.removeAttribute('data-theme');
      }
    };
  }, []);

  return null;
}
