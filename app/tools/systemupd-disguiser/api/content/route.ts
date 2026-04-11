import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createHmac, randomBytes } from 'crypto';

const ALLOWED_TYPES = ['win7', 'win10', 'win-qr'];

// 签名密钥（生产环境建议改为环境变量：process.env.TOKEN_SECRET）
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY_SECONDS = 300; // token 5分钟内有效

// 生成 HMAC 签名 token
function generateToken(): { token: string; expiresAt: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', TOKEN_SECRET)
    .update(`${timestamp}.${random}`)
    .digest('hex');
  const token = `${timestamp}.${random}.${signature}`;
  return { token, expiresAt: timestamp + TOKEN_EXPIRY_SECONDS };
}

// 验证 token
function verifyToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [timestampStr, random, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    const now = Math.floor(Date.now() / 1000);

    // 检查是否过期
    if (now - timestamp > TOKEN_EXPIRY_SECONDS) return false;

    // 验证签名
    const expectedSignature = createHmac('sha256', TOKEN_SECRET)
      .update(`${timestamp}.${random}`)
      .digest('hex');

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

// GET: 获取 token
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('action') !== 'token') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { token } = generateToken();
  return NextResponse.json({ token });
}

interface AssetMap {
  [key: string]: string;
}

async function imageToBase64(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mimeType = ext === 'jpg' ? 'jpeg' : ext;
    return `data:image/${mimeType};base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

async function loadResource(type: string) {
  const baseDir = path.join(process.cwd(), 'app/tools/systemupd-disguiser/resources', type);

  const htmlContent = await fs.readFile(path.join(baseDir, 'index.html'), 'utf-8');

  const assets: AssetMap = {};

  if (type === 'win7') {
    assets['win7.jpg'] = await imageToBase64(path.join(baseDir, 'win7.jpg'));
    assets['win7.gif'] = await imageToBase64(path.join(baseDir, 'win7.gif'));
    assets['win7_logo.png'] = await imageToBase64(path.join(baseDir, 'win7_logo.png'));
  } else if (type === 'win-qr') {
    assets['win_err.png'] = await imageToBase64(path.join(baseDir, 'win_err.png'));
  }

  return { htmlContent, assets };
}

export async function POST(request: NextRequest) {
  try {
    const { type, token } = await request.json();

    // 验证 token
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const { htmlContent, assets } = await loadResource(type);

    return NextResponse.json({
      html: htmlContent,
      assets,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error loading resource:', error);
    return NextResponse.json({ error: 'Failed to load resource' }, { status: 500 });
  }
}
