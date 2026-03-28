export async function POST(request) {
  try {
    const body = await request.json();
    const { profile, modules } = body;

    // 构建综合 Prompt
    const prompt = buildReportPrompt(profile, modules);

    // 调用 Kimi API 生成报告
    const kimiResponse = await fetch('https://api.kimi.com/coding/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.KIMI_API_KEY,
      },
      body: JSON.stringify({
        model: 'kimi-coding',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 4000,
      }),
    });

    if (!kimiResponse.ok) {
      const error = await kimiResponse.text();
      throw new Error(`Kimi API error: ${kimiResponse.status} - ${error}`);
    }

    const kimiData = await kimiResponse.json();

    let reportContent;
    if (kimiData.content && Array.isArray(kimiData.content) && kimiData.content[0].text) {
      reportContent = kimiData.content[0].text;
    } else if (kimiData.choices && kimiData.choices[0]?.message?.content) {
      reportContent = kimiData.choices[0].message.content;
    } else {
      throw new Error('Unexpected response format from Kimi API');
    }

    return Response.json({
      success: true,
      result: reportContent,
    });
  } catch (error) {
    console.error('Career report generation error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || '生成报告失败',
      },
      { status: 500 }
    );
  }
}

function buildReportPrompt(profile, modules) {
  const profileText = buildProfileText(profile);
  const projectText = buildProjectText(modules.project_experience.items);
  const otherModulesText = buildOtherModulesText(modules);

  return `你是一位资深的职业发展顾问和招聘专家。请基于用户的求职信息，生成一份综合的求职体检报告。

【用户个人画像】
${profileText}

【项目经历】
${projectText}

【其他模块】
${otherModulesText}

请按以下结构生成求职体检报告：

=== 综合评分 ===
给出用户求职准备度的综合评分（满分100分），并简要说明评分依据。

=== 模块点评 ===
分别对以下模块进行点评：
1. 项目经历：分析项目经历的优势和不足
2. 工作职责：评估职责描述的完整性和说服力
3. 自我评价：分析自我评价是否突出个人特色
4. 求职信：评估求职信的表达效果和针对性

=== 跨模块发现的系统性问题 ===
从整体角度分析用户存在的系统性问题，例如：
- 项目经历与工作职责是否匹配
- 自我评价是否得到项目经历的支撑
- 求职信是否有效整合了其他模块的优势
- 是否存在技能描述矛盾或重复
- 整体职业定位是否清晰

=== 优先级排序的改进建议 ===
按优先级从高到低列出5-8条改进建议，每条建议应包含：
- 具体问题描述
- 改进方向
- 预期效果

=== 下一步行动计划 ===
根据以上分析，为用户提供具体的行动计划：
- 短期（1-2周）可以立即执行的行动
- 中期（1个月）需要持续改进的事项
- 长期职业发展建议

请以专业、客观、鼓励的语气撰写报告，避免过于负面的表述，重点提供建设性意见。  
报告请以markdown格式内容返回，不要包含报告时间`;
}

function buildProfileText(profile) {
  const parts = [];
  if (profile.years) parts.push(`工作年限：${profile.years}`);
  if (profile.role) parts.push(`当前岗位：${profile.role}`);
  if (profile.city) parts.push(`工作城市：${profile.city}`);
  if (profile.salary) parts.push(`期望薪资：${profile.salary}`);

  return parts.length > 0 ? parts.join('\n') : '未提供个人画像信息';
}

function buildProjectText(items) {
  if (!items || items.length === 0) {
    return '未提供项目经历信息';
  }

  return items
    .map((item, index) => {
      return `项目${index + 1}：
${item.confirmed}`;
    })
    .join('\n\n');
}

function buildOtherModulesText(modules) {
  const texts = [];

  if (modules.work_responsibility?.confirmed) {
    texts.push(`【工作职责】
${modules.work_responsibility.confirmed}`);
  }

  if (modules.self_evaluation?.confirmed) {
    texts.push(`【自我评价】
${modules.self_evaluation.confirmed}`);
  }

  if (modules.cover_letter?.confirmed) {
    texts.push(`【求职信】
${modules.cover_letter.confirmed}`);
  }

  return texts.length > 0 ? texts.join('\n\n') : '未提供其他模块信息';
}
