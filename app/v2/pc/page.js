import HeroSection from '@/app/_components/v2/HeroSection';
import DeviceRedirect from '@/app/_components/DeviceRedirect';
import ForceLightTheme from '@/app/_components/ForceLightTheme';
import styles from './page.module.css';

export default function V2PCPage() {
  return (
    <>
      <DeviceRedirect />
      <ForceLightTheme />
      <div className={styles.page}>
        <HeroSection />
      </div>
    </>
  );
}
