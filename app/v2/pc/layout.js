import HeaderNav from '@/app/_components/v2/HeaderNav';
import styles from './page.module.css';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/config';

export const metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
};

export default function VPCLayout({ children }) {
  return (
    <>
      <HeaderNav />
      <main className={styles.main}>{children}</main>
    </>
  );
}
