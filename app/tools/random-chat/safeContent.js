import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './page.module.css';

/**
 * 常量配置
 */
// localStorage 中存储客户端 ID 的键名
const CLIENT_KEY = '520tool-random-chat-client-id';
// 轮询匹配间隔（毫秒）
const POLL_MS = 2000;
// 距离底部多少像素内视为"接近底部"，用于自动滚动判断
const NEAR_BOTTOM_PX = 80;


/**
 * 获取或创建客户端唯一标识符
 * 该 ID 用于识别用户身份，存储在 localStorage 中持久化
 * @returns {string} 客户端唯一 ID
 */
function getOrCreateClientId() {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(CLIENT_KEY);
  if (!id || id.length < 8) {
    id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    window.localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

/**
 * 创建浏览器端 Supabase 客户端
 * 用于实时消息广播
 * @returns {Object|null} Supabase 客户端实例，若配置缺失则返回 null
 */
function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * 随机聊天室核心组件
 * 实现匿名随机匹配和实时聊天功能
 */
export default function SafeContent() {
  const router = useRouter();

  /**
   * 状态定义
   * phase: 当前阶段 - 'idle'(空闲) | 'waiting'(等待匹配) | 'chat'(聊天中) | 'ended'(已结束)
   * hint: 提示文本，用于显示状态或错误信息
   * messages: 聊天消息列表
   * input: 输入框当前值
   * showNewMessageHint: 是否显示"有新消息"提示（当用户滚动到上方且收到新消息时）
   */
  const [phase, setPhase] = useState('idle');
  const [hint, setHint] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showNewMessageHint, setShowNewMessageHint] = useState(false);

  /**
   * Ref 定义（用于在回调函数中访问最新值或跨生命周期保存状态）
   */
  const clientIdRef = useRef('');           // 客户端唯一 ID
  const pollRef = useRef(null);             // 轮询定时器引用
  const channelRef = useRef(null);          // Supabase 实时频道引用
  const supabaseRef = useRef(null);         // Supabase 客户端引用
  const listRef = useRef(null);             // 消息列表 DOM 引用
  const bottomRef = useRef(null);           // 消息列表底部锚点引用
  const shouldAutoScrollRef = useRef(true); // 是否应该自动滚动到底部
  const phaseRef = useRef('idle');          // phase 的可变引用（用于事件监听器中读取最新状态）
  const exitChatRef = useRef(async () => { });   // 退出聊天的回调引用
  const leaveWaitingRef = useRef(async () => { }); // 退出等待的回调引用
  const fullscreenRef = useRef(null);       // 全屏容器 DOM 引用（用于处理移动端键盘）

  /**
   * 清除轮询定时器
   */
  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /**
   * 销毁 Supabase 实时频道
   * 断开与房间的连接，清理资源
   */
  const teardownChannel = useCallback(() => {
    const sb = supabaseRef.current;
    const ch = channelRef.current;
    if (sb && ch) {
      sb.removeChannel(ch);
    }
    channelRef.current = null;
    supabaseRef.current = null;
  }, []);

  /**
   * 调用退出 API
   * 通知后端客户端离开，释放匹配状态
   * @param {string} cid - 客户端 ID
   */
  const leaveApi = useCallback(async (cid) => {
    if (!cid) return;
    try {
      await fetch('/api/random-chat/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: cid }),
      });
    } catch {
      /* ignore - 退出请求失败不影响用户体验 */
    }
  }, []);

  /**
   * 退出等待状态并返回首页
   * 用于取消排队时清理状态
   */
  const leaveWaitingAndHome = useCallback(async () => {
    clearPoll();
    await leaveApi(clientIdRef.current);
    setPhase('idle');
    setHint('');
    router.push('/');
  }, [clearPoll, leaveApi, router]);

  /**
   * 退出聊天
   * @param {boolean} notifyPeer - 是否通知对方已离开
   */
  const exitChat = useCallback(
    async (notifyPeer) => {
      const cid = clientIdRef.current;
      // 通过 Supabase broadcast 通知对方
      if (notifyPeer && channelRef.current && cid) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer_left',
          payload: { from: cid },
        });
      }
      teardownChannel();
      await leaveApi(cid);
      clearPoll();
      // 重置所有聊天相关状态
      setMessages([]);
      setShowNewMessageHint(false);
      shouldAutoScrollRef.current = true;
      setPhase('idle');
      setHint('');
    },
    [clearPoll, leaveApi, teardownChannel]
  );

  // 将回调保存到 ref 中，以便在事件监听器中调用
  exitChatRef.current = exitChat;
  leaveWaitingRef.current = leaveWaitingAndHome;

  // 同步 phase 状态到 ref，方便在闭包中获取最新值
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /**
   * 滚动到消息列表底部
   */
  const scrollToBottom = useCallback(() => {
    shouldAutoScrollRef.current = true;
    setShowNewMessageHint(false);
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  /**
   * 处理消息列表滚动事件
   * 判断用户是否手动向上滚动，决定是否显示"有新消息"提示
   */
  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // 计算距离底部的距离
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < NEAR_BOTTOM_PX) {
      // 接近底部，启用自动滚动
      shouldAutoScrollRef.current = true;
      setShowNewMessageHint(false);
    } else {
      // 用户向上滚动，禁用自动滚动
      shouldAutoScrollRef.current = false;
    }
  }, []);

  // 初始化客户端 ID
  useEffect(() => {
    clientIdRef.current = getOrCreateClientId();
  }, []);

  /**
   * 发送离开通知（使用 Beacon API 或 fetch keepalive）
   * 用于页面关闭时可靠地通知后端客户端离开
   * 注意：Beacon API 在页面卸载时比普通 fetch 更可靠
   */
  const sendLeaveBeacon = useCallback(() => {
    const cid = clientIdRef.current;
    const body = JSON.stringify({ clientId: cid });
    if (navigator.sendBeacon) {
      // 优先使用 sendBeacon，它会在页面卸载时可靠发送
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/random-chat/leave', blob);
    } else {
      // 降级方案：使用 fetch + keepalive
      fetch('/api/random-chat/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => { });
    }
  }, []);

  /**
   * 处理页面卸载事件
   * 在聊天或等待状态时，显示离开确认并通知后端
   */
  useEffect(() => {
    const onBeforeUnload = (e) => {
      const p = phaseRef.current;
      if (p === 'chat' || p === 'waiting') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const onPageHide = (ev) => {
      // 如果是页面缓存（bfcache），不处理
      if (ev.persisted) return;
      const p = phaseRef.current;
      if (p === 'chat' || p === 'waiting') {
        sendLeaveBeacon();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [sendLeaveBeacon]);

  /**
   * 历史 URL 守卫：在进入聊天或等待状态时添加历史记录
   * 这样用户点击浏览器后退按钮时可以拦截并显示确认框
   */
  useEffect(() => {
    if (phase !== 'chat' && phase !== 'waiting') return;
    if (typeof window === 'undefined') return;
    if (window.history.state?.randomChatGuard) return;
    window.history.pushState({ randomChatGuard: true }, '', window.location.href);
  }, [phase]);

  /**
   * 处理浏览器后退事件
   * 在聊天或等待状态时，拦截后退并显示确认框
   */
  useEffect(() => {
    const onPopState = () => {
      const p = phaseRef.current;
      if (p === 'chat') {
        const ok = window.confirm(
          '离开将结束当前聊天，对方会收到退出提示。确定要离开吗？'
        );
        if (ok) {
          exitChatRef.current(true).then(() => {
            router.push('/');
          });
        } else {
          // 取消离开，重新 push 状态
          window.history.pushState({ randomChatGuard: true }, '', window.location.href);
        }
        return;
      }
      if (p === 'waiting') {
        const ok = window.confirm('将退出排队，确定要离开吗？');
        if (ok) {
          leaveWaitingRef.current();
        } else {
          window.history.pushState({ randomChatGuard: true }, '', window.location.href);
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [router]);

  /**
   * 聊天中拦截站内链接点击
   * 防止用户误操作导致聊天被意外结束
   */
  useEffect(() => {
    if (phase !== 'chat') return;

    const onDocClick = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const a = target.closest('a[href]');
      // 跳过返回工具目录链接（它有自己的确认逻辑）
      if (!a || a.hasAttribute('data-chat-back-link')) return;
      // 跳过新窗口/下载链接
      if (a.target === '_blank' || a.getAttribute('download')) return;
      // 跳过快捷键点击（新标签页等）
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href');
      // 跳过锚点链接
      if (!href || href.startsWith('#')) return;
      // 跳过邮件/电话链接
      if (/^(mailto:|tel:)/i.test(href)) return;

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      // 只拦截站内链接
      if (url.origin !== window.location.origin) return;
      // 跳过当前页链接
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash === window.location.hash
      ) {
        return;
      }

      e.preventDefault();
      const ok = window.confirm(
        '离开将结束当前聊天，对方会收到退出提示。确定要离开吗？'
      );
      if (!ok) return;
      exitChatRef.current(true).then(() => {
        router.push(url.pathname + url.search + url.hash);
      });
    };

    // 使用捕获阶段确保先于其他处理程序执行
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [phase, router]);

  /**
   * 处理"返回工具目录"链接点击
   * 根据当前阶段显示相应的确认框
   */
  const handleBackToHome = useCallback(
    async (e) => {
      e.preventDefault();
      if (phase === 'chat') {
        if (
          !window.confirm(
            '离开将结束当前聊天，对方会收到退出提示。确定返回工具目录吗？'
          )
        ) {
          return;
        }
        await exitChat(true);
        router.push('/');
        return;
      }
      if (phase === 'waiting') {
        if (!window.confirm('将退出排队，确定返回工具目录吗？')) {
          return;
        }
        await leaveWaitingAndHome();
        return;
      }
      router.push('/');
    },
    [phase, exitChat, router, leaveWaitingAndHome]
  );

  /**
   * 组件卸载时的清理逻辑
   * 清理轮询、频道、通知后端等资源
   */
  useEffect(() => {
    return () => {
      clearPoll();
      teardownChannel();
      leaveApi(clientIdRef.current);
    };
  }, [clearPoll, leaveApi, teardownChannel]);

  /**
   * 消息列表自动滚动逻辑
   * 当有新消息时，判断是否自动滚动或显示提示
   */
  useEffect(() => {
    if (phase !== 'chat' && phase !== 'ended') return;
    if (messages.length === 0) return;

    const el = listRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_PX;

    if (nearBottom || shouldAutoScrollRef.current) {
      // 接近底部或之前启用了自动滚动，自动滚动到底部
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        setShowNewMessageHint(false);
      });
    } else {
      // 用户向上滚动了，显示"有新消息"提示（仅当对方发来的消息）
      const last = messages[messages.length - 1];
      if (last && !last.mine) {
        setShowNewMessageHint(true);
      }
    }
  }, [messages, phase]);

  /**
   * 处理移动端虚拟键盘弹出
   * 使用 visualViewport API 调整容器高度，避免键盘遮挡
   */
  useEffect(() => {
    if (phase !== 'chat') return;
    if (typeof window === 'undefined') return;
    if (!window.visualViewport) return;

    const handleVisualViewportResize = () => {
      const fullscreenEl = fullscreenRef.current;
      if (!fullscreenEl) return;

      const viewport = window.visualViewport;
      const height = viewport.height;

      // 设置容器高度为可视视口高度
      fullscreenEl.style.height = `${height}px`;
      // 设置底部 padding 避免内容被键盘遮挡
      fullscreenEl.style.paddingBottom = `${window.innerHeight - height}px`;
    };

    window.visualViewport.addEventListener('resize', handleVisualViewportResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewportResize);
    };
  }, [phase]);

  /**
   * 尝试加入匹配队列或检查配对结果
   * 周期性调用的轮询函数
   */
  const tryJoin = useCallback(async () => {
    const cid = clientIdRef.current;
    if (!cid) return;

    const res = await fetch('/api/random-chat/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: cid }),
    });

    const data = await res.json().catch(() => ({}));

    // 请求失败
    if (!res.ok) {
      setHint(data.error || '暂时无法配对，请稍后重试');
      setPhase('idle');
      clearPoll();
      return;
    }

    // 配对错误
    if (data.status === 'error') {
      setHint(data.message || '配对出错');
      setPhase('idle');
      clearPoll();
      return;
    }

    // 仍在等待中
    if (data.status === 'waiting') {
      setHint('正在等待你的缘分 ...');
      return;
    }

    // 配对成功
    if (data.status === 'matched' && data.room_id) {
      clearPoll();
      shouldAutoScrollRef.current = true;
      setShowNewMessageHint(false);
      setPhase('chat');
      setHint('已匹配，开始聊天（消息不会保存到服务器）');

      const sb = createBrowserSupabase();
      if (!sb) {
        setHint('缺少 Supabase 前端配置，无法实时收发');
        setPhase('idle');
        return;
      }

      supabaseRef.current = sb;
      // 订阅 Supabase 实时频道
      const channel = sb
        .channel(`random-chat:${data.room_id}`, {
          config: { broadcast: { self: true } },
        })
        // 监听聊天消息
        .on('broadcast', { event: 'chat' }, ({ payload }) => {
          const text = payload?.text;
          const from = payload?.from;
          if (typeof text !== 'string' || !from) return;
          setMessages((m) => [
            ...m,
            {
              id: `${Date.now()}-${Math.random()}`,
              text,
              mine: from === cid,
            },
          ]);
        })
        // 监听对方离开事件
        .on('broadcast', { event: 'peer_left' }, () => {
          setHint('对方已离开');
          setPhase('ended');
          teardownChannel();
          leaveApi(cid);
        })
        .subscribe();

      channelRef.current = channel;
    }
  }, [clearPoll, leaveApi, teardownChannel]);

  /**
   * 开始匹配聊天
   * 进入等待状态，开始轮询配对结果
   */
  const startChat = useCallback(() => {
    // 记录工具使用统计
    fetch('/api/stats/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: 'random-chat' }),
    }).catch(() => { });

    setPhase('waiting');
    setHint('正在为你排队…');
    tryJoin();
    clearPoll();
    // 启动定时轮询
    pollRef.current = setInterval(tryJoin, POLL_MS);
  }, [clearPoll, tryJoin]);

  /**
   * 发送聊天消息
   * 通过 Supabase broadcast 发送消息给对方
   */
  const sendMessage = useCallback(() => {
    const text = input.trim();
    const ch = channelRef.current;
    const cid = clientIdRef.current;
    if (!text || !ch || !cid) return;

    shouldAutoScrollRef.current = true;

    ch.send({
      type: 'broadcast',
      event: 'chat',
      payload: { text, from: cid },
    });
    setInput('');
  }, [input]);

  return (
    <div className="tool-page" style={{ display: 'block' }}>
      {/* 页面标题区域 */}
      <div className={styles.titleSection}>
        <h2>随机聊天室</h2>
        <p className={styles.subtitle}>
          欢迎光临 ~ 在这里你可以匿名随机匹配神秘用户文字聊天，无需登录。消息数据随聊天结束清空；离开或刷新本页面会自动退出队列或房间。
        </p>
      </div>

      {/* 空闲状态：显示开始匹配按钮 */}
      {phase === 'idle' && (
        <div className={`${styles.content} ${styles.fadeIn}`}>
          <div className={styles.idleContainer}>
            <div className={styles.idleIcon}>💬</div>
            <h3 className={styles.idleTitle}>开始你的匿名聊天</h3>
            <p className={styles.idleDescription}>
              匿名匹配，即时聊天。找到有缘人，畅聊无界限 ~
            </p>
            <button type="button" className={styles.startButton} onClick={startChat}>
              开始匹配
            </button>
            {hint ? (
              <p className={styles.errorText}>{hint}</p>
            ) : null}
          </div>
          <div className={styles.actionBar}>
            <a
              href="/"
              className={styles.backLink}
              data-chat-back-link
              onClick={handleBackToHome}
            >
              ← 返回工具目录
            </a>
          </div>
        </div>
      )}

      {/* 等待状态：显示加载动画和取消按钮 */}
      {phase === 'waiting' && (
        <div className={`${styles.content} ${styles.fadeIn}`}>
          <div className={styles.waitingContainer}>
            <div className={styles.loadingDots}>
              <div className={styles.loadingDot}></div>
              <div className={styles.loadingDot}></div>
              <div className={styles.loadingDot}></div>
            </div>
            <p className={styles.waitingText}>{hint}</p>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                clearPoll();
                leaveApi(clientIdRef.current);
                setPhase('idle');
                setHint('');
              }}
            >
              取消等待
            </button>
          </div>
          <div className={styles.actionBar}>
            <a
              href="/"
              className={styles.backLink}
              data-chat-back-link
              onClick={handleBackToHome}
            >
              ← 返回工具目录
            </a>
          </div>
        </div>
      )}

      {/* 聊天状态：全屏聊天界面 */}
      {phase === 'chat' && (
        <div className={styles.chatFullscreen} ref={fullscreenRef}>
          <div className={styles.chatContainer}>
            <div className={styles.statusBar}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => { if (!window.confirm('离开将结束当前聊天，对方会收到退出提示。确定要离开吗？')) return; exitChat(true) }}
              >
                ← 退出
              </button>
              <div className={styles.statusDot}></div>
              <span className={styles.statusText}>已连接 · 匿名聊天中 · 请勿泄露个人隐私信息！</span>
            </div>
            <div
              ref={listRef}
              onScroll={handleListScroll}
              className={styles.messagesContainer}
            >
              {messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>👋</div>
                  <span>还没有消息，打个招呼吧~</span>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`${styles.messageWrapper} ${m.mine ? styles.mine : styles.peer}`}
                  >
                    {!m.mine && <span className={styles.messageAvatar}>👤</span>}
                    <span className={`${styles.messageBubble} ${m.mine ? styles.mine : styles.peer}`}>
                      {m.text}
                    </span>
                    {m.mine && <span className={styles.myAvatar}>👤</span>}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
              {showNewMessageHint ? (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className={styles.newMessageHint}
                >
                  有新消息
                </button>
              ) : null}
            </div>
            <div className={styles.inputContainer}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.messageInput}
                  value={input}
                  placeholder="输入消息，按 Enter 发送..."
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                className={styles.sendButton}
                onClick={sendMessage}
                disabled={!input.trim()}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结束状态：显示历史消息和重新匹配按钮 */}
      {phase === 'ended' && (
        <div className={styles.chatFullscreen} ref={fullscreenRef}>
          <div className={styles.chatContainer}>
            <div className={styles.statusBar}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => exitChat(false)}
              >
                ← 返回
              </button>
              <div className={`${styles.statusDot} ${styles.disconnected}`}></div>
              <span className={styles.statusText}>聊天已结束</span>
            </div>
            <div
              ref={listRef}
              onScroll={handleListScroll}
              className={styles.messagesContainer}
            >
              {messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>👋</div>
                  <span>没有消息记录</span>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`${styles.messageWrapper} ${m.mine ? styles.mine : styles.peer}`}
                  >
                    {!m.mine && <span className={styles.messageAvatar}>👤</span>}
                    <span className={`${styles.messageBubble} ${m.mine ? styles.mine : styles.peer}`}>
                      {m.text}
                    </span>
                    {m.mine && <span className={styles.myAvatar}>👤</span>}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <div className={styles.inputContainer} style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className={styles.sendButton}
                onClick={startChat}
              >
                重新匹配
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
