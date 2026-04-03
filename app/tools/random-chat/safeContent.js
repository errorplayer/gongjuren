import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './page.module.css';

const CLIENT_KEY = '520tool-random-chat-client-id';
const POLL_MS = 2000;
const NEAR_BOTTOM_PX = 80;



function getOrCreateClientId() {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(CLIENT_KEY);
  if (!id || id.length < 8) {
    id = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function SafeContent() {
  const router = useRouter();
  const [phase, setPhase] = useState('idle');
  const [hint, setHint] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showNewMessageHint, setShowNewMessageHint] = useState(false);
  const clientIdRef = useRef('');
  const pollRef = useRef(null);
  const channelRef = useRef(null);
  const supabaseRef = useRef(null);
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const phaseRef = useRef('idle');
  const exitChatRef = useRef(async () => { });
  const leaveWaitingRef = useRef(async () => { });
  const fullscreenRef = useRef(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const teardownChannel = useCallback(() => {
    const sb = supabaseRef.current;
    const ch = channelRef.current;
    if (sb && ch) {
      sb.removeChannel(ch);
    }
    channelRef.current = null;
    supabaseRef.current = null;
  }, []);

  const leaveApi = useCallback(async (cid) => {
    if (!cid) return;
    try {
      await fetch('/api/random-chat/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: cid }),
      });
    } catch {
      /* ignore */
    }
  }, []);

  const leaveWaitingAndHome = useCallback(async () => {
    clearPoll();
    await leaveApi(clientIdRef.current);
    setPhase('idle');
    setHint('');
    router.push('/');
  }, [clearPoll, leaveApi, router]);

  const exitChat = useCallback(
    async (notifyPeer) => {
      const cid = clientIdRef.current;
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
      setMessages([]);
      setShowNewMessageHint(false);
      shouldAutoScrollRef.current = true;
      setPhase('idle');
      setHint('');
    },
    [clearPoll, leaveApi, teardownChannel]
  );

  exitChatRef.current = exitChat;
  leaveWaitingRef.current = leaveWaitingAndHome;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const scrollToBottom = useCallback(() => {
    shouldAutoScrollRef.current = true;
    setShowNewMessageHint(false);
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < NEAR_BOTTOM_PX) {
      shouldAutoScrollRef.current = true;
      setShowNewMessageHint(false);
    } else {
      shouldAutoScrollRef.current = false;
    }
  }, []);

  useEffect(() => {
    clientIdRef.current = getOrCreateClientId();
  }, []);

  const sendLeaveBeacon = useCallback(() => {
    const cid = clientIdRef.current;
    const body = JSON.stringify({ clientId: cid });
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/random-chat/leave', blob);
    } else {
      fetch('/api/random-chat/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => { });
    }
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      const p = phaseRef.current;
      if (p === 'chat' || p === 'waiting') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const onPageHide = (ev) => {
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

  useEffect(() => {
    if (phase !== 'chat' && phase !== 'waiting') return;
    if (typeof window === 'undefined') return;
    if (window.history.state?.randomChatGuard) return;
    window.history.pushState({ randomChatGuard: true }, '', window.location.href);
  }, [phase]);

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

  useEffect(() => {
    if (phase !== 'chat') return;

    const onDocClick = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const a = target.closest('a[href]');
      if (!a || a.hasAttribute('data-chat-back-link')) return;
      if (a.target === '_blank' || a.getAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (/^(mailto:|tel:)/i.test(href)) return;

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
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

    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [phase, router]);

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

  useEffect(() => {
    return () => {
      clearPoll();
      teardownChannel();
      leaveApi(clientIdRef.current);
    };
  }, [clearPoll, leaveApi, teardownChannel]);

  useEffect(() => {
    if (phase !== 'chat' && phase !== 'ended') return;
    if (messages.length === 0) return;

    const el = listRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_PX;

    if (nearBottom || shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        setShowNewMessageHint(false);
      });
    } else {
      const last = messages[messages.length - 1];
      if (last && !last.mine) {
        setShowNewMessageHint(true);
      }
    }
  }, [messages, phase]);

  useEffect(() => {
    if (phase !== 'chat') return;
    if (typeof window === 'undefined') return;
    if (!window.visualViewport) return;

    const handleVisualViewportResize = () => {
      const fullscreenEl = fullscreenRef.current;
      if (!fullscreenEl) return;

      const viewport = window.visualViewport;
      const height = viewport.height;

      fullscreenEl.style.height = `${height}px`;
      fullscreenEl.style.paddingBottom = `${window.innerHeight - height}px`;
    };

    window.visualViewport.addEventListener('resize', handleVisualViewportResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewportResize);
    };
  }, [phase]);

  const tryJoin = useCallback(async () => {
    const cid = clientIdRef.current;
    if (!cid) return;

    const res = await fetch('/api/random-chat/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: cid }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setHint(data.error || '暂时无法配对，请稍后重试');
      setPhase('idle');
      clearPoll();
      return;
    }

    if (data.status === 'error') {
      setHint(data.message || '配对出错');
      setPhase('idle');
      clearPoll();
      return;
    }

    if (data.status === 'waiting') {
      setHint('正在等待你的缘分 ...');
      return;
    }

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
      const channel = sb
        .channel(`random-chat:${data.room_id}`, {
          config: { broadcast: { self: true } },
        })
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

  const startChat = useCallback(() => {
    fetch('/api/stats/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: 'random-chat' }),
    }).catch(() => { });

    setPhase('waiting');
    setHint('正在为你排队…');
    tryJoin();
    clearPoll();
    pollRef.current = setInterval(tryJoin, POLL_MS);
  }, [clearPoll, tryJoin]);

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
      <div className={styles.titleSection}>
        <h2>随机聊天室</h2>
        <p className={styles.subtitle}>
          欢迎光临 ~ 在这里你可以匿名随机匹配神秘用户文字聊天，无需登录。消息数据随聊天结束清空；离开或刷新本页面会自动退出队列或房间。
        </p>
      </div>

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
