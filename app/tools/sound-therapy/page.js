'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SiBilibili, SiXiaohongshu } from 'react-icons/si';
import styles from './page.module.css';

// UP主信息
const author = {
  avatar: "https://i1.hdslb.com/bfs/face/ff9b668e2d3a1cfbb9469440b8fa3e3af72379fb.jpg@128w_128h_1c_1s.webp",
  nickname: "源音疗愈",
  bio: "毕业于德国Folkwang艺术大学，专注于功能性疗愈音频制作。",
  platforms: [
    {
      name: 'bilibili',
      webUrl: 'https://space.bilibili.com/1037046049',
      appScheme: 'bilibili://space/1037046049',
      Icon: SiBilibili,
      color: '#00A1D6',
      label: 'B站'
    },
    {
      name: 'xiaohongshu',
      webUrl: 'https://www.xiaohongshu.com/explore/people/6729337655',
      appScheme: 'xhsdiscover://user/6729337655',
      Icon: SiXiaohongshu,
      color: '#FF2442',
      label: '小红书'
    },
    {
      name: 'douyin',
      webUrl: 'https://www.douyin.com/user/%E6%BA%90%E9%9F%B3%E7%96%97%E6%84%88/search/%E6%BA%90%E9%9F%B3%E7%96%97%E6%84%88?type=general',
      appScheme: 'snssdk1128://user/profile/dyfkgdsm9h6k',
      color: '#000000',
      label: '抖音'
    },

  ]
};

// 平台跳转处理函数
const handlePlatformClick = (platform) => {
  // 小红书图标不跳转
  if (platform.name === 'xiaohongshu') return;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // 移动端抖音图标不跳转
    if (platform.name === 'douyin') return;
    // 移动端：尝试打开 App，如果失败则跳转网页版
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      if (Date.now() - startTime < 2000) {
        window.location.href = platform.webUrl;
      }
    }, 1500);

    window.location.href = platform.appScheme;

    // 如果 2 秒后页面没有被切换走，说明 App 没有安装，跳转网页版
    setTimeout(() => {
      clearTimeout(timeout);
      window.location.href = platform.webUrl;
    }, 2000);
  } else {
    // PC 端：直接在新标签页打开网页版
    window.open(platform.webUrl, '_blank', 'noopener,noreferrer');
  }
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
  const [showXhsTooltip, setShowXhsTooltip] = useState(false);

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

  // 小红书按钮点击处理
  const handleXhsClick = () => {
    setShowXhsTooltip(!showXhsTooltip);
  };

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
            {/* 社交平台链接 */}
            <div className={styles.socialLinks}>
              {author.platforms.map(platform => (
                platform.name === 'xiaohongshu' ? (
                  // 小红书特殊处理：点击弹出全屏图片
                  <button
                    key={platform.name}
                    className={styles.socialIcon}
                    onClick={handleXhsClick}
                    title={platform.label}
                    style={{ '--platform-color': platform.color }}
                  >
                    <platform.Icon size={18} color={platform.color} />
                  </button>
                ) : (
                  <button
                    key={platform.name}
                    className={styles.socialIcon}
                    onClick={() => handlePlatformClick(platform)}
                    title={platform.label}
                    style={{ '--platform-color': platform.color }}
                  >
                    {platform.name === 'douyin' ? (
                      <img src="/icons/douyin.svg" alt="抖音" width={18} height={18} style={{ objectFit: 'contain' }} />
                    ) : (
                      <platform.Icon size={18} color={platform.color} />
                    )}
                  </button>
                )
              ))}
            </div>
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

      {/* 小红书全屏 overlay */}
      {showXhsTooltip && (
        <div
          className={`${styles.xhsOverlay} ${styles.xhsOverlayVisible}`}
          onClick={() => setShowXhsTooltip(false)}
        >
          <img
            src="/resource/yuanyinliaoyu/xiaohongshu_profile.jpg"
            alt="小红书主页"
            className={styles.xhsOverlayImg}
          />
          <div className={styles.xhsOverlayHint}>点击任意处关闭</div>
        </div>
      )}
    </div>
  );
}
