'use client';

import { useState, useEffect } from 'react';
import { getPrefs, setPrefs, resetPrefs, sanitizeNickname } from '@/lib/user-prefs';
import { TOOLS, DEFAULT_TOOL_ORDER } from '@/lib/tools';
import styles from './page.module.css';

export default function SettingsPage() {
  const [theme, setTheme] = useState('light');
  const [toolOrder, setToolOrder] = useState([]);
  const [toolHidden, setToolHidden] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [toast, setToast] = useState(null);
  const [nickname, setNickname] = useState('游客');
  const [nicknameSaved, setNicknameSaved] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

  useEffect(() => {
    const prefs = getPrefs();
    setNickname(prefs.nickname || '游客');
    setToolOrder(prefs.tool_order || [...DEFAULT_TOOL_ORDER]);
    setToolHidden(prefs.tool_hidden || []);

    const currentTheme = localStorage.getItem('theme') || 'light';
    setTheme(currentTheme);
  }, []);


  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleToggleTool = (toolId) => {
    let newHidden;
    if (toolHidden.includes(toolId)) {
      newHidden = toolHidden.filter(id => id !== toolId);
    } else {
      newHidden = [...toolHidden, toolId];
    }
    setToolHidden(newHidden);
    setPrefs({ tool_hidden: newHidden });
  };

  const handleMoveTool = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= toolOrder.length) return;

    const newOrder = [...toolOrder];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setToolOrder(newOrder);
    setPrefs({ tool_order: newOrder });
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newOrder = [...toolOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);

    setToolOrder(newOrder);
    setPrefs({ tool_order: newOrder });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };


  const handleReset = () => {
    if (!confirm('确定要恢复默认设置吗？')) return;
    const defaults = resetPrefs();
    setToolOrder(defaults.tool_order);
    setToolHidden(defaults.tool_hidden);
    setNickname('游客');
    setNicknameSaved(false);
    showToast('已恢复默认设置');
  };

  const handleNicknameBlur = () => {
    const sanitized = sanitizeNickname(nickname);
    if (sanitized === '游客' && nickname.trim() !== '') {
      setNickname(sanitized);
      showToast('昵称中仅允许使用中文、字母和数字，非法字符已移除');
    } else if (sanitized !== nickname) {
      setNickname(sanitized);
      showToast('昵称中的非法字符已被自动移除');
    }
    setPrefs({ nickname: sanitized });
    setNicknameSaved(true);
    setNicknameError('');
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsHeader}>
        <h1>⚙️ 本地设置</h1>
        <p>所有设置保存在本地浏览器中，不会上传到服务器</p>
      </div>

      <section className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>👤 昵称</h2>
        <div className={styles.nicknameInputWrapper}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setNicknameSaved(false);
              setNicknameError('');
            }}
            onBlur={handleNicknameBlur}
            placeholder="输入昵称"
            maxLength={30}
            className={styles.nicknameInput}
          />
          <span className={styles.charCount}>{nickname.length}/30</span>
          {nicknameSaved && !nicknameError && <span className={styles.nicknameSaved}>✓</span>}
        </div>
        {nicknameError && <div className={styles.nicknameError}>{nicknameError}</div>}
        <p className={styles.helpText}>昵称用于聊天室、留言板等功能，修改后自动保存</p>
      </section>

      <section className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>🎨 主题</h2>
        <div className={styles.themeToggleButtons}>
          <button
            className={`${styles.themeButton} ${theme === 'light' ? styles.active : ''}`}
            onClick={() => handleThemeChange('light')}
          >
            ☀️ 亮色
          </button>
          <button
            className={`${styles.themeButton} ${theme === 'dark' ? styles.active : ''}`}
            onClick={() => handleThemeChange('dark')}
          >
            🌙 暗色
          </button>
        </div>
        <div className={styles.themeTip}>
          <span className={styles.tipIcon}>💡</span>
          <span>PC端v2版桌面暂不支持暗色模式，其他页面不受影响。敬请谅解~</span>
        </div>
      </section>


      {isTouchDevice ? (<section className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>📌 首页工具排列</h2>
        <p className={styles.helpText}>
          {isTouchDevice ? '使用上下箭头调整顺序，勾选控制显示/隐藏' : '拖拽手柄排序（桌面端），勾选控制显示/隐藏'}
        </p>
        <ul className={styles.draggableList}>
          {toolOrder.map((toolId, index) => {
            const tool = TOOLS.find(t => t.id === toolId);
            if (!tool) return null;
            const isHidden = toolHidden.includes(toolId);
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <li
                key={toolId}
                className={`${styles.draggableItem} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
                draggable={!isTouchDevice}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                style={{ opacity: isHidden ? 0.5 : 1 }}
              >
                <span
                  className={`${styles.dragHandle} ${isTouchDevice ? styles.hidden : ''}`}
                  title="拖拽排序"
                >
                  ≡
                </span>
                <input
                  type="checkbox"
                  className={styles.toolCheckbox}
                  checked={!isHidden}
                  onChange={() => handleToggleTool(toolId)}
                  title="显示/隐藏"
                />
                <div className={styles.toolInfo}>
                  <div className={styles.toolName}>
                    <span className={styles.toolIcon}>{tool.icon}</span>
                    {tool.title}
                  </div>
                  <div className={styles.toolDesc}>{tool.desc}</div>
                </div>
                <div className={styles.controlButtons}>
                  <button
                    className={styles.arrowButton}
                    onClick={() => handleMoveTool(index, 'up')}
                    disabled={index === 0}
                    title="上移"
                  >
                    ↑
                  </button>
                  <button
                    className={styles.arrowButton}
                    onClick={() => handleMoveTool(index, 'down')}
                    disabled={index === toolOrder.length - 1}
                    title="下移"
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul></section>) : (<br />)}
      <section className={styles.settingsSection}>
        <div className={styles.actionButtons}>
          <button className={`${styles.actionButton} ${styles.danger}`} onClick={handleReset}>
            恢复默认
          </button>

        </div>
      </section>

      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
