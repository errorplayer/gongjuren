import { NextResponse } from 'next/server';
import { getProvider } from './providers';
import config from './config';
import { logUsage, logError } from './logger';
import { rateLimiter } from './rateLimit';

export const runtime = 'edge';

export async function POST(request) {
  try {
    // 限流检查
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitResult = await rateLimiter.check(ip);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { text, scene, provider = 'kimi', userProfile = {} } = body;

    // 参数校验
    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '请输入需要润色的文本' },
        { status: 400 }
      );
    }

    if (!scene) {
      return NextResponse.json(
        { error: '请选择润色场景' },
        { status: 400 }
      );
    }

    // 验证场景是否存在
    if (!config.scenes.includes(scene)) {
      return NextResponse.json(
        { error: '无效的润色场景' },
        { status: 400 }
      );
    }

    // 验证provider
    const providerInstance = getProvider(provider);
    if (!providerInstance) {
      return NextResponse.json(
        { error: '不支持的AI模型' },
        { status: 400 }
      );
    }

    // 调用AI
    const result = await providerInstance.polish(text, scene, userProfile);

    // 记录使用日志
    await logUsage({
      ip,
      scene,
      provider,
      inputLength: text.length,
      outputLength: result.length,
      success: true,
    });

    return NextResponse.json({
      success: true,
      result,
      provider,
      scene,
    });
  } catch (error) {
    console.error('Resume polish API error:', error);

    // 记录错误日志
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    await logError({
      ip,
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: error.message || '处理失败，请重试',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
