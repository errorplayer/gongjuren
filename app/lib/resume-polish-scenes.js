export const sceneList = [
  {
    id: 'project_experience',
    name: '项目经历润色',
    description: '用STAR法则重写，突出成果与数据',
    inputLimit: 3000,
    insightType: 'interview_questions',
    insightTitle: '面试高频问题预测',
    insightDescription: '面试官最可能针对这个项目追问的3-5个问题 + 建议回答方向',
  },
  {
    id: 'work_responsibility',
    name: '工作职责提炼',
    description: '口语化表达 → 专业职责描述',
    inputLimit: 2000,
    insightType: 'capability_blindspot',
    insightTitle: '岗位能力盲区扫描',
    insightDescription: '同岗位在行业内通常还要求哪些职责/技能你没提到',
  },
  {
    id: 'self_evaluation',
    name: '自我评价优化',
    description: '提炼个人亮点，精炼有力',
    inputLimit: 1000,
    insightType: 'core_strengths',
    insightTitle: '核心卖点画像',
    insightDescription: '从你的经历中提炼出3个差异化竞争优势',
  },
  {
    id: 'cover_letter',
    name: '求职信撰写',
    description: '根据目标岗位生成专业求职信',
    inputLimit: 3000,
    insightType: 'competitiveness',
    insightTitle: '求职信竞争力评估',
    insightDescription: '亮点分析 + 可能被HR质疑的薄弱点',
  },
];

export function getSceneById(id) {
  return sceneList.find((scene) => scene.id === id);
}
