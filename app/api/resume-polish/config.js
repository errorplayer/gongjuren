// 简历润色配置

export default {
  // 支持的场景列表
  scenes: ['project_experience', 'work_responsibility', 'self_evaluation', 'cover_letter'],

  // 支持的Provider列表
  providers: ['kimi', 'deepseek'],

  // 默认provider
  defaultProvider: 'kimi',

  // 文本长度限制
  maxLength: 3000,

  // 最小文本长度
  minLength: 10,
};
