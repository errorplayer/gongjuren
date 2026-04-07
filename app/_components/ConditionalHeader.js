'use client';

import { usePathname } from 'next/navigation';
import Logo from './Logo';
import FlipClock from './FlipClock';
import DailyQuote from './DailyQuote';

const HIDDEN_PATHS = ['/v2/pc'];

export default function ConditionalHeader() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <header>
      <div className="header-container">
        <div className="header-main">
          <Logo />
          <FlipClock />
        </div>
        <DailyQuote />
      </div>
    </header>
  );
}
