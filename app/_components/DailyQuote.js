'use client';

import { useState, useEffect } from 'react';

export default function DailyQuote() {
    const [quote, setQuote] = useState({ text: '加载中...', from: '' });

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

    return (
        <div className="daily-quote">
            💬 {quote.text}
            {quote.from && <span className="daily-quote-from"> —— {quote.from}</span>}
        </div>
    );
}
