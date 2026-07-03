export interface Comment {
  content: string
  likes: number
}

export interface KocNote {
  id: string
  title: string
  content: string
  author: string
  url?: string
  likes: number
  comments: Comment[]
  collects: number
  shares: number
  coverType: 'review' | 'story' | 'comparison' | 'tip' | 'scenario'
  brandMentioned: string
}

export interface AnalysisResult {
  score: number
  strategy: 'acquisition' | 'retention' | 'both' | 'not_recommended'
  keywords: string[]
  targetAudience: string[]
  strengths: string[]
  weaknesses: string[]
  recommendation: string
  suggestedBudget: number
  expectedCPA: number
  commentIntentRate: number
  contentQuality: string
  matchScore: {
    newUser: number
    oldUser: number
  }
}

export interface AnalyzedNote extends KocNote {
  analysis: AnalysisResult
  analyzedAt: string
}

export const STRATEGY_LABELS: Record<string, string> = {
  acquisition: '🎯 拉新',
  retention: '🔄 收割老用户',
  both: '🔀 拉新+收割',
  not_recommended: '⛔ 不推荐投流',
}

export const STRATEGY_COLORS: Record<string, string> = {
  acquisition: 'bg-blue-100 text-blue-800 border-blue-300',
  retention: 'bg-amber-100 text-amber-800 border-amber-300',
  both: 'bg-green-100 text-green-800 border-green-300',
  not_recommended: 'bg-gray-100 text-gray-500 border-gray-300',
}

export const COVER_TYPE_LABELS: Record<string, string> = {
  review: '评测种草',
  story: '场景故事',
  comparison: '横评对比',
  tip: '避坑攻略',
  scenario: '好物分享',
}
