import HeaderNav from '@/app/_components/v2/HeaderNav';
import styles from './page.module.css';

export const metadata = {
  title: '520Tool - 520.tool',
  description: '精选好用的免费在线工具箱',
};

export default function VPCLayout({ children }) {
  return (
    <>
      <HeaderNav />
      <main className={styles.main}>{children}</main>
    </>
  );
}
