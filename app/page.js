import { supabase } from '@/lib/supabase';
import DailyHot from './_components/DailyHot';
import ToolGrid from './_components/ToolGrid';
import { TOOLS } from '@/lib/tools';
import DeviceRedirect from './_components/DeviceRedirect';

export const dynamic = 'force-dynamic';   // ← 加这一行，禁用缓存

export default async function Home() {
  const { data: stats } = await supabase
    .from('tool_stats')
    .select('id, use_count');

  const statsMap = stats ? Object.fromEntries(stats.map(s => [s.id, s.use_count])) : {};

  return (
    <>
      <DeviceRedirect />
      <div className="container">
      {/* <div className="ad-top">
        <p>【广告位】- 顶部横幅广告</p>
      </div> */}

      <DailyHot />

      <p style={{ margin: '15px 0', color: '#666' }}>精选好用的免费工具，在线即用</p>
      <ToolGrid tools={TOOLS} statsMap={statsMap} />

      {/* <div className="ad-bottom">
        <p>【广告位】- 底部广告</p>
      </div> */}
    </div>
    </>
  );
}
