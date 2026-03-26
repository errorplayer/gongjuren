import { supabase } from '@/lib/supabase';

export const revalidate = 3600; // 1小时缓存

const tagColors = {
    'Hot': { bg: '#fff0f0', color: '#d93025' },
    '突发': { bg: '#fff8f0', color: '#e65100' },
    '科技': { bg: '#f0f7ff', color: '#1565c0' },
    '娱乐': { bg: '#f8f0ff', color: '#7b1fa2' },
    '财经': { bg: '#fffdf0', color: '#f9a825' },
    '体育': { bg: '#f0fff4', color: '#2e7d32' },
    'New': { bg: '#f0fffe', color: '#00838f' },
};

export default async function DailyHot() {
    const { data } = await supabase
        .from('daily_hot')
        .select('title, tag, link')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(12);

    if (!data || data.length === 0) return null;

    return (
        <div className="daily-hot" style={{ overflowX: 'auto' }}>
            {data.map((item, i) => {
                const style = tagColors[item.tag] || { bg: '#f5f5f5', color: '#666' };
                const content = (
                    <span
                        className="daily-hot-tag"
                        style={{ backgroundColor: style.bg, color: style.color }}
                    >
                        {item.tag && <span className="daily-hot-tag-label">{item.tag}</span>}
                        {item.title}
                    </span>
                );

                return item.link ? (
                    <a key={item.id || i} href={item.link} target="_blank" rel="noopener noreferrer" className="daily-hot-link">
                        {content}
                    </a>
                ) : (
                    <span key={item.id || i}>{content}</span>
                );
            })}
        </div>
    );
}
