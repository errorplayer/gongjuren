import { DEFAULT_TOOL_ORDER } from './tools';

const STORAGE_KEY = '520tool-prefs';

const DEFAULTS = {
  nickname: '游客',
  tool_order: [...DEFAULT_TOOL_ORDER],
  tool_hidden: [],
};

const NICKNAME_REGEX = /[a-zA-Z0-9\u4e00-\u9fa5]/g;

export function sanitizeNickname(name) {
  if (!name) return '游客';
  const trimmed = name.trim();
  if (trimmed === '') return '游客';
  const matched = trimmed.match(NICKNAME_REGEX);
  return matched ? matched.join('').slice(0, 30) : '游客';
}

function getFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function getPrefs() {
  if (typeof window === 'undefined') return { ...DEFAULTS };

  const stored = getFromStorage();
  if (!stored) return { ...DEFAULTS };

  // 智能合并 tool_order：保留用户已有顺序，同时追加新增的工具 ID
  const storedOrder = Array.isArray(stored.tool_order) ? stored.tool_order : [];
  const newIds = DEFAULT_TOOL_ORDER.filter(id => !storedOrder.includes(id));
  const mergedOrder = [...storedOrder, ...newIds];

  return {
    ...DEFAULTS,
    ...stored,
    tool_order: mergedOrder,
  };
}

export function setPrefs(partial) {
  const current = getPrefs();
  const updated = { ...current, ...partial };
  if (updated.nickname) {
    updated.nickname = sanitizeNickname(updated.nickname);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function exportPrefs() {
  const prefs = getPrefs();
  const dataStr = JSON.stringify(prefs, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `520tool-settings-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importPrefs(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    const validated = {
      ...DEFAULTS,
      nickname: sanitizeNickname(imported.nickname) || '游客',
      tool_order: Array.isArray(imported.tool_order) ? imported.tool_order : [...DEFAULT_TOOL_ORDER],
      tool_hidden: Array.isArray(imported.tool_hidden) ? imported.tool_hidden : [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    return { success: true, prefs: validated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function resetPrefs() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULTS };
}
