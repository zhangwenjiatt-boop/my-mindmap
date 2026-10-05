// AI 续写与 AI 解释的预设与自定义 Prompt 规则定义

export const AI_CONTINUATION_PRESETS = [
  {
    id: 'expand',
    name: '综合发散拓展（推荐）',
    desc: '围绕目标节点进行多维度、多视角的横向拓展，生成3-5个高价值子分支。',
    template: '我有一个主题为【{topic}】的思维导图。请对其中的子节点【{nodeText}】进行全方位发散拓展，列出3-5个关键维度的子分支。要求层次清晰、重点突出。请直接以Markdown列表格式输出，无需任何多余开场白。'
  },
  {
    id: 'deep',
    name: '深度纵向细化（实施步骤）',
    desc: '对节点进行深入拆解，输出切实可落地的具体执行步骤、实施细则或关键里程碑。',
    template: '我有一个主题为【{topic}】的思维导图。请针对节点【{nodeText}】进行纵向深度拆解，提供切实可执行的3-5个关键实施步骤与细化子任务。请直接以Markdown列表格式输出，无需任何多余开场白。'
  },
  {
    id: 'swot',
    name: 'SWOT 多维分析',
    desc: '从优势(Strengths)、劣势(Weaknesses)、机会(Opportunities)、威胁(Threats)四个维度拆解。',
    template: '我有一个主题为【{topic}】的思维导图。请针对节点【{nodeText}】，从优势(Strengths)、劣势(Weaknesses)、机会(Opportunities)、威胁(Threats)四个维度进行全面拆解拓展。请直接以Markdown列表格式输出，无需任何多余开场白。'
  },
  {
    id: '5w2h',
    name: '5W2H 执行剖析',
    desc: '按照 Why、What、Who、When、Where、How、How much 结构化剖析。',
    template: '我有一个主题为【{topic}】的思维导图。请针对节点【{nodeText}】，使用5W2H分析法（Why为什么、What做什么、Who责任人、When时间节点、Where地点/范围、How执行方式、How much预期成本）进行结构化拆解拓展。请直接以Markdown列表格式输出，无需任何多余开场白。'
  },
  {
    id: 'brainstorm',
    name: '头脑风暴创意发散',
    desc: '跳出固有思维模式，提供前瞻性、突破性和差异化的创新视角。',
    template: '我有一个主题为【{topic}】的思维导图。请围绕节点【{nodeText}】开展创新头脑风暴，提供3-5个富有创意、突破常规、具有探索价值的创新视角子分支。请直接以Markdown列表格式输出，无需任何多余开场白。'
  },
  {
    id: 'custom',
    name: '自定义 Prompt',
    desc: '使用用户自定义的 Prompt 模版进行续写拓展。',
    template: ''
  }
]

export const AI_EXPLANATION_PRESETS = [
  {
    id: 'plain',
    name: '通俗易懂（科普比喻）',
    desc: '用大白话和生活中的生动比喻，向初学者深入浅出地解释概念本质。',
    template: '你是一位资深科普导师。请针对词条“{text}”（所属思维导图主题：【{topic}】，所属节点：【{nodeText}】），用通俗易懂、生动形象的语言解释其核心含义。请结合生活中的生动比喻，语言风趣明晰，使用Markdown格式输出，字数200字左右为宜。'
  },
  {
    id: 'professional',
    name: '专业精准（行业深度定义）',
    desc: '给出权威标准的学术/行业定义、核心工作机制及典型应用场景。',
    template: '请针对词条“{text}”（所属思维导图主题：【{topic}】，所属节点：【{nodeText}】），给出专业、权威且精准的行业标准定义。阐明其底层核心原理、关键组成要素以及在当前语境下的典型实践场景。使用Markdown分段与要点列出，保持严谨专业。'
  },
  {
    id: 'keypoints',
    name: '结构化速记（核心提炼）',
    desc: '按“一句话本质 + 3大核心特征 + 1个典型应用案例”速记提炼。',
    template: '请对词条“{text}”（语境节点：【{nodeText}】）进行结构化速记提炼，按以下Markdown格式输出：\n\n### 📌 一句话本质\n简明扼要概括其核心定义。\n\n### ⚡ 核心特征\n1. 特征一\n2. 特征二\n3. 特征三\n\n### 💡 典型应用示例\n一个最接地气或最前沿的应用案例。'
  },
  {
    id: 'bilingual',
    name: '中英双语与词源背景',
    desc: '提供标准英文术语、词源发展脉络及国际学术/前沿标准阐释。',
    template: '请针对词条“{text}”（语境节点：【{nodeText}】），提供其英文标准学术对应术语、词源历史演变脉络，以及在国际前沿领域中的概念阐释与延展，使用Markdown双语对照排版。'
  },
  {
    id: 'custom',
    name: '自定义 Prompt',
    desc: '使用用户自定义的 Prompt 模版进行概念释义。',
    template: ''
  }
]

/**
 * 格式化替换 Prompt 中的占位符
 * 支持变量：{text}, {nodeText}, {topic}
 */
export function formatPrompt(template, { text = '', nodeText = '', topic = '' } = {}) {
  if (!template) return ''
  return template
    .replace(/\{text\}/g, text || '')
    .replace(/\{nodeText\}/g, nodeText || '')
    .replace(/\{topic\}/g, topic || '')
}
