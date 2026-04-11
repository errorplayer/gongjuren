import HeroSection from '@/app/_components/v2/HeroSection';
import DeviceRedirect from '@/app/_components/DeviceRedirect';
import ForceLightTheme from '@/app/_components/ForceLightTheme';
import { fetchToolStatsMap } from '@/lib/tool-categories';
import styles from './page.module.css';

export default async function V2PCPage() {
  const statsMap = await fetchToolStatsMap();

  return (
    <>
      <DeviceRedirect />
      <ForceLightTheme />
      <div className={styles.page}>
        <HeroSection statsMap={statsMap} />
      </div>
    </>
  );
}
