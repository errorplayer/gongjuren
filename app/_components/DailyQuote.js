'use client';

import { useState, useEffect } from 'react';

export default function DailyQuote() {
    const [quote, setQuote] = useState({ text: '加载中...', from: '' });
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('daily-quote-collapsed');
        if (saved === 'true') setCollapsed(true);
    }, []);

    useEffect(() => {
        fetch('https://v1.hitokoto.cn/?c=d&c=h&c=i&c=k')
            .then(res => res.json())
            .then(data => {
                setQuote({
                    text: data.hitokoto,
                    from: data.from_who || data.from || '',
                });
            })
            .catch(() => {
                setQuote({ text: '生活不是等待暴风雨过去，而是学会在雨中翩翩起舞。', from: '佚名' });
            });
    }, []);

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem('daily-quote-collapsed', String(next));
    };

    return (
        <div
            className={`daily-quote${collapsed ? ' collapsed' : ''}`}
            onClick={toggleCollapsed}
            title={collapsed ? '点击展开' : '点击收起'}
        >
            💬 {quote.text}
            {quote.from && <span className="daily-quote-from"> —— {quote.from}</span>}
        </div>
    );
}
