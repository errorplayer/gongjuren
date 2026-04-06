import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { SiBilibili, SiXiaohongshu } from 'react-icons/si';
import { FiStar, FiHelpCircle } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';

import styles from './page.module.css';

const FAV_KEY = '520tool-sound-therapy-favorites';
const FAV_CAT = '收藏夹';

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
export default function SafeContent() {
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
    const [favorites, setFavorites] = useState([]);
    const [toast, setToast] = useState('');
    const initDone = useRef(false);

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

    // 从 localStorage 加载收藏
    useEffect(() => {
        try {
            const stored = localStorage.getItem(FAV_KEY);
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch { /* ignore */ }
    }, []);

    // 收藏加载后，优先播放收藏夹（仅首次初始化时）
    useEffect(() => {
        if (categories.length === 0) return;
        if (!initDone.current) {
            initDone.current = true;
            if (favorites.length > 0) {
                setActiveCat(FAV_CAT);
                const firstFavItem = favorites.map(bv => findItemByBv(bv)).filter(Boolean)[0];
                if (firstFavItem) setCurrentItem(firstFavItem);
            }
        }
    }, [favorites, categories, videoData]);


    // toast 自动消失
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(''), 2000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // 切换收藏/取消收藏
    const toggleFavorite = (bv, e) => {
        e.stopPropagation();
        setFavorites(prev => {
            const isFav = prev.includes(bv);
            const next = isFav
                ? prev.filter(v => v !== bv)
                : [bv, ...prev];
            try {
                localStorage.setItem(FAV_KEY, JSON.stringify(next));
            } catch { /* ignore */ }
            if (isFav) setToast('已取消收藏');
            return next;
        });
    };

    // 根据 bv 在全量数据中查找 item
    const findItemByBv = (bv) => {
        for (const items of Object.values(videoData)) {
            const found = items.find(i => i.bv === bv);
            if (found) return found;
        }
        return null;
    };

    // 构造展示用 categories（收藏夹在最前）
    const displayCategories = [
        ...(favorites.length > 0 ? [FAV_CAT] : []),
        ...categories,
    ];

    // 构造展示用 items
    const displayItems = activeCat === FAV_CAT
        ? favorites.map(bv => findItemByBv(bv)).filter(Boolean)
        : (videoData[activeCat] || []);

    const switchCategory = (cat) => {
        setActiveCat(cat);
        if (cat === FAV_CAT) {
            // 收藏夹不自动切换播放
        } else {
            setCurrentItem(videoData[cat]?.[0] || { bv: '', title: '' });
        }
    };

    // 视频切换时更新地址
    useEffect(() => {
        if (isReady && currentItem.bv) {
            setEmbedUrl(getEmbedUrl(currentItem.bv, isPc));
        }
    }, [currentItem, isPc, isReady]);

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
                            {/* 帮助说明 */}
                            <div className={styles.helpTip}>
                                <button className={styles.helpBtn} title="帮助说明">
                                    <FiHelpCircle size={18} color="var(--text-muted)" />
                                </button>
                                <div className={styles.helpTipText}>本站使用视频平台官方链接播放，<br/>作品版权归作者所有。</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 分类卡片（靠右） */}
                <div className={styles.categoryBar}>
                    {displayCategories.map(cat => (
                        <div
                            key={cat}
                            className={`${styles.catCard} ${activeCat === cat ? styles.catActive : ''} ${cat === FAV_CAT ? styles.favCard : ''}`}
                            onClick={() => switchCategory(cat)}
                        >
                            {cat === FAV_CAT && <FiStar size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
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
                        {displayItems.length === 0 ? (
                            <div className={styles.emptyFavorites}>暂无收藏内容</div>
                        ) : (
                            displayItems.map((item, i) => {
                                const isFav = favorites.includes(item.bv);
                                return (
                                    <div
                                        key={item.bv}
                                        className={`${styles.listItem} ${currentItem.bv === item.bv ? styles.itemActive : ''}`}
                                        onClick={() => setCurrentItem(item)}
                                    >
                                        <div className={styles.itemTextWrap}>
                                            <span className={styles.num}>#{i + 1}</span>
                                            <span className={styles.itemTitle}>{item.title}</span>
                                        </div>
                                        <button
                                            className={`${styles.favBtn} ${isFav ? styles.favBtnFilled : ''}`}
                                            onClick={(e) => toggleFavorite(item.bv, e)}
                                            title={isFav ? '取消收藏' : '收藏'}
                                        >
                                            {isFav ? <FaStar size={18} /> : <FiStar size={18} />}
                                        </button>
                                    </div>
                                );
                            })
                        )}
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

            {/* 收藏 toast */}
            <div className={`${styles.favToast} ${toast ? styles.favToastVisible : ''}`}>
                {toast}
            </div>
        </div>
    );
}