import HeaderNav from '@/app/_components/v2/HeaderNav';
import styles from './page.module.css';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/config';
import { fetchToolStatsMap } from '@/lib/tool-categories';

export const metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
};

export default async function VPCLayout({ children }) {
  const statsMap = await fetchToolStatsMap();

  return (
    <>
      <HeaderNav statsMap={statsMap} />
      <main className={styles.main}>{children}</main>
    </>
  );
}
