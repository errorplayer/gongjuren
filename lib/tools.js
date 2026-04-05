export const TOOLS = [
  { id: 'moments-grid', icon: '🖼️', title: '朋友圈9宫格裁剪', desc: '上传图片,一键生成9张朋友圈素材,支持拖拽调整', badge: ['New'] },
  { id: 'text-heal', icon: '✨', title: '文本治愈排版', desc: 'AI智能优化，让工作邮件/社交媒体/文章更有温度', badge: ['AI'] },
  { id: 'sound-therapy', icon: '📻', title: '声音疗愈', desc: '助眠、放松、专注、心流状态' , badge: ['Beta']},
  { id: 'random-chat', icon: '⚧️', title: '随机聊天室', desc: '上班累了吧？来这里遇见陌生的Ta ~' },
  { id: 'career', icon: '💼', title: '职场工具箱', desc: 'AI驱动的求职能力诊断与优化平台', badge: ['Beta'] },
  { id: 'drug-calculator', icon: '💊', title: '药品服用次数计算', desc: '临研必备 | 按给药时间/频率精准计算服药次数' },
  { id: 'json-format', icon: '🔧', title: 'JSON格式化', desc: 'JSON美化/压缩/校验，支持高亮显示和元素折叠' },
  { id: 'word-count', icon: '📝', title: '字数统计工具', desc: '统计中文、英文、字符数，含空格/不含空格' },
  { id: 'qrcode-generator', icon: '📱', title: '二维码生成器', desc: '输入文字/链接，一键生成二维码，可保存' },
  { id: 'timestamp-convert', icon: '⏰', title: '时间戳转换', desc: 'Unix时间戳与普通日期时间互转' },
  { id: 'case-convert', icon: '🔤', title: '大小写转换', desc: '文本全部大写/小写/首字母大写，一键转换' },
  { id: 'number-case-convert', icon: '🔢', title: '数字大小写转换', desc: '阿拉伯数字转中文大写（财务专用，支持小数）' },
  { id: 'unit-convert', icon: '📏', title: '常用单位换算', desc: '长度/重量/面积换算，支持米/千米/斤/公斤/平方米等' },
  // { id: 'chat-v2', icon: '🙂', title: '[内测中]chatroom', desc: '版本不稳定 ~' },
];

export const DEFAULT_TOOL_ORDER = TOOLS.map(t => t.id);
