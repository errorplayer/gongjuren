// 使用日志（简化版，生产环境可替换为数据库）

const usageLogs = [];
const errorLogs = [];

export async function logUsage(data) {
  const log = {
    timestamp: new Date().toISOString(),
    ...data,
  };
  usageLogs.push(log);

  // 保持最近1000条记录
  if (usageLogs.length > 1000) {
    usageLogs.shift();
  }

  // 开发环境打印
  if (process.env.NODE_ENV === 'development') {
    console.log('[Resume Polish Usage]', log);
  }
}

export async function logError(data) {
  const log = {
    timestamp: new Date().toISOString(),
    ...data,
  };
  errorLogs.push(log);

  // 保持最近500条记录
  if (errorLogs.length > 500) {
    errorLogs.shift();
  }

  console.error('[Resume Polish Error]', log);
}

export function getUsageLogs() {
  return usageLogs;
}

export function getErrorLogs() {
  return errorLogs;
}
