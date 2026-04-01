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

    const { data, error } = await admin.rpc('random_chat_try_pair', {
      p_client: clientId,
    });

    if (error) {
      console.error('random_chat_try_pair', error);
      return Response.json({ error: '配对失败' }, { status: 500 });
    }

    return Response.json(data);
  } catch (e) {
    console.error(e);
    return Response.json({ error: '请求异常' }, { status: 500 });
  }
}
