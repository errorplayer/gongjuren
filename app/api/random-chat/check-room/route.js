import { createSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : '';
    if (clientId.length < 8) {
      return Response.json({ error: 'invalid clientId' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    if (!admin) {
      return Response.json(
        { error: '服务端未配置 SUPABASE_SERVICE_ROLE_KEY' },
        { status: 503 }
      );
    }

    const { data, error } = await admin.rpc('random_chat_check_room', { p_client: clientId });
    if (error) {
      console.error('random_chat_check_room', error);
      return Response.json({ error: '检查房间失败' }, { status: 500 });
    }

    // Supabase RPC 返回的是数组，取第一个元素并转为前端需要的对象格式
    const row = Array.isArray(data) ? data[0] : data;
    return Response.json({
      active: row?.active === true,
      room_id: row?.room_id ?? null,
      ended_at: row?.ended_at ?? null,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: '请求异常' }, { status: 500 });
  }
}
