// 简单的限流实现（基于IP和时间段）

class RateLimiter {
  constructor() {
    this.requests = new Map();
    // 10次/分钟
    this.maxRequests = 10;
    this.windowMs = 60 * 1000;
  }

  check(ip) {
    const now = Date.now();
    const userRequests = this.requests.get(ip) || [];

    // 清理过期的请求记录
    const validRequests = userRequests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return { success: false, remaining: 0, resetAt: validRequests[0] + this.windowMs };
    }

    // 添加新请求
    validRequests.push(now);
    this.requests.set(ip, validRequests);

    return {
      success: true,
      remaining: this.maxRequests - validRequests.length,
    };
  }
}

export const rateLimiter = new RateLimiter();
