'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

function generateCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    return { question: `${a} + ${b} = ?`, answer: a + b };
}

function formatTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

    return d.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function GuestbookPage() {
    const [nickname, setNickname] = useState('');
    const [content, setContent] = useState('');
    const [captcha, setCaptcha] = useState(generateCaptcha);
    const [captchaInput, setCaptchaInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [messages, setMessages] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchMessages = useCallback(async () => {
        try {
            const res = await fetch('/api/guestbook');
            const json = await res.json();
            if (json.data) setMessages(json.data);
        } catch (err) {
            console.error('获取留言失败:', err);
        }
    }, []);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const handleSubmit = async () => {
        if (!content.trim()) {
            setErrorMsg('请输入留言内容');
            return;
        }
        if (parseInt(captchaInput) !== captcha.answer) {
            setErrorMsg('验证码错误，请重新计算');
            setCaptcha(generateCaptcha);
            setCaptchaInput('');
            return;
        }

        setSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch('/api/guestbook/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: nickname || '匿名', content }),
            });

            const json = await res.json();

            if (json.error) {
                setErrorMsg(json.error);
            } else {
                setContent('');
                setCaptchaInput('');
                setCaptcha(generateCaptcha());
                fetchMessages();
            }
        } catch (err) {
            setErrorMsg('提交失败，请稍后重试');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container">
        <div className="tool-page" style={{ display: 'block' }}>
            <h2>留言板</h2>
            <div className="tool-content">
                <div className="guestbook-form">
                    <div className="guestbook-row">
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="昵称（可不填，默认匿名）"
                            maxLength={20}
                            className="guestbook-input guestbook-input-nickname"
                        />
                    </div>
                    <div className="guestbook-row">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="写下你想说的话..."
                            maxLength={500}
                            className="guestbook-input guestbook-textarea"
                        />
                        <span className="guestbook-char-count">{content.length}/500</span>
                    </div>
                    <div className="guestbook-row guestbook-captcha-row">
                        <label className="guestbook-captcha-label">{captcha.question}</label>
                        <input
                            type="text"
                            value={captchaInput}
                            onChange={(e) => setCaptchaInput(e.target.value)}
                            placeholder="输入答案"
                            maxLength={4}
                            className="guestbook-input guestbook-captcha-input"
                        />
                        <button
                            className="btn guestbook-refresh"
                            onClick={() => { setCaptcha(generateCaptcha()); setCaptchaInput(''); }}
                            title="换一道题"
                        >
                            换一题
                        </button>
                        <button
                            className="btn"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? '提交中...' : '发表留言'}
                        </button>
                    </div>
                    {errorMsg && <div className="guestbook-error">{errorMsg}</div>}
                </div>

                <div className="guestbook-list">
                    <div className="guestbook-list-title">全部留言</div>
                    {messages.length === 0 ? (
                        <div className="guestbook-empty">还没有留言，来留下第一条吧！</div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className="guestbook-item">
                                <div className="guestbook-item-header">
                                    <span className="guestbook-nickname">{msg.nickname}</span>
                                    <span className="guestbook-time">{formatTime(msg.created_at)}</span>
                                </div>
                                <div className="guestbook-item-content">{msg.content}</div>
                            </div>
                        ))
                    )}
                </div>

                <Link href="/" className="back-btn" style={{ marginTop: '20px' }}>← 返回首页</Link>
            </div>
        </div>
        </div>
    );
}
