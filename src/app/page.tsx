'use client'

import { useState, useMemo } from 'react'
import { preAnalyzedNotes, preAnalyzedStats } from '@/lib/mock-data'
import { AnalyzedNote, STRATEGY_LABELS, STRATEGY_COLORS, COVER_TYPE_LABELS } from '@/lib/types'
import {
  BarChart3,
  Sparkles,
  Target,
  Search,
  Plus,
  X,
  Loader2,
  ExternalLink,
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Share2,
  TrendingUp,
  AlertCircle,
  Zap,
  Filter,
  ArrowUpDown,
} from 'lucide-react'

export default function Home() {
  const [notes, setNotes] = useState<AnalyzedNote[]>(preAnalyzedNotes)
  const [selectedNote, setSelectedNote] = useState<AnalyzedNote | null>(null)
  const [filterStrategy, setFilterStrategy] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'score' | 'budget' | 'cpa'>('score')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    author: '',
    likes: 0,
    collects: 0,
    shares: 0,
    comments: '',
    coverType: 'review',
    brand: 'BOLOLO',
  })

  const filteredNotes = useMemo(() => {
    let result = [...notes]

    if (filterStrategy !== 'all') {
      result = result.filter((n) => n.analysis.strategy === filterStrategy)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.content.toLowerCase().includes(term) ||
          n.analysis.keywords.some((k) => k.toLowerCase().includes(term)) ||
          n.brandMentioned.toLowerCase().includes(term)
      )
    }

    if (sortBy === 'score') {
      result.sort((a, b) => b.analysis.score - a.analysis.score)
    } else if (sortBy === 'budget') {
      result.sort((a, b) => b.analysis.suggestedBudget - a.analysis.suggestedBudget)
    } else if (sortBy === 'cpa') {
      result.sort((a, b) => a.analysis.expectedCPA - b.analysis.expectedCPA)
    }

    return result
  }, [notes, filterStrategy, sortBy, searchTerm])

  const stats = useMemo(() => {
    const visible = filteredNotes
    return {
      total: visible.length,
      recommended: visible.filter((n) => n.analysis.strategy !== 'not_recommended').length,
      avgScore:
        visible.length > 0
          ? Math.round(visible.reduce((s, n) => s + n.analysis.score, 0) / visible.length)
          : 0,
      totalBudget: visible.reduce((s, n) => s + n.analysis.suggestedBudget, 0),
    }
  }, [filteredNotes])

  async function handleAddNote() {
    if (!newNote.title || !newNote.content) return

    setAnalyzing(true)
    try {
      const comments = newNote.comments
        ? newNote.comments.split('\n').filter(Boolean).map((c) => ({
            content: c.trim(),
            likes: Math.floor(Math.random() * 20),
          }))
        : []

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newNote,
          comments,
          coverType: newNote.coverType,
          brandMentioned: newNote.brand,
        }),
      })

      if (!res.ok) throw new Error('分析失败')

      const analyzed = await res.json()
      setNotes((prev) => [analyzed, ...prev])
      setShowAddModal(false)
      setNewNote({ title: '', content: '', author: '', likes: 0, collects: 0, shares: 0, comments: '', coverType: 'review', brand: 'BOLOLO' })
    } catch (err) {
      alert('分析失败，请检查 API 配置后重试')
    } finally {
      setAnalyzing(false)
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const scoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200'
    if (score >= 60) return 'bg-amber-50 border-amber-200'
    if (score >= 40) return 'bg-orange-50 border-orange-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">KOC 投流价值 AI 评估引擎</h1>
                <p className="text-xs text-gray-500">BOLOLO 波咯咯 · 小红书智能投流助手</p>
              </div>
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> 分析新笔记
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <BarChart3 className="w-4 h-4" /> 笔记总数
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-400 mt-1">已分析KOC笔记</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Target className="w-4 h-4" /> 推荐投流
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.recommended}</div>
            <div className="text-xs text-gray-400 mt-1">建议付费推广</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4" /> 平均评分
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.avgScore}</div>
            <div className="text-xs text-gray-400 mt-1">综合投流价值分</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Zap className="w-4 h-4" /> 推荐总预算
            </div>
            <div className="text-2xl font-bold text-amber-600">¥{stats.totalBudget.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">建议日投放金额</div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索笔记、关键词、品牌..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {['all', 'acquisition', 'retention', 'both', 'not_recommended'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStrategy(s)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  filterStrategy === s
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s === 'all' ? '全部' : STRATEGY_LABELS[s]?.replace(/[🎯🔄🔀⛔]\s*/, '')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            {[
              { key: 'score', label: '按评分' },
              { key: 'budget', label: '按预算' },
              { key: 'cpa', label: '按CPA' },
            ].map((o) => (
              <button
                key={o.key}
                onClick={() => setSortBy(o.key as any)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  sortBy === o.key
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`card p-5 cursor-pointer ${scoreBg(note.analysis.score)}`}
              onClick={() => setSelectedNote(note)}
            >
              {/* Score Badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`badge ${STRATEGY_COLORS[note.analysis.strategy]}`}>
                    {STRATEGY_LABELS[note.analysis.strategy]}
                  </span>
                  <span className="text-xs text-gray-400">{COVER_TYPE_LABELS[note.coverType]}</span>
                </div>
                <div className={`text-2xl font-bold ${scoreColor(note.analysis.score)}`}>
                  {note.analysis.score}
                </div>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug">
                {note.title}
              </h3>

              {/* Content preview */}
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{note.content}</p>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> {note.likes.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Bookmark className="w-3 h-3" /> {note.collects.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {note.comments.length}
                </span>
              </div>

              {/* Keywords */}
              <div className="flex flex-wrap gap-1.5">
                {note.analysis.keywords.slice(0, 3).map((kw) => (
                  <span
                    key={kw}
                    className="text-xs px-2 py-0.5 bg-white/70 rounded-full text-gray-600 border border-gray-200"
                  >
                    {kw}
                  </span>
                ))}
                {note.analysis.keywords.length > 3 && (
                  <span className="text-xs text-gray-400">+{note.analysis.keywords.length - 3}</span>
                )}
              </div>

              {/* Budget & CPA */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200/50">
                <span className="text-xs text-gray-500">
                  建议预算 <strong className="text-gray-800">¥{note.analysis.suggestedBudget}/天</strong>
                </span>
                <span className="text-xs text-gray-500">
                  预期CPA <strong className="text-gray-800">¥{note.analysis.expectedCPA}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredNotes.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>没有匹配的笔记，试试调整筛选条件</p>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedNote && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className={`badge text-sm ${STRATEGY_COLORS[selectedNote.analysis.strategy]}`}>
                  {STRATEGY_LABELS[selectedNote.analysis.strategy]}
                </span>
                <span
                  className={`text-3xl font-bold ${scoreColor(selectedNote.analysis.score)}`}
                >
                  {selectedNote.analysis.score}
                  <span className="text-sm font-normal text-gray-400">/100</span>
                </span>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Title & Content */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedNote.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedNote.content}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>作者：{selectedNote.author}</span>
                  <span>品牌：{selectedNote.brandMentioned}</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> {selectedNote.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bookmark className="w-3 h-3" /> {selectedNote.collects.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="w-3 h-3" /> {selectedNote.shares.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 font-medium mb-3 text-sm">
                  <Sparkles className="w-4 h-4" /> AI 投流分析
                </div>

                <div className="space-y-3">
                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-green-700 mb-1.5">✅ 投流优势</div>
                      <ul className="space-y-1">
                        {selectedNote.analysis.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                            <span className="text-green-500 shrink-0">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-red-700 mb-1.5">⚠️ 投流劣势</div>
                      <ul className="space-y-1">
                        {selectedNote.analysis.weaknesses.map((w, i) => (
                          <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                            <span className="text-red-400 shrink-0">•</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1.5">🔑 搜索关键词</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNote.analysis.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-xs px-2.5 py-1 bg-white rounded-full text-blue-700 border border-blue-200"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1.5">👥 目标人群</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNote.analysis.targetAudience.map((ta) => (
                        <span
                          key={ta}
                          className="text-xs px-2.5 py-1 bg-white rounded-full text-purple-700 border border-purple-200"
                        >
                          {ta}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Match Scores */}
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-1.5">📊 人群匹配度</div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-blue-600">拉新吸引力</span>
                          <span className="font-semibold">{selectedNote.analysis.matchScore.newUser}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${selectedNote.analysis.matchScore.newUser}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-amber-600">老客转化力</span>
                          <span className="font-semibold">{selectedNote.analysis.matchScore.oldUser}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${selectedNote.analysis.matchScore.oldUser}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="text-xs font-medium text-blue-700 mb-1">💡 投流建议</div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedNote.analysis.recommendation}
                    </p>
                  </div>

                  {/* Budget & CPA */}
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-400">建议日预算 </span>
                      <strong className="text-gray-900">¥{selectedNote.analysis.suggestedBudget}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">预期CPA </span>
                      <strong className="text-gray-900">¥{selectedNote.analysis.expectedCPA}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">购买意向比 </span>
                      <strong className="text-gray-900">
                        {Math.round(selectedNote.analysis.commentIntentRate * 100)}%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Preview */}
              {selectedNote.comments.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    💬 评论分析（共 {selectedNote.comments.length} 条）
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedNote.comments.map((c, i) => (
                      <div
                        key={i}
                        className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 flex justify-between items-center"
                      >
                        <span>"{c.content}"</span>
                        <span className="text-gray-400 shrink-0 ml-2">{c.likes}👍</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-100">
              <div className="text-xs text-gray-400">{selectedNote.analysis.contentQuality}</div>
              <button
                onClick={() => setSelectedNote(null)}
                className="btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold">分析新笔记</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">笔记标题 *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入小红书笔记标题..."
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">笔记内容 *</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                  placeholder="粘贴笔记正文内容..."
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">作者昵称</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newNote.author}
                    onChange={(e) => setNewNote({ ...newNote, author: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">涉及品牌</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newNote.brand}
                    onChange={(e) => setNewNote({ ...newNote, brand: e.target.value })}
                  >
                    <option value="BOLOLO">BOLOLO 波咯咯</option>
                    <option value="小白熊">小白熊</option>
                    <option value="新贝">新贝</option>
                    <option value="云贝">云贝</option>
                    <option value="未提及">未提及品牌</option>
                    <option value="其它">其它</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">点赞数</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newNote.likes}
                    onChange={(e) => setNewNote({ ...newNote, likes: +e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">收藏数</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newNote.collects}
                    onChange={(e) => setNewNote({ ...newNote, collects: +e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分享数</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newNote.shares}
                    onChange={(e) => setNewNote({ ...newNote, shares: +e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容类型</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newNote.coverType}
                  onChange={(e) => setNewNote({ ...newNote, coverType: e.target.value })}
                >
                  <option value="review">评测种草</option>
                  <option value="story">场景故事</option>
                  <option value="comparison">横评对比</option>
                  <option value="tip">避坑攻略</option>
                  <option value="scenario">好物分享</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  评论内容（每行一条评论）
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  placeholder={`这个多少钱？求链接\n好用吗？\n已下单！`}
                  value={newNote.comments}
                  onChange={(e) => setNewNote({ ...newNote, comments: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">
                取消
              </button>
              <button
                onClick={handleAddNote}
                disabled={analyzing || !newNote.title || !newNote.content}
                className="btn-primary flex items-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> AI分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> 开始分析
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-8">
        KOC 投流价值 AI 评估引擎 · Demo v1.0 · Built with DeepSeek API
      </footer>
    </div>
  )
}
