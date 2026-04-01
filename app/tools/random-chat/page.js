'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

const CLIENT_KEY = '520tool-random-chat-client-id';
const POLL_MS = 2000;

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
  const [phase, setPhase] = useState('idle');
  const [hint, setHint] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const clientIdRef = useRef('');
  const pollRef = useRef(null);
  const channelRef = useRef(null);
  const supabaseRef = useRef(null);

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
      setPhase('idle');
      setHint('');
    },
    [clearPoll, leaveApi, teardownChannel]
  );

  useEffect(() => {
    clientIdRef.current = getOrCreateClientId();
  }, []);

  useEffect(() => {
    const cid = clientIdRef.current;
    const onUnload = () => {
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
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearPoll();
      teardownChannel();
      leaveApi(clientIdRef.current);
    };
  }, [clearPoll, leaveApi, teardownChannel]);

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
        匿名随机匹配一对一文字聊天，无需登录。为节省成本，消息通过实时通道传递、不会写入数据库；关闭页面会自动退出队列或房间。
      </p>

      {phase === 'idle' && (
        <div className="tool-content">
          <button type="button" className="btn" onClick={startChat}>
            进入聊天
          </button>
          {hint ? (
            <p style={{ marginTop: '12px', color: '#c0392b' }}>{hint}</p>
          ) : null}
          <Link href="/" className="back-btn">
            ← 返回工具目录
          </Link>
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
          <Link href="/" className="back-btn">
            ← 返回工具目录
          </Link>
        </div>
      )}

      {(phase === 'chat' || phase === 'ended') && (
        <div className="tool-content">
          <p style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>{hint}</p>
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px',
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
          <Link href="/" className="back-btn">
            ← 返回工具目录
          </Link>
        </div>
      )}
    </div>
  );
}
