'use client';

import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

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

export default function RandomChatPage() {
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
  const exitChatRef = useRef(async () => {});
  const leaveWaitingRef = useRef(async () => {});

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
      }).catch(() => {});
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
      setHint('正在等待另一位用户…');
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
    }).catch(() => {});

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
      <h2>随机聊天室</h2>
      <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
        欢迎来到牛马茶馆，在这里你可以匿名随机匹配一对一文字聊天，无需登录。消息通过实时通道传递、不会写入数据库；关闭、切换、刷新页面会自动退出队列或房间。
      </p>

      {phase === 'idle' && (
        <div className="tool-content">
          <button type="button" className="btn" onClick={startChat}>
            寻找我的缘分
          </button>
          {hint ? (
            <p style={{ marginTop: '12px', color: '#c0392b' }}>{hint}</p>
          ) : null}
          <a
            href="/"
            className="back-btn"
            data-chat-back-link
            onClick={handleBackToHome}
          >
            ← 返回工具目录
          </a>
        </div>
      )}

      {phase === 'waiting' && (
        <div className="tool-content">
          <p style={{ marginBottom: '12px' }}>{hint}</p>
          <button
            type="button"
            className="btn"
            style={{ background: '#95a5a6' }}
            onClick={() => {
              clearPoll();
              leaveApi(clientIdRef.current);
              setPhase('idle');
              setHint('');
            }}
          >
            取消等待
          </button>
          <a
            href="/"
            className="back-btn"
            data-chat-back-link
            onClick={handleBackToHome}
          >
            ← 返回工具目录
          </a>
        </div>
      )}

      {(phase === 'chat' || phase === 'ended') && (
        <div className="tool-content">
          <p style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>{hint}</p>
          <div
            ref={listRef}
            onScroll={handleListScroll}
            style={{
              position: 'relative',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px',
              paddingBottom: showNewMessageHint && phase === 'chat' ? '44px' : '12px',
              minHeight: '220px',
              maxHeight: '360px',
              overflowY: 'auto',
              background: '#fafafa',
              marginBottom: '12px',
              textAlign: 'left',
            }}
          >
            {messages.length === 0 ? (
              <span style={{ color: '#999' }}>还没有消息，打个招呼吧</span>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    marginBottom: '8px',
                    textAlign: m.mine ? 'right' : 'left',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: m.mine ? '#3498db' : '#ecf0f1',
                      color: m.mine ? '#fff' : '#333',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.text}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
            {showNewMessageHint && phase === 'chat' ? (
              <button
                type="button"
                onClick={scrollToBottom}
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '12px',
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  padding: '8px 16px',
                  borderRadius: '999px',
                  border: '1px solid #cfe8fc',
                  background: '#fff',
                  color: '#3498db',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(52, 152, 219, 0.15)',
                  maxWidth: 'calc(100% - 24px)',
                  whiteSpace: 'nowrap',
                }}
              >
                有新消息
              </button>
            ) : null}
          </div>
          {phase === 'chat' ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <input
                type="text"
                className="input-area"
                style={{ flex: '1 1 200px', minHeight: '42px' }}
                value={input}
                placeholder="输入消息，回车发送"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button type="button" className="btn" onClick={sendMessage}>
                发送
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="btn"
            style={{ background: '#95a5a6' }}
            onClick={() => (phase === 'chat' ? exitChat(true) : exitChat(false))}
          >
            {phase === 'chat' ? '退出聊天' : '返回'}
          </button>
          <a
            href="/"
            className="back-btn"
            data-chat-back-link
            onClick={handleBackToHome}
          >
            ← 返回工具目录
          </a>
        </div>
      )}
    </div>
  );
}
