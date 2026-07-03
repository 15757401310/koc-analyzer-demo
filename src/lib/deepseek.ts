import { AnalysisResult, KocNote } from './types'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-chat'

export async function analyzeNote(note: KocNote): Promise<AnalysisResult> {
  // Strip BOM and whitespace from env var (defensive against platform encoding issues)
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').replace(/^﻿/, '').trim()

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured')
  }

  const commentsText = note.comments
    .map((c) => `- "${c.content}" (${c.likes}赞)`)
    .join('\n')

  const prompt = `你是一个小红书投流专家，专门为母婴智能家电品牌（BOLOLO/波咯咯）评估KOC笔记的付费投流价值。

请分析以下笔记：

📝 标题：${note.title}
📝 内容：${note.content}
📝 类型：${note.coverType}
📝 品牌：${note.brandMentioned}

📊 互动数据：
- 点赞：${note.likes}
- 收藏：${note.collects}
- 分享：${note.shares}

💬 评论（共${note.comments.length}条）：
${commentsText || '暂无评论'}

请从以下维度评估投流价值，并输出JSON格式（不要有其他文字）：

{
  "score": <0-100整数，综合投流价值评分>,
  "strategy": <"acquisition"|"retention"|"both"|"not_recommended">,
  "keywords": [<3-5个该笔记覆盖的搜索关键词>],
  "targetAudience": [<2-3个目标人群标签>],
  "strengths": [<2-3个投流优势>],
  "weaknesses": [<1-2个投流劣势>],
  "recommendation": <具体投流建议，含出价策略和预算建议，80-120字>,
  "suggestedBudget": <建议日预算金额，整数>,
  "expectedCPA": <预期单次转化成本，整数>,
  "commentIntentRate": <0-1之间，评论中有购买意向的比例>,
  "contentQuality": <内容质量一句话总结>,
  "matchScore": {
    "newUser": <0-100，该内容对新用户（不认识品牌的人）的吸引力>,
    "oldUser": <0-100，该内容对老用户（了解品牌的人）的转化力>
  }
}

策略判断规则：
- acquisition（拉新）：内容偏科普、测评、横向对比，适合触达还不知道品牌的新用户
- retention（收割老用户）：内容偏深度体验、使用技巧、促销信息，适合推动已了解品牌的用户下单
- both：既适合拉新也适合收割
- not_recommended：内容质量差、评论区无购买意向、或可能引发负面舆情，不建议投流

注意：
1. 评论区有"哪里买""多少钱""求链接"等明确购买意向的，score应显著加分
2. 评论区只有夸博主好看/拍照好的，说明内容没有种草效果，score应降低
3. BOLOLO/波咯咯品牌相关笔记，拉新价值加分
4. 竞品品牌（小白熊、新贝等）的笔记也可投流，但策略需调整为截流/对比话题`

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是一个专业的小红书投流分析专家。请只输出JSON格式的分析结果，不要有任何其他文字。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content

  // Parse JSON from response — handle potential markdown wrapping
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '')
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```\n?/, '').replace(/```\n?$/, '')
  }

  try {
    return JSON.parse(jsonStr) as AnalysisResult
  } catch {
    throw new Error(`Failed to parse DeepSeek response as JSON: ${jsonStr}`)
  }
}

export async function batchAnalyzeNotes(notes: KocNote[]): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = []
  for (const note of notes) {
    try {
      const result = await analyzeNote(note)
      results.push(result)
    } catch (error) {
      console.error(`Failed to analyze note ${note.id}:`, error)
      // Return a fallback result on error
      results.push({
        score: 0,
        strategy: 'not_recommended',
        keywords: [],
        targetAudience: [],
        strengths: [],
        weaknesses: ['分析失败，请重试'],
        recommendation: 'API 分析出错，请稍后重试',
        suggestedBudget: 0,
        expectedCPA: 0,
        commentIntentRate: 0,
        contentQuality: '无法分析',
        matchScore: { newUser: 0, oldUser: 0 },
      })
    }
  }
  return results
}
