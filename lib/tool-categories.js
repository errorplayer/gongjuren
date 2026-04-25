/**
 * 520Tool 工具分类数据
 * L1: 一级菜单（顶部横排）
 * L2: 二级分类（MegaMenu左侧竖排）
 */

import { supabase } from '@/lib/supabase';

const FINANCE = 'finance';
const CLINICAL = 'clinical';
const DEV = 'development';
const DESKTOPSHIELD = 'desktopshield';
const FUN = 'fun';
const FOCUS = 'focus';
const IMMERSE = 'immerseYourself';
const SOCIAL = 'social';
const TEXT = 'text';

/**
 * 从 Supabase 查询工具使用统计，返回 { id: use_count } Map
 */
export const fetchToolStatsMap = async () => {
  const { data: stats } = await supabase
    .from('tool_stats')
    .select('id, use_count');
  return stats ? Object.fromEntries(stats.map(s => [s.id, s.use_count])) : {};
};

/**
 * 将真实统计数据合并到 tools 数组中
 * @param {Array} tools - 原始工具数组
 * @param {Object} statsMap - { id: use_count } 映射，DB优先，硬编码值兜底
 */
export const enrichToolsWithStats = (tools, statsMap) => {
  return tools.map(tool => ({
    ...tool,
    usageCount: statsMap[tool.id] ?? tool.usageCount,
  }));
};


