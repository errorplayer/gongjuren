'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDeviceType } from '@/lib/useDeviceType';

export default function DeviceRedirect({ targetPath }) {
  const isMobile = useDeviceType();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 还没检测完设备类型，不执行任何跳转
    if (isMobile === null) return;

    // 只处理一种情况：桌面端在首页 → 跳转到 PC 版
    if (!isMobile && pathname === '/') {
      router.replace('/v2/pc');
    }
    // 移动端不做任何重定向
  }, [isMobile, pathname, router]);

  // 不渲染任何内容，只做重定向
  return null;
}
