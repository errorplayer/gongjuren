// app/api/stats/use/route.js
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { tool_id } = await request.json();

        if (!tool_id) {
            return Response.json({ error: '缺少 tool_id' }, { status: 400 });
        }

        // 先读取当前值
        const { data: row, error: fetchError } = await supabase
            .from('tool_stats')
            .select('use_count')
            .eq('id', tool_id)
            .single();

        if (fetchError) {
            console.error('查询失败:', fetchError);
            return Response.json({ error: '查询失败' }, { status: 500 });
        }

        // 再写入新值
        const { error: updateError } = await supabase
            .from('tool_stats')
            .update({ use_count: (row.use_count || 0) + 1 })
            .eq('id', tool_id);

        if (updateError) {
            console.error('更新失败:', updateError);
            return Response.json({ error: '更新失败' }, { status: 500 });
        }

        return Response.json({ success: true });
    } catch (err) {
        console.error('请求异常:', err);
        return Response.json({ error: '请求异常' }, { status: 500 });
    }
}
