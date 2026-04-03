'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function FlipClock() {
  const intervalRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timeStr = hours + minutes + seconds;

      document.querySelectorAll('.flip-digit').forEach((digitEl, index) => {
        const currentDigit = timeStr[index];
        if (digitEl.dataset.digit !== currentDigit) {
          digitEl.dataset.digit = currentDigit;
          digitEl.classList.add('flipping');
          digitEl.querySelector('.top').textContent = currentDigit;
          digitEl.querySelector('.bottom').textContent = currentDigit;
          setTimeout(() => digitEl.classList.remove('flipping'), 600);
        }
      });
    };

    intervalRef.current = setInterval(updateClock, 1000);
    updateClock();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div
      className="flip-clock"
      onClick={() => router.push('/settings')}
      title="点击进入设置页面"
      style={{ cursor: 'pointer' }}
    >
      <div className="flip-digit" data-digit="0">
        <div className="top">0</div>
        <div className="bottom">0</div>
      </div>
      <div className="flip-digit" data-digit="0">
        <div className="top">0</div>
        <div className="bottom">0</div>
      </div>
      <span className="flip-colon">:</span>
      <div className="flip-digit" data-digit="0">
        <div className="top">0</div>
        <div className="bottom">0</div>
      </div>
      <div className="flip-digit" data-digit="0">
        <div className="top">0</div>
        <div className="bottom">0</div>
      </div>
      <span className="flip-colon">:</span>
      <div className="flip-digit" data-digit="0">
        <div className="top">0</div>
        <div className="bottom">0</div>
      </div>
      <div className="flip-digit" data-digit="0">
        <div className="top">0</div>
        <div className="bottom">0</div>
      </div>
    </div>
  );
}
