/**
 * 520Tool 工具分类数据
 * L1: 一级菜单（顶部横排）
 * L2: 二级分类（MegaMenu左侧竖排）
 */

export const TOOL_CATEGORIES = {
  // L1 一级菜单
  menus: [
    { id: 'ai', label: 'Intelli' },
    { id: 'life', label: 'Relax' },
    { id: 'text', label: 'Text' },
    { id: 'dev', label: 'Dev' },
    { id: 'util', label: 'Other' },
  ],

  // L2 二级分类
  subCategories: [
    { id: 'hot', label: '推荐', badge: 'HOT', icon: '🔥' },
    { id: 'ai-assistant', label: 'AI 智能助手', icon: '🤖', l1Id: 'ai' },
    { id: 'text-format', label: '文本排版', icon: '📝', l1Id: 'text' },
    { id: 'dev-helper', label: '开发辅助', icon: '🔧', l1Id: 'dev' },
    { id: 'life-fun', label: '生活娱乐', icon: '🎮', l1Id: 'life' },
    { id: 'util-calc', label: '实用计算', icon: '🧮', l1Id: 'util' },
  ],

  // 工具数据
  tools: [
    {
      id: 'career',
      title: '职场工具箱',
      desc: '求职能力AI诊断',
      brochure: 'AI驱动的求职能力诊断与优化平台',
      icon: '💼',
      tags: ['AI'],
      category: 'ai-assistant',
      path: '/tools/career',
      usageCount: 12580,
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
    },
    {
      id: 'number-case',
      title: '数字大写转换',
      desc: '金额数字转大写',
      brochure: '阿拉伯数字转中文大写（财务专用，支持小数）' ,
      icon: '💰',
      tags: [],
      category: 'text-format',
      path: '/tools/number-case-convert',
      usageCount: 5432,
    },
    {
      id: 'json-format',
      title: 'JSON格式化',
      desc: '美化/压缩/校验',
      brochure: 'JSON美化/压缩/校验，支持高亮显示和元素折叠' ,
      icon: '🔧',
      tags: [],
      category: 'dev-helper',
      path: '/tools/json-format',
      usageCount: 21356,
    },
    {
      id: 'timestamp',
      title: '时间戳转换',
      desc: 'Unix时间戳互转',
      brochure: 'Unix时间戳与普通日期时间互转',
      icon: '⏰',
      tags: [],
      category: 'dev-helper',
      path: '/tools/timestamp-convert',
      usageCount: 9845,
    },
    {
      id: 'sound-heal',
      title: '声音疗愈',
      desc: '助眠、放松、专注',
      brochure: '助眠、放松、专注、心流状态',
      icon: '📻',
      tags: ['HOT'],
      category: 'life-fun',
      path: '/tools/sound-therapy',
      usageCount: 45230,
    },
    {
      id: 'chat-room',
      title: '随机聊天室',
      desc: '上班累了来聊聊~',
      brochure: '上班累了吧？来这里遇见陌生的Ta ~' ,
      icon: '💬',
      tags: ['HOT'],
      category: 'life-fun',
      path: '/tools/random-chat',
      usageCount: 32156,
    },
    {
      id: 'grid-crop',
      title: '朋友圈9宫格裁剪',
      desc: '上传图片一键生成',
      brochure: '上传图片,一键生成9张朋友圈素材,支持拖拽调整' ,
      icon: '🖼️',
      tags: ['HOT'],
      category: 'life-fun',
      path: '/tools/moments-grid',
      usageCount: 28934,
    },
    {
      id: 'drug-calc',
      title: '药品服用计算',
      desc: '临研必备工具',
      brochure: '临研必备 | 按给药时间/频率精准计算服药次数',
      icon: '💊',
      tags: [],
      category: 'util-calc',
      path: '/tools/drug-calculator',
      usageCount: 6721,
    },
    {
      id: 'qrcode',
      title: '二维码生成器',
      desc: '一键生成二维码',
      brochure: '输入文字/链接，一键生成二维码，可保存',
      icon: '📱',
      tags: [],
      category: 'util-calc',
      path: '/tools/qrcode-generator',
      usageCount: 11234,
    },
    {
      id: 'unit-convert',
      title: '单位换算',
      desc: '长度、重量、面积换算',
      brochure: '长度/重量/面积换算，支持米/千米/斤/公斤/平方米等' ,
      icon: '⚖️',
      tags: [],
      category: 'util-calc',
      path: '/tools/unit-convert',
      usageCount: 8765,
    },
  ],
};

// 获取推荐工具（按usageCount排序取前5）
export const getHotTools = () => {
  return [...TOOL_CATEGORIES.tools]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 6);
};

// 根据分类获取工具
export const getToolsByCategory = (categoryId) => {
  if (categoryId === 'hot') {
    return getHotTools();
  }
  return TOOL_CATEGORIES.tools.filter((tool) => tool.category === categoryId);
};
