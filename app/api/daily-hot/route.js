import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('daily_hot')
            .select('title, tag, link')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .limit(12);

        if (error) {
            return Response.json({ error: '获取热搜失败' }, { status: 500 });
        }

        return Response.json({ data: data || [] });
    } catch (err) {
        return Response.json({ data: [] });
    }
}
