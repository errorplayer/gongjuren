import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPrefs } from '@/lib/user-prefs';
import styles from './page.module.css';

/**
 * 常量配置
 */
// localStorage 中存储客户端 ID 的键名
const CLIENT_KEY = '520tool-random-chat-client-id';
// localStorage 中存储当前房间 ID 的键名（用于判断断线重连）
const ROOM_KEY = '520tool-random-chat-room-id';
// 轮询匹配间隔（毫秒）
const POLL_MS = 2000;
// 心跳检查间隔（毫秒）- 用于检测对方是否已离开
const HEARTBEAT_MS = 8000;
// 心跳上报间隔（毫秒）- 定期告诉服务器"我还在"
const HEARTBEAT_SEND_MS = 15000;
// 距离底部多少像素内视为"接近底部"，用于自动滚动判断
const NEAR_BOTTOM_PX = 80;


/**
 * 获取或创建客户端唯一标识符
 * 该 ID 用于识别用户身份，存储在 localStorage 中持久化
 * @returns {string} 客户端唯一 ID
 */
/**
 * 验证 UUID 格式是否有效
 * @param {string} id - 待验证的 ID
 * @returns {boolean} 是否为有效的 UUID v4 格式
 */
function isValidUUID(id) {
  if (typeof id !== 'string') return false;
  // UUID v4 正则表达式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * 生成新的 UUID v4
 * @returns {string} 生成的 UUID
 */
function generateUUID() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 回退方案: 手动生成符合 UUID v4 规范的 ID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 获取或创建客户端唯一标识符
 * 该 ID 用于识别用户身份，存储在 localStorage 中持久化
 * @returns {string} 客户端唯一 ID
 */
function getOrCreateClientId() {
  if (typeof window === 'undefined') return '';

  let id = window.localStorage.getItem(CLIENT_KEY);

  // 验证已存在的 ID 是否有效，无效则重新生成
  if (!isValidUUID(id)) {
    id = generateUUID();
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
  const historyGuardCountRef = useRef(0);

  // 自定义确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  });

  /**
   * Ref 定义（用于在回调函数中访问最新值或跨生命周期保存状态）
   */
  const clientIdRef = useRef('');           // 客户端唯一 ID
  const pollRef = useRef(null);             // 轮询定时器引用
  const heartbeatRef = useRef(null);        // 心跳上报定时器引用
  const channelRef = useRef(null);          // Supabase 实时频道引用
  const supabaseRef = useRef(null);         // Supabase 客户端引用
  const listRef = useRef(null);             // 消息列表 DOM 引用
  const bottomRef = useRef(null);           // 消息列表底部锚点引用
  const shouldAutoScrollRef = useRef(true); // 是否应该自动滚动到底部
  const phaseRef = useRef('idle');          // phase 的可变引用（用于事件监听器中读取最新状态）
  const exitChatRef = useRef(async () => { });   // 退出聊天的回调引用
  const leaveWaitingRef = useRef(async () => { }); // 退出等待的回调引用
  const fullscreenRef = useRef(null);       // 全屏容器 DOM 引用（用于处理移动端键盘）
  const nicknameRef = useRef('游客');      // 用户昵称引用

  /**
   * 清除轮询定时器
   */
  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // 添加历史守卫（缓冲多个状态）
  const addHistoryGuards = useCallback(() => {
    const GUARD_STATES = 3;
    for (let i = 0; i < GUARD_STATES; i++) {
      window.history.pushState({ randomChatGuard: true }, '', window.location.href);
    }
    historyGuardCountRef.current = GUARD_STATES;
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
    // 清除当前房间 ID，标识用户已离开聊天
    try {
      localStorage.removeItem(ROOM_KEY);
    } catch { /* ignore */ }
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
   * 心跳检查房间状态
   * 用于检测对方是否已离开（通过检查房间的 ended_at 状态）
   * @param {string} cid - 客户端 ID
   * @returns {Promise<boolean>} 返回 true 表示房间仍活跃，false 表示已结束或不存在
   */
  const checkRoomAlive = useCallback(async (cid) => {
    if (!cid) return false;
    try {
      const res = await fetch('/api/random-chat/check-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: cid }),
      });
      const data = await res.json();
      // API 返回 { active: boolean }
      return data?.active === true;
    } catch {
      return false;
    }
  }, []);

  /**
   * 清除心跳上报定时器
   */
  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  /**
   * 向服务器发送心跳，表明自己仍然在线
   * @param {string} cid - 客户端 ID
   */
  const sendHeartbeat = useCallback(async (cid) => {
    if (!cid) return;
    try {
      await fetch('/api/random-chat/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: cid }),
      });
    } catch {
      /* 心跳失败不影响用户体验 */
    }
  }, []);

  /**
   * 退出等待状态并返回首页
   * 用于取消排队时清理状态
   */
  const leaveWaitingAndHome = useCallback(async () => {
    clearPoll();
    clearHeartbeat();
    await leaveApi(clientIdRef.current);
    setPhase('idle');
    setHint('');
    router.push('/');
  }, [clearPoll, clearHeartbeat, leaveApi, router]);

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
      clearHeartbeat();
      await leaveApi(cid);
      clearPoll();
      // 重置所有聊天相关状态
      setMessages([]);
      setShowNewMessageHint(false);
      shouldAutoScrollRef.current = true;
      setPhase('idle');
      setHint('');
    },
    [clearPoll, clearHeartbeat, leaveApi, teardownChannel]
  );

  // 将回调保存到 ref 中，以便在事件监听器中调用
  exitChatRef.current = exitChat;
  leaveWaitingRef.current = leaveWaitingAndHome;

  // 同步 phase 状态到 ref，方便在闭包中获取最新值
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // 管理 body 类名：聊天激活时隐藏标题并阻止页面滚动
  useEffect(() => {
    if (phase === 'chat' || phase === 'ended') {
      document.body.classList.add('chat-active');
    } else {
      document.body.classList.remove('chat-active');
    }
    return () => document.body.classList.remove('chat-active');
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

  // 初始化昵称
  useEffect(() => {
    const prefs = getPrefs();
    nicknameRef.current = prefs?.nickname || '游客';
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
   * 使用多守卫缓冲机制，解决iOS左滑延迟问题
   */
  useEffect(() => {
    if (phase === 'chat' || phase === 'waiting') {
      if (historyGuardCountRef.current === 0) {
        addHistoryGuards();
      }
    } else {
      historyGuardCountRef.current = 0;
    }
  }, [phase, addHistoryGuards]);

  /**
   * 处理浏览器后退事件
   * 使用多守卫缓冲机制，每次消耗一个守卫，守卫耗尽后才弹确认框
   */
  useEffect(() => {
    const onPopState = (e) => {
      const p = phaseRef.current;
      if (p !== 'chat' && p !== 'waiting') return;
      e.preventDefault();
      e.stopPropagation();

      if (window.history.state?.randomChatGuard) {
        historyGuardCountRef.current -= 1;

        if (historyGuardCountRef.current > 0) {
          window.history.pushState({ randomChatGuard: true }, '', window.location.href);
          return;
        }

        if (p === 'chat') {
          setConfirmDialog({
            show: true,
            title: '确认离开',
            message: '离开将结束当前聊天，对方会收到退出提示。确定要离开吗？',
            onConfirm: async () => {
              setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
              historyGuardCountRef.current = 0;
              await exitChatRef.current(true);
              router.push('/');
            },
            onCancel: () => {
              setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
              addHistoryGuards();
            },
          });
        } else if (p === 'waiting') {
          setConfirmDialog({
            show: true,
            title: '确认离开',
            message: '将退出排队，确定要离开吗？',
            onConfirm: () => {
              setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
              historyGuardCountRef.current = 0;
              leaveWaitingRef.current();
            },
            onCancel: () => {
              setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
              addHistoryGuards();
            },
          });
        }
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [router, addHistoryGuards]);

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
      setConfirmDialog({
        show: true,
        title: '确认离开',
        message: '离开将结束当前聊天，对方会收到退出提示。确定要离开吗？',
          onConfirm: async () => {
            setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
            historyGuardCountRef.current = 0;
            await exitChatRef.current(true);
            router.push(url.pathname + url.search + url.hash);
          },
          onCancel: () => {
            setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
            // 重新添加历史守卫
            addHistoryGuards();
          },
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
        setConfirmDialog({
          show: true,
          title: '确认返回',
          message: '离开将结束当前聊天，对方会收到退出提示。确定返回工具目录吗？',
          onConfirm: async () => {
            setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
            historyGuardCountRef.current = 0;
            await exitChat(true);
            router.push('/');
          },
          onCancel: () => {
            setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
            // 重新添加历史守卫
            addHistoryGuards();
          },
        });
        return;
      }
      if (phase === 'waiting') {
        setConfirmDialog({
          show: true,
          title: '确认返回',
          message: '将退出排队，确定返回工具目录吗？',
          onConfirm: async () => {
            setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
            historyGuardCountRef.current = 0;
            await leaveWaitingAndHome();
          },
          onCancel: () => {
            setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
            // 重新添加历史守卫
            addHistoryGuards();
          },
        });
        return;
      }
      router.push('/');
    },
    [phase, exitChat, router, leaveWaitingAndHome, addHistoryGuards]
  );

  /**
   * 组件卸载时的清理逻辑
   * 清理轮询、频道、通知后端等资源
   */
  useEffect(() => {
    return () => {
      clearPoll();
      clearHeartbeat();
      teardownChannel();
      leaveApi(clientIdRef.current);
    };
  }, [clearPoll, clearHeartbeat, leaveApi, teardownChannel]);

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
 * 处理移动端虚拟键盘弹出（强化版）
 * 使用 visualViewport API + 手动滚动 + 防抖 + 回退方案
 */
  useEffect(() => {
    if (phase !== 'chat') return;
    if (typeof window === 'undefined') return;

    // 防抖函数，避免频繁触发
    const debounce = (fn, delay) => {
      let timer = null;
      return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    };

    // 强化版滚动函数：确保输入框可见
    const ensureInputVisible = () => {
      const input = document.querySelector(`.${styles.messageInput}`);
      const messagesContainer = document.querySelector(`.${styles.messagesContainer}`);
      const fullscreenEl = fullscreenRef.current;

      if (!input || !messagesContainer || !fullscreenEl) return;

      // 方法1：使用 scrollIntoView（首选），确保输入框在视口中部
      try {
        input.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        // 额外保险：延迟检查并手动调整（针对iOS键盘弹出延迟）
        setTimeout(() => {
          const inputRect = input.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          // 如果输入框仍然在底部1/3区域（被键盘遮挡）
          if (inputRect.bottom > viewportHeight * 0.65) {
            const scrollAmount = inputRect.bottom - viewportHeight * 0.65 + 50;
            messagesContainer.scrollTop += scrollAmount;
          }
        }, 100);
      } catch (e) {
        // 方法2：手动计算滚动位置（回退方案）
        const inputRect = input.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // 如果输入框底部接近视口底部（被键盘遮挡）
        if (inputRect.bottom > viewportHeight * 0.65) {
          const scrollAmount = inputRect.bottom - viewportHeight * 0.65 + 50;
          messagesContainer.scrollTop += scrollAmount;
        }
      }
    };

    // 处理 visualViewport 变化（强化版）
    const handleVisualViewportResize = () => {
      const fullscreenEl = fullscreenRef.current;
      if (!fullscreenEl) return;

      // 如果有 visualViewport API 则使用
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        const height = viewport.height;
        const keyboardHeight = window.innerHeight - height;

        // 关键修改：通过 bottom 而非 height + paddingBottom 调整
        fullscreenEl.style.bottom = `${keyboardHeight}px`;
        fullscreenEl.style.top = '0';

        // 确保输入框可见
        ensureInputVisible();
      } else {
        // 回退方案：基于窗口大小变化
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          // 移动设备：假设键盘高度为视口高度的40%
          const assumedKeyboardHeight = window.innerHeight * 0.4;
          fullscreenEl.style.bottom = `${assumedKeyboardHeight}px`;
          ensureInputVisible();
        }
      }
    };

    // 防抖处理（减少延迟以更快响应键盘弹出）
    const debouncedResizeHandler = debounce(handleVisualViewportResize, 30);

    // 监听多种事件以确保触发
    const events = ['resize', 'orientationchange', 'focusin', 'focus'];

    // 添加 visualViewport 事件监听（如果可用）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', debouncedResizeHandler);
    }

    // 添加传统事件监听作为备份
    events.forEach(event => {
      window.addEventListener(event, debouncedResizeHandler);
    });

    // 初始执行一次（更快触发）
    setTimeout(handleVisualViewportResize, 50);

    // 清理函数
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', debouncedResizeHandler);
      }
      events.forEach(event => {
        window.removeEventListener(event, debouncedResizeHandler);
      });
    };
  }, [phase]);


  /**
 * 处理输入框获得焦点（强化版）
 * 多事件监听 + 重试机制 + 超时处理
 */
  useEffect(() => {
    if (phase !== 'chat') return;

    const ensureInputVisibleWithRetry = (retryCount = 0) => {
      const input = document.querySelector(`.${styles.messageInput}`);
      const messagesContainer = document.querySelector(`.${styles.messagesContainer}`);

      if (!input || !messagesContainer) {
        // 如果元素不存在，重试最多3次
        if (retryCount < 3) {
          setTimeout(() => ensureInputVisibleWithRetry(retryCount + 1), 100 * (retryCount + 1));
        }
        return;
      }

      // 方法1：使用 scrollIntoView 确保输入框在视口中部（最可靠）
      try {
        input.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        // 额外保险：延迟检查并手动调整（针对iOS键盘弹出延迟）
        setTimeout(() => {
          const inputRect = input.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          // 如果输入框仍然在底部1/3区域（被键盘遮挡）
          if (inputRect.bottom > viewportHeight * 0.65) {
            const safeAreaTop = viewportHeight * 0.5;
            const distance = inputRect.bottom - safeAreaTop + 50;

            // 滚动消息容器，使输入框可见
            messagesContainer.scrollTop = messagesContainer.scrollTop + distance;
          }
        }, 150);
      } catch (e) {
        console.warn('滚动失败:', e);

        // 回退方案：手动计算滚动
        const inputRect = input.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        if (inputRect.bottom > viewportHeight * 0.65) {
          const scrollAmount = inputRect.bottom - viewportHeight * 0.65 + 50;
          messagesContainer.scrollTop += scrollAmount;
        }
      }
    };

    const handleInputFocus = (event) => {
      // 不阻止默认行为，允许输入框正常获得焦点

      // 使用requestAnimationFrame确保在下一帧执行
      requestAnimationFrame(() => {
        // 立即尝试一次
        ensureInputVisibleWithRetry(0);

        // 延迟再次尝试（应对键盘动画，但减少延迟）
        setTimeout(() => ensureInputVisibleWithRetry(0), 200);
        setTimeout(() => ensureInputVisibleWithRetry(0), 400);
      });
    };

    // 监听输入框焦点事件
    const inputs = document.querySelectorAll(`.${styles.messageInput}`);
    inputs.forEach(input => {
      // 移除可能存在的旧监听器
      input.removeEventListener('focus', handleInputFocus);
      // 添加新监听器，使用capture阶段确保触发
      input.addEventListener('focus', handleInputFocus, { capture: true });
    });

    // 同时监听focusin事件（bubble版本）
    document.addEventListener('focusin', handleInputFocus);

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', handleInputFocus, { capture: true });
      });
      document.removeEventListener('focusin', handleInputFocus);
    };
  }, [phase]);

  /**
 * iOS特定修复：防止双击缩放和输入框问题
 */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isIOS) return;

    // 防止双击缩放
    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // 防止iOS输入框自动放大
    const preventZoomOnFocus = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // 查找现有的viewport meta标签
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        if (!viewportMeta) {
          // 如果不存在，创建一个
          viewportMeta = document.createElement('meta');
          viewportMeta.name = 'viewport';
          document.head.appendChild(viewportMeta);
        }

        // 读取当前content
        let currentContent = viewportMeta.getAttribute('content') || '';
        
        // 确保包含关键属性，同时保留其他属性
        const requiredAttrs = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
        
        // 如果缺少任何必需属性，则更新
        const hasRequired = requiredAttrs.split(', ').every(attr => currentContent.includes(attr.split('=')[0]));
        if (!hasRequired) {
          viewportMeta.setAttribute('content', requiredAttrs);
        }
      }
    };

    // 恢复视口设置
    const restoreViewport = () => {
      setTimeout(() => {
        document.querySelector('meta[name="viewport"]')?.setAttribute(
          'content',
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
        );
      }, 1000);
    };

    document.addEventListener('touchend', preventDoubleTapZoom);
    document.addEventListener('focusin', preventZoomOnFocus);
    document.addEventListener('focusout', restoreViewport);

    // 确保退出按钮在键盘弹出时仍可点击
    const ensureExitButtonClickable = () => {
      const backButtons = document.querySelectorAll(`.${styles.backButton}`);
      backButtons.forEach(btn => {
        if (btn) {
          btn.style.touchAction = 'manipulation';
          btn.style.cursor = 'pointer';
          btn.style.zIndex = '100'; // 确保按钮在键盘上方
        }
      });
    };

    // 在键盘相关事件后调用
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', ensureExitButtonClickable);
    }

    return () => {
      document.removeEventListener('touchend', preventDoubleTapZoom);
      document.removeEventListener('focusin', preventZoomOnFocus);
      document.removeEventListener('focusout', restoreViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', ensureExitButtonClickable);
      }
    };
  }, []);




  /**
   * 尝试加入匹配队列或检查配对结果
   * 周期性调用的轮询函数
   */
  const tryJoin = useCallback(async () => {
    const cid = clientIdRef.current;
    if (!cid) return;

    // 相位守卫：如果已经不在等待状态了，忽略返回结果
    // 解决取消等待后，已发送的请求返回导致的竞态条件
    if (phaseRef.current !== 'waiting') return;

    const res = await fetch('/api/random-chat/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: cid }),
    });

    const data = await res.json().catch(() => ({}));

    // 再次检查相位：请求过程中可能已经取消了
    if (phaseRef.current !== 'waiting') return;

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

      // 用 localStorage 判断是否真正断线重连：
      // - 真正重连：localStorage 中有 roomId（新匹配：没有）
      // - API 返回的 reconnected 字段不可靠（SQL 查询时机问题会导致误判）
      let isTrueReconnect = false;
      try {
        const savedRoomId = localStorage.getItem(ROOM_KEY);
        isTrueReconnect = data.reconnected && savedRoomId === String(data.room_id);
      } catch { /* ignore */ }

      // 进入聊天前先保存 roomId，表明用户已进入聊天状态
      try {
        localStorage.setItem(ROOM_KEY, String(data.room_id));
      } catch { /* ignore */ }

      setPhase('chat');
      setHint('已匹配，开始聊天（消息不会保存到服务器）');

      // 真正重连时，给 A 显示系统提示
      if (isTrueReconnect) {
        setMessages([{
          id: `sys-${Date.now()}`,
          text: '你已重新回到对话，之前的聊天记录已不可见',
          system: true,
        }]);
      } else {
        setMessages([]);
      }

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
          const nickname = payload?.nickname;
          if (typeof text !== 'string' || !from) return;
          setMessages((m) => [
            ...m,
            {
              id: `${Date.now()}-${Math.random()}`,
              text,
              mine: from === cid,
              nickname: from === cid ? nicknameRef.current : nickname || '游客',
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
        // 监听对方重新连接事件
        .on('broadcast', { event: 'peer_reconnected' }, () => {
          setMessages((m) => [
            ...m,
            {
              id: `sys-${Date.now()}`,
              text: '对方已重新连接',
              system: true,
            },
          ]);
        })
        .subscribe((status) => {
          // 频道订阅成功后，如果是真正重连，通知对方
          if (status === 'SUBSCRIBED' && isTrueReconnect) {
            channel.send({ type: 'broadcast', event: 'peer_reconnected', payload: {} });
          }
        });

      channelRef.current = channel;

      // 立即发送一次心跳，然后每 15 秒上报一次
      sendHeartbeat(cid);
      heartbeatRef.current = setInterval(() => sendHeartbeat(cid), HEARTBEAT_SEND_MS);

      // 启动心跳检查，定期检测对方是否已离开
      let failCount = 0;
      const MAX_FAIL = 3; // 连续失败 3 次才判定对方离开（容错网络抖动）
      pollRef.current = setInterval(async () => {
        const p = phaseRef.current;
        // 只有在聊天状态下才检查
        if (p !== 'chat') {
          clearPoll();
          return;
        }
        const isAlive = await checkRoomAlive(cid);
        if (isAlive) {
          failCount = 0; // 房间正常，重置失败计数
        } else {
          failCount += 1;
          if (failCount >= MAX_FAIL) {
            // 连续多次检查房间不活跃，判定对方已离开
            clearPoll();
            setHint('对方已离开');
            setPhase('ended');
            teardownChannel();
            await leaveApi(cid);
          }
        }
      }, HEARTBEAT_MS);
    }
  }, [clearPoll, leaveApi, teardownChannel, checkRoomAlive]);

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
      payload: { text, from: cid, nickname: nicknameRef.current },
    });
    setInput('');
  }, [input]);

  return (
    <div className="tool-page" style={{ display: 'block' }}>
      {/* 页面标题区域 */}
      <div className={styles.titleSection}>
        <h2>随机聊天室</h2>
        <p className={styles.subtitle}>
          欢迎光临 ~ 在这里你可以匿名随机匹配神秘用户文字聊天，无需登录。消息数据随聊天结束清空；离开本页面可能会丢失聊天数据。
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
                onClick={handleBackToHome}
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
                  m.system ? (
                    <div key={m.id} className={`${styles.messageWrapper} ${styles.system}`}>
                      <span className={`${styles.messageBubble} ${styles.system}`}>
                        {m.text}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={m.id}
                      className={`${styles.messageWrapper} ${m.mine ? styles.mine : styles.peer}`}
                    >
                      {!m.mine && (
                        <span className={styles.messageAvatar}>
                          {m.nickname !== '游客' ? (
                            <span className={styles.nicknameLabel}>{m.nickname}</span>
                          ) : '👤'}
                        </span>
                      )}
                      <span className={`${styles.messageBubble} ${m.mine ? styles.mine : styles.peer}`}>
                        {m.text}
                      </span>
                      {m.mine && (
                        <span className={styles.myAvatar}>
                          {m.nickname !== '游客' ? (
                            <span className={styles.nicknameLabel}>{m.nickname}</span>
                          ) : '👤'}
                        </span>
                      )}
                    </div>
                  )
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
                onClick={handleBackToHome}
              >
                ← 返回
              </button>
              <div className={`${styles.statusDot} ${styles.disconnected}`}></div>
              <span className={styles.statusText}>对方已离开 | 聊天结束</span>
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
                  m.system ? (
                    <div key={m.id} className={`${styles.messageWrapper} ${styles.system}`}>
                      <span className={`${styles.messageBubble} ${styles.system}`}>
                        {m.text}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={m.id}
                      className={`${styles.messageWrapper} ${m.mine ? styles.mine : styles.peer}`}
                    >
                      {!m.mine && (
                        <span className={styles.messageAvatar}>
                          {m.nickname !== '游客' ? (
                            <span className={styles.nicknameLabel}>{m.nickname}</span>
                          ) : '👤'}
                        </span>
                      )}
                      <span className={`${styles.messageBubble} ${m.mine ? styles.mine : styles.peer}`}>
                        {m.text}
                      </span>
                      {m.mine && (
                        <span className={styles.myAvatar}>
                          {m.nickname !== '游客' ? (
                            <span className={styles.nicknameLabel}>{m.nickname}</span>
                          ) : '👤'}
                        </span>
                      )}
                    </div>
                  )
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

      {/* 自定义确认对话框 */}
      {confirmDialog.show && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmTitle}>{confirmDialog.title}</div>
            <div className={styles.confirmMessage}>{confirmDialog.message}</div>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={confirmDialog.onCancel}
              >
                取消
              </button>
              <button
                type="button"
                className={styles.confirmOk}
                onClick={confirmDialog.onConfirm}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
