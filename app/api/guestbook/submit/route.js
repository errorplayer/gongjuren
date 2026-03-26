// app/api/guestbook/submit/route.js
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { nickname, content } = await request.json();

        if (!content || content.trim().length === 0) {
            return Response.json({ error: '留言内容不能为空' }, { status: 400 });
        }

        if (content.length > 500) {
            return Response.json({ error: '留言内容不能超过500字' }, { status: 400 });
        }

        const { error } = await supabase
            .from('guestbook')
            .insert({
                nickname: (nickname || '').trim().slice(0, 20) || '匿名',
                content: content.trim(),
            });

        if (error) {
            console.error('提交留言失败:', error);
            return Response.json({ error: '提交留言失败' }, { status: 500 });
        }

        return Response.json({ success: true });
    } catch (err) {
        console.error('请求异常:', err);
        return Response.json({ error: '请求异常' }, { status: 500 });
    }
}
