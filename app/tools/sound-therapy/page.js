'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

// UP主信息
const author = {
  avatar: "https://i1.hdslb.com/bfs/face/ff9b668e2d3a1cfbb9469440b8fa3e3af72379fb.jpg@128w_128h_1c_1s.webp",
  nickname: "源音疗愈",
  bio: "毕业于德国Folkwang艺术大学，专注于功能性疗愈音频制作。"
};

// 生成播放地址
const getEmbedUrl = (bvid, isPc) => {
  fetch('/api/stats/use', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool_id: 'sound-therapy' })
  }).catch(() => { });
  const autoplay = isPc ? 1 : 0;
  return `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&autoplay=${autoplay}&high_quality=1&cover=1`;
};

export default function VideoPage() {
  const [videoData, setVideoData] = useState({});
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('');
  const [currentItem, setCurrentItem] = useState({ bv: '', title: '' });
  const [isReady, setIsReady] = useState(false);
  const [isPc, setIsPc] = useState(false);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [avatarSrc, setAvatarSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 从数据库加载视频数据
  useEffect(() => {
    const loadVideos = async () => {
      const { data, error } = await supabase
        .from('sound_therapy_videos')
        .select('bv, title, category, sort_num')
        .order('category')
        .order('sort_num');

      if (error) {
        console.error('加载视频数据失败:', error);
        return;
      }

      // 按 category 分组
      const grouped = {};
      for (const row of data) {
        if (!grouped[row.category]) {
          grouped[row.category] = [];
        }
        grouped[row.category].push({ bv: row.bv, title: row.title });
      }

      const cats = Object.keys(grouped);
      setVideoData(grouped);
      setCategories(cats);
      setActiveCat(cats[0] || '');
      setCurrentItem(grouped[cats[0]]?.[0] || { bv: '', title: '' });
      setIsLoading(false);
    };

    loadVideos();
  }, []);

  // 客户端初始化
  useEffect(() => {
    const checkIsPc = () => {
      const userAgent = window.navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      return !isMobile;
    };

    setIsPc(checkIsPc());
    setAvatarSrc(author.avatar);
    setIsReady(true);
  }, []);

  // 视频切换时更新地址
  useEffect(() => {
    if (isReady && currentItem.bv) {
      setEmbedUrl(getEmbedUrl(currentItem.bv, isPc));
    }
  }, [currentItem, isPc, isReady]);

  const switchCategory = (cat) => {
    setActiveCat(cat);
    setCurrentItem(videoData[cat][0]);
  };

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* 顶部栏：UP主信息 + 分类卡片 */}
      <div className={styles.topBar}>
        {/* UP主信息 */}
        <div className={styles.authorInfo}>
          {avatarSrc && (
            <img src={avatarSrc} alt="" className={styles.authorAvatar} referrerPolicy="no-referrer" />
          )}
          <div className={styles.authorMeta}>
            <div className={styles.authorNickname}>{author.nickname}</div>
            <div className={styles.authorBio}>{author.bio}</div>
          </div>
        </div>

        {/* 分类卡片（靠右） */}
        <div className={styles.categoryBar}>
          {categories.map(cat => (
            <div
              key={cat}
              className={`${styles.catCard} ${activeCat === cat ? styles.catActive : ''}`}
              onClick={() => switchCategory(cat)}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* 只有准备好才渲染播放器 */}
      {isReady && embedUrl && (
        <div className={styles.contentLayout}>
          <div className={styles.playerWrap}>
            <iframe
              src={embedUrl}
              className={styles.playerFrame}
              frameBorder="0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={currentItem.title}
              scrolling="no"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          </div>

          <div className={styles.listSide}>
            {videoData[activeCat]?.map((item, i) => (
              <div
                key={item.bv}
                className={`${styles.listItem} ${currentItem.bv === item.bv ? styles.itemActive : ''}`}
                onClick={() => setCurrentItem(item)}
              >
                <div className={styles.itemTextWrap}>
                  <span className={styles.num}>#{i + 1}</span>
                  <span className={styles.itemTitle}>{item.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