export const TOOL_CATEGORIES = {
  // L1 一级菜单
  menus: [
    { id: 'hot_list', label: 'Hot' },
    // { id: 'ai', label: 'AI' },
    { id: 'work', label: '办公' },
    { id: 'relax', label: '娱乐' },
    // { id: 'dev', label: 'Dev' },
    { id: 'moyu', label: '摸鱼专栏' },
    { id: 'all', label: '全部' },
    // { id: 'util', label: '其他' },
  ],

  // L2 二级分类
  subCategories: [
    { id: 'hot', label: '推荐', badge: 'HOT', icon: '🔥', l1Id: 'hot_list' },
    // { id: 'ai-assistant', label: 'AI 助手', icon: '🤖', l1Id: 'ai' },
    { id: TEXT, label: '文本', icon: '', l1Id: 'work' },
    { id: DEV, label: '开发辅助', icon: '', l1Id: 'work' },
    { id: CLINICAL, label: '临床研究', icon: '', l1Id: 'work' },
    { id: FINANCE, label: '财务工具', icon: '', l1Id: 'work' },
    { id: FUN, label: '好玩有趣的', icon: '', l1Id: 'relax' },
    { id: FOCUS, label: '专注', icon: '', l1Id: 'work' },
    
    { id: IMMERSE, label: '沉浸自我', icon: '', l1Id: 'relax' },
    // { id: 'life-fun', label: '生活娱乐', icon: '🎮', l1Id: 'life' },
    // { id: 'util-calc', label: '实用计算', icon: '🧮', l1Id: 'util' },
    { id: 'all', label: '全部工具', icon: '', l1Id: 'all' },
    { id: DESKTOPSHIELD, label: '桌面伪装', icon: '', l1Id: 'moyu' },
    { id: SOCIAL, label: '社交', icon: '', l1Id: 'moyu' },
  ],

  // 工具数据
  tools: [
    {
      id: 'career',
      title: '职场工具箱',
      desc: '求职能力AI诊断',
      brochure: 'AI驱动的求职能力诊断与优化平台',
      icon: '💼',
      tags: [],
      category: 'ai-assistant',
      path: '/tools/career',
      usageCount: 8288,
      groupList: [],
    },
    {
      id: 'text-heal',
      title: '文本治愈排版',
      desc: 'AI智能优化文案温度',
      brochure: 'AI智能优化，让工作邮件/社交媒体/文章更有温度',
      icon: '✨',
      tags: ['AI'],
      category: 'ai-assistant',
      path: '/tools/text-heal',
      usageCount: 8932,
      groupList: [],
    },
    {
      id: 'word-count',
      title: '字数统计',
      desc: '统计中英文字符',
      brochure: '统计中文、英文、字符数，含空格/不含空格',
      icon: '📝',
      tags: [],
      category: 'text-format',
      path: '/tools/word-count',
      usageCount: 15623,
      groupList: [],
    },
    {
      id: 'case-convert',
      title: '大小写转换',
      desc: '一键转换大小写',
      brochure: '文本全部大写/小写/首字母大写，一键转换',
      icon: '🔤',
      tags: [],
      category: 'text-format',
      path: '/tools/case-convert',
      usageCount: 7821,
      groupList: [],
    },
    {
      id: 'number-case-convert',
      title: '数字大写转换',
      desc: '金额数字转大写',
      brochure: '阿拉伯数字转中文大写（财务专用，支持小数）',
      icon: '💰',
      tags: [],
      category: 'text-format',
      path: '/tools/number-case-convert',
      usageCount: 5432,
      groupList: [FINANCE],
    },
    {
      id: 'json-format',
      title: 'JSON格式化',
      desc: '美化/压缩/校验',
      brochure: 'JSON美化/压缩/校验，支持高亮显示和元素折叠',
      icon: '🔧',
      tags: [],
      category: 'dev-helper',
      path: '/tools/json-format',
      usageCount: 21356,
      groupList: [DEV],
    },
    {
      id: 'timestamp-convert',
      title: '时间戳转换',
      desc: 'Unix时间戳互转',
      brochure: 'Unix时间戳与普通日期时间互转',
      icon: '⏰',
      tags: [],
      category: 'dev-helper',
      path: '/tools/timestamp-convert',
      usageCount: 9845,
      groupList: [DEV],
    },
    {
      id: 'sound-therapy',
      title: '声音疗愈',
      desc: '助眠、放松、专注',
      brochure: '助眠、放松、专注、心流状态',
      icon: '📻',
      tags: ['HOT'],
      category: 'life-fun',
      path: '/tools/sound-therapy',
      usageCount: 45230,
      groupList: [FOCUS, IMMERSE],
    },
    {
      id: 'random-chat',
      title: '随机聊天室',
      desc: '上班累了来聊聊~',
      brochure: '上班累了吧？来这里遇见陌生的Ta ~',
      icon: '💬',
      tags: ['HOT'],
      category: 'life-fun',
      path: '/tools/random-chat',
      usageCount: 32156,
      groupList: [FUN, SOCIAL],
    },
    {
      id: 'moments-grid',
      title: '朋友圈九宫格',
      desc: '上传图片一键生成',
      brochure: '上传图片,一键生成9张朋友圈素材,支持拖拽调整',
      icon: '🖼️',
      tags: [],
      category: 'life-fun',
      path: '/tools/moments-grid',
      usageCount: 28934,
      groupList: [FUN],
    },
    {
      id: 'drug-calculator',
      title: '药品服用计算',
      desc: '临研必备工具',
      brochure: '临研必备 | 按给药时间/频率精准计算服药次数',
      icon: '💊',
      tags: [],
      category: 'util-calc',
      path: '/tools/drug-calculator',
      usageCount: 6721,
      groupList: [CLINICAL],
    },
    {
      id: 'qrcode-generator',
      title: '二维码生成器',
      desc: '一键生成二维码',
      brochure: '输入文字/链接，一键生成二维码，可保存',
      icon: '📱',
      tags: [],
      category: 'util-calc',
      path: '/tools/qrcode-generator',
      usageCount: 11234,
      groupList: [DEV],
    },
    {
      id: 'unit-convert',
      title: '单位换算',
      desc: '长度、重量、面积换算',
      brochure: '长度/重量/面积换算，支持米/千米/斤/公斤/平方米等',
      icon: '⚖️',
      tags: [],
      category: 'util-calc',
      path: '/tools/unit-convert',
      usageCount: 8765,
      groupList: [],
    },
    {
      id: 'systemupd-disguiser',
      title: '系统更新界面模拟',
      desc: '假装系统在升级',
      brochure: '想玩会儿手机？试试这款系统升级伪装神器吧，无需下载安装，点开就能用',
      icon: '🖥️',
      tags: ['HOT'],
      category: 'relax',
      path: '/tools/systemupd-disguiser',
      usageCount: 580,
      groupList: [DESKTOPSHIELD],
    },
    {
      id: 'mdnote',
      title: '私密笔记本',
      desc: '本地存储，实时预览，安全私密',
      brochure: '一款简洁高效的 Markdown 笔记工具，所有数据 100% 本地存储，支持实时预览、代码高亮、数学公式、Mermaid 图表等多种功能，还能导出多种格式，安全可靠。',
      icon: '📝',
      tags: ['NEW'],        // 可选
      category: 'dev-helper', // 对应 subCategories 里的某个 id
      path: 'https://markdown.520tool.cc',  // ✅ 直接写外链即可
      usageCount: 38908, // 增加使用次数使其进入热门工具列表
      groupList: [TEXT],      // 可选，归类到某个组
    }
  ],
};

// 获取推荐工具（按usageCount排序取前5）
export const getHotTools = () => {
  return [...TOOL_CATEGORIES.tools]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 3);
};

// 获取全部工具
export const getAllTools = () => {
  return [...TOOL_CATEGORIES.tools];

};

// 根据分类获取工具
export const getToolsByCategory = (categoryId) => {
  if (categoryId === 'hot') {
    return getHotTools();
  }
  if (categoryId === 'all') {
    return getAllTools();
  }
  return TOOL_CATEGORIES.tools.filter((tool) => tool.category === categoryId);
};

// 根据组名获取工具（筛选 groupList 包含 groupName 的工具）
export const getToolsByGroup = (groupName) => {
  if (groupName === 'hot') {
    return getHotTools();
  }
  if (groupName === 'all') {
    return getAllTools();
  }
  return TOOL_CATEGORIES.tools.filter(
    (tool) => Array.isArray(tool.groupList) && tool.groupList.includes(groupName)
  );
};