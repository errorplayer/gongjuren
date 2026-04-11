import { useEffect, useRef, useState } from 'react';

const TOOL_OPTIONS = [
  {
    id: 'win7',
    label: 'Windows 7 系统升级',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    id: 'win10',
    label: 'Windows 10/11 系统升级',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
  },
  {
    id: 'win-qr',
    label: 'Windows 蓝屏配二维码',
    bgColor: 'bg-blue-900',
    textColor: 'text-white',
  },
];

export default function SafeContent() {
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef<HTMLElement[]>([]);
  const intervalRef = useRef<(number | NodeJS.Timeout)[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const cleanupDisguise = () => {
    const overlay = document.getElementById('fullscreen-lock-overlay');
    if (overlay) overlay.remove();
    injectedRef.current.forEach((el) => el.remove());
    injectedRef.current = [];
    // 清除注入脚本创建的所有 setInterval
    intervalRef.current.forEach((id) => clearInterval(id));
    intervalRef.current = [];
    setIsLocked(false);
  };

  // 获取签名 token
  const getToken = async (): Promise<string> => {
    const response = await fetch('/tools/systemupd-disguiser/api/content?action=token');
    const data = await response.json();
    return data.token;
  };

  const enterFullscreen = async (type: string) => {
    const elem = document.documentElement;

    // 使用量统计
    fetch('/api/stats/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: 'systemupd-disguiser' })
    }).catch(() => {});

    try {
      setLoading(true);

      // 先获取 token，再携带 token 请求资源
      const token = await getToken();

      const response = await fetch('/tools/systemupd-disguiser/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, token }),
      });

      if (!response.ok) throw new Error('Failed to load');

      const data = await response.json();
      setLoading(false);

      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }

      const overlay = document.createElement('div');
      overlay.id = 'fullscreen-lock-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 999999 !important;
        margin: 0;
        padding: 0;
      `;

      const container = document.createElement('div');
      container.id = 'disguise-container';

      let htmlContent = data.html;
      // 替换资源文件为 base64（覆盖 src 属性和 css url() 两种写法）
      for (const [filename, base64Data] of Object.entries(data.assets)) {
        // 替换 <img src="filename"> 等 HTML 属性
        htmlContent = htmlContent.replace(
          new RegExp(`src="${filename}"`, 'g'),
          `src="${base64Data}"`
        );
        // 替换 CSS 中 url(filename) 的背景图引用（如 background: url(win7.jpg)）
        htmlContent = htmlContent.replace(
          new RegExp(`url\\(${filename}\\)`, 'g'),
          `url(${base64Data})`
        );
      }




      // 解析 HTML，提取样式、脚本和 body 内容
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // 提取 <style> 标签内容并注入到 document.head
      const styles = doc.querySelectorAll('style');
      let bodyFullCss = ''; // 存储 body 完整的 CSS 属性
      styles.forEach((style) => {
        const cssText = style.textContent || '';

        // 从 CSS 文本中提取 body 规则里的所有属性
        const bodyRuleMatch = cssText.match(/body\s*\{([^}]*)\}/);
        if (bodyRuleMatch) {
          bodyFullCss = bodyRuleMatch[1];
        }

        const newStyle = document.createElement('style');
        newStyle.textContent = cssText;
        newStyle.setAttribute('data-disguiser', 'true');
        document.head.appendChild(newStyle);
        injectedRef.current.push(newStyle);
      });

      // 提取 <link> 标签并注入到 document.head
      const links = doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
      links.forEach((link) => {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = link.href;
        newLink.setAttribute('data-disguiser', 'true');
        document.head.appendChild(newLink);
        injectedRef.current.push(newLink);
      });

      // 提取 <script> 标签并重新注入到页面以执行
      const scripts = doc.querySelectorAll('script');
      // 劫持 setInterval，收集注入脚本的定时器 ID，用于切换卡片时清除
      const capturedIntervals: (number | NodeJS.Timeout)[] = [];
      const origSetInterval = window.setInterval;
      (window as any).setInterval = (...args: Parameters<typeof setInterval>) => {
        const id = origSetInterval.call(window, ...args);
        capturedIntervals.push(id);
        return id;
      };
      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        if (script.textContent) {
          // 用 IIFE 包裹脚本内容，避免全局变量名冲突
          newScript.textContent = `;(function(){${script.textContent}})();`;
        }
        newScript.setAttribute('data-disguiser', 'true');
        document.body.appendChild(newScript);
        injectedRef.current.push(newScript);
      });
      // 恢复原始 setInterval，保存捕获到的 ID
      (window as any).setInterval = origSetInterval;
      intervalRef.current = capturedIntervals;

      // 获取 body 元素
      const body = doc.body;

      // 将 body 的完整 CSS 规则 + 内联样式都应用到 container
      if (body) {
        // 先应用内联样式
        container.style.cssText = body.style.cssText;

        // 再把 style 标签中 body 规则的所有属性也应用上去（包含布局+背景）
        if (bodyFullCss) {
          container.style.cssText += ';' + bodyFullCss;
          // overlay 也需要完整的 body 样式来遮挡底层内容
          overlay.style.cssText += ';' + bodyFullCss;
        }

        // 复制 body 的 class
        if (body.className) {
          container.className = body.className;
        }
        // 将 body 的子元素放入 container
        while (body.firstChild) {
          container.appendChild(body.firstChild);
        }
      }

      overlay.appendChild(container);
      document.body.appendChild(overlay);


      setIsLocked(true);
    } catch (err) {
      setLoading(false);
      alert('加载失败，请重试');
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    cleanupDisguise();
  };

  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitFullscreen();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    const blockAll = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', blockAll, true);
    window.addEventListener('selectstart', blockAll, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', blockAll, true);
      window.removeEventListener('selectstart', blockAll, true);
    };
  }, [isLocked]);

  useEffect(() => {
    const onFullScreenChange = () => {
      if (!document.fullscreenElement) {
        cleanupDisguise();
      }
    };

    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-6">
      <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-medium text-[#333] mb-10">
        系统升级伪装工具
      </h1>
      <br />
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {TOOL_OPTIONS.map((item) => (
          <div
            key={item.id}
            onClick={() => !loading && enterFullscreen(item.id)}
            className={`bg-white rounded-xl p-5 flex flex-col items-center gap-4 cursor-pointer 
                      transition-all hover:shadow-lg hover:-translate-y-1 border border-gray-100
                      ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div
              className={`w-full h-32 ${item.bgColor} ${item.textColor} rounded-lg flex items-center justify-center text-xl font-bold`}
            >
              {item.id === 'win-qr' ? '蓝屏' : item.id.toUpperCase()}
            </div>
            <span className="text-gray-700 font-medium text-lg">{item.label}</span>
            {loading && <span className="text-gray-400 text-sm">加载中...</span>}
          </div>
        ))}
      </div>
      <br />
      <br />
      <p className="text-gray-400 text-sm mt-10">点击启动 → 按 ESC 退出</p>
      <br />
      <p className="text-gray-400 text-sm mt-10">进度是缓慢动态变化，模拟效果更逼真，到达100%会变成0%重新开始，请放心使用 ~</p>
    </main>
  );
}
