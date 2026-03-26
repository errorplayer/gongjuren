// app/api/guestbook/route.js
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('guestbook')
            .select('id, nickname, content, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('获取留言失败:', error);
            return Response.json({ error: '获取留言失败' }, { status: 500 });
        }

        return Response.json({ data });
    } catch (err) {
        console.error('请求异常:', err);
        return Response.json({ error: '请求异常' }, { status: 500 });
    }
}
