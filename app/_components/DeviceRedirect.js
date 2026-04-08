'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDeviceType } from '@/lib/useDeviceType';

export default function DeviceRedirect({ targetPath }) {
  const isMobile = useDeviceType();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 在客户端挂载后执行
    if (isMobile) {
      if (pathname === '/v2/pc') {
        router.replace('/');
      }
    } else {
      if (pathname === '/') {
        router.replace('/v2/pc');
      }
    }
  }, [isMobile, pathname, router]);

  // 不渲染任何内容，只做重定向
  return null;
}
