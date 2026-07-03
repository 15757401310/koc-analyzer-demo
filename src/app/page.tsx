'use client'

import { useState, useMemo, useRef } from 'react'
import { preAnalyzedNotes } from '@/lib/mock-data'
import { AnalyzedNote, STRATEGY_LABELS, STRATEGY_COLORS, COVER_TYPE_LABELS } from '@/lib/types'
import {
  BarChart3,
  Sparkles,
  Target,
  Search,
  Plus,
  X,
  Loader2,
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Share2,
  TrendingUp,
  AlertCircle,
  Zap,
  Filter,
  ArrowUpDown,
  Upload,
  Link2,
  FileSpreadsheet,
  ChevronDown,
  Info,
  Copy,
  Check,
  Trash2,
  RotateCcw,
} from 'lucide-react'

type ImportTab = 'manual' | 'url' | 'excel'

export default function Home() {
  const [notes, setNotes] = useState<AnalyzedNote[]>(preAnalyzedNotes)
  const [selectedNote, setSelectedNote] = useState<AnalyzedNote | null>(null)
  const [filterStrategy, setFilterStrategy] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'score' | 'budget' | 'cpa'>('score')
  const [searchTerm, setSearchTerm] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importTab, setImportTab] = useState<ImportTab>('manual')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState('')
  const [copied, setCopied] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const hasImportedNotes = notes.length > preAnalyzedNotes.length
  const isModified = notes.length !== preAnalyzedNotes.length || notes.some((n, i) => n.id !== preAnalyzedNotes[i]?.id)

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (selectedNote?.id === id) setSelectedNote(null)
  }

  function clearAllNotes() {
    setNotes([])
    setShowClearConfirm(false)
  }

  function resetToDefault() {
    setNotes(preAnalyzedNotes)
    setShowClearConfirm(false)
  }

  // Manual form state
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

  // URL import state
  const [urlInput, setUrlInput] = useState('')
  const [urlNoteData, setUrlNoteData] = useState<{ title: string; content: string }[]>([])

  // Excel import state
  const [excelInput, setExcelInput] = useState('')

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
    if (sortBy === 'score') result.sort((a, b) => b.analysis.score - a.analysis.score)
    else if (sortBy === 'budget') result.sort((a, b) => b.analysis.suggestedBudget - a.analysis.suggestedBudget)
    else if (sortBy === 'cpa') result.sort((a, b) => a.analysis.expectedCPA - b.analysis.expectedCPA)
    return result
  }, [notes, filterStrategy, sortBy, searchTerm])

  const stats = useMemo(() => {
    const visible = filteredNotes
    return {
      total: visible.length,
      recommended: visible.filter((n) => n.analysis.strategy !== 'not_recommended').length,
      avgScore: visible.length > 0 ? Math.round(visible.reduce((s, n) => s + n.analysis.score, 0) / visible.length) : 0,
      totalBudget: visible.reduce((s, n) => s + n.analysis.suggestedBudget, 0),
    }
  }, [filteredNotes])

  // === MANUAL IMPORT ===
  async function handleManualImport() {
    if (!newNote.title || !newNote.content) return
    setAnalyzing(true)
    setAnalyzeProgress('正在分析笔记...')
    try {
      const comments = newNote.comments
        ? newNote.comments.split('\n').filter(Boolean).map((c) => ({ content: c.trim(), likes: Math.floor(Math.random() * 20) }))
        : []
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newNote, comments, coverType: newNote.coverType, brandMentioned: newNote.brand }) })
      if (!res.ok) throw new Error('分析失败')
      const analyzed = await res.json()
      setNotes((prev) => [analyzed, ...prev])
      setShowImportModal(false)
      setNewNote({ title: '', content: '', author: '', likes: 0, collects: 0, shares: 0, comments: '', coverType: 'review', brand: 'BOLOLO' })
    } catch { alert('分析失败，请重试') }
    finally { setAnalyzing(false); setAnalyzeProgress('') }
  }

  // === URL IMPORT ===
  async function handleUrlImport() {
    const urls = urlInput.split('\n').filter((l) => l.trim())
    if (urls.length === 0) return
    setAnalyzing(true)
    setAnalyzeProgress(`正在解析 ${urls.length} 条链接...`)

    // For demo: extract note ID from URL and simulate content
    // In production, this would call Xiaohongshu API /蒲公英API
    const parsedNotes = urls.map((url, i) => {
      const urlObj = url.trim()
      const noteIdMatch = urlObj.match(/search_result\/([a-f0-9]+)/)
      const noteId = noteIdMatch ? noteIdMatch[1].slice(0, 8) : `note-${i}`
      return {
        id: `url-${noteId}-${Date.now()}`,
        title: `小红书笔记 ${noteId}`,
        content: `请手动补充笔记内容。链接: ${urlObj}`,
        author: '待补充',
        likes: 0,
        collects: 0,
        shares: 0,
        comments: [] as { content: string; likes: number }[],
        coverType: 'review' as const,
        brand: '未提及',
        url: urlObj,
      }
    })

    // Analyze each note
    const results: AnalyzedNote[] = []
    for (let i = 0; i < parsedNotes.length; i++) {
      setAnalyzeProgress(`正在分析第 ${i + 1}/${parsedNotes.length} 篇笔记...`)
      try {
        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsedNotes[i]) })
        if (res.ok) {
          const analyzed = await res.json()
          results.push(analyzed)
        }
      } catch { /* skip failed */ }
    }

    if (results.length > 0) {
      setNotes((prev) => [...results, ...prev])
    } else {
      alert('所有笔记分析失败，请检查网络或 API 配置')
    }

    setAnalyzing(false)
    setAnalyzeProgress('')
    setUrlInput('')
    setShowImportModal(false)
  }

  // === EXCEL IMPORT ===
  async function handleExcelImport() {
    if (!excelInput.trim()) return
    setAnalyzing(true)

    // Parse tab-separated rows
    const lines = excelInput.split('\n').filter((l) => l.trim())
    if (lines.length === 0) { setAnalyzing(false); return }

    // Check if first line is header, skip if so
    const firstLine = lines[0].toLowerCase()
    const hasHeader = firstLine.includes('标题') && firstLine.includes('内容')
    const dataLines = hasHeader ? lines.slice(1) : lines

    const parsedNotes: any[] = []
    for (const line of dataLines) {
      const cols = line.split('\t')
      if (cols.length < 2) continue
      const [title, content, author, likes, collects, shares, commentsStr, coverType, brand] = cols
      const comments = commentsStr
        ? commentsStr.split('|').filter(Boolean).map((c) => ({ content: c.trim(), likes: Math.floor(Math.random() * 15) }))
        : []
      parsedNotes.push({
        id: `excel-${Date.now()}-${parsedNotes.length}`,
        title: (title || '').trim(),
        content: (content || '').trim(),
        author: (author || '未知作者').trim(),
        likes: parseInt(likes) || 0,
        collects: parseInt(collects) || 0,
        shares: parseInt(shares) || 0,
        comments,
        coverType: coverType?.trim() || 'review',
        brand: brand?.trim() || '未提及',
      })
    }

    if (parsedNotes.length === 0) { setAnalyzing(false); alert('未解析到有效数据，请检查格式'); return }

    const results: AnalyzedNote[] = []
    for (let i = 0; i < parsedNotes.length; i++) {
      setAnalyzeProgress(`正在分析第 ${i + 1}/${parsedNotes.length} 篇笔记...`)
      try {
        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsedNotes[i]) })
        if (res.ok) {
          const analyzed = await res.json()
          results.push(analyzed)
        }
      } catch { /* skip */ }
    }

    if (results.length > 0) {
      setNotes((prev) => [...results, ...prev])
    } else {
      alert('所有笔记分析失败，请检查格式或重试')
    }

    setAnalyzing(false)
    setAnalyzeProgress('')
    setExcelInput('')
    setShowImportModal(false)
  }

  function copyTemplate() {
    const template = '泡奶机3个月真实体验\t用了三个月来评价，定量出水精准，全玻璃材质无异味，夜奶党福音。价格小贵但值。\t真实宝妈\t356\t189\t45\t求链接！|已下单|波咯咯确实好用\treview\tBOLOLO'
    navigator.clipboard.writeText(template)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  const excelColumns = ['标题', '内容', '作者', '点赞', '收藏', '分享', '评论(|分隔)', '类型', '品牌']

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
            <div className="flex items-center gap-2">
              {notes.length > 0 && (
                <button onClick={() => setShowClearConfirm(true)} className="btn-secondary flex items-center gap-1.5 text-xs text-red-500 hover:bg-red-50 border-red-200">
                  <Trash2 className="w-3.5 h-3.5" /> 清空
                </button>
              )}
              {isModified && (
                <button onClick={resetToDefault} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <RotateCcw className="w-3.5 h-3.5" /> 重置
                </button>
              )}
              <button onClick={() => { setImportTab('manual'); setShowImportModal(true) }} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> 导入笔记
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: BarChart3, label: '笔记总数', value: stats.total, sub: '已分析KOC笔记' },
            { icon: Target, label: '推荐投流', value: stats.recommended, sub: '建议付费推广', color: 'text-green-600' },
            { icon: TrendingUp, label: '平均评分', value: stats.avgScore, sub: '综合投流价值分', color: 'text-blue-600' },
            { icon: Zap, label: '推荐总预算', value: `¥${stats.totalBudget.toLocaleString()}`, sub: '建议日投放金额', color: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><s.icon className="w-4 h-4" /> {s.label}</div>
              <div className={`text-2xl font-bold ${s.color || ''}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="搜索笔记、关键词、品牌..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {['all', 'acquisition', 'retention', 'both', 'not_recommended'].map((s) => (
              <button key={s} onClick={() => setFilterStrategy(s)} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${filterStrategy === s ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {s === 'all' ? '全部' : STRATEGY_LABELS[s]?.replace(/[🎯🔄🔀⛔]\s*/, '')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            {[{ key: 'score', label: '按评分' }, { key: 'budget', label: '按预算' }, { key: 'cpa', label: '按CPA' }].map((o) => (
              <button key={o.key} onClick={() => setSortBy(o.key as any)} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${sortBy === o.key ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{o.label}</button>
            ))}
          </div>
        </div>

        {/* Note Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div key={note.id} className={`card p-5 relative group ${scoreBg(note.analysis.score)}`}>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10"
                title="删除此笔记"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div onClick={() => setSelectedNote(note)} className="cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`badge ${STRATEGY_COLORS[note.analysis.strategy]}`}>{STRATEGY_LABELS[note.analysis.strategy]}</span>
                  <span className="text-xs text-gray-400">{COVER_TYPE_LABELS[note.coverType]}</span>
                </div>
                <div className={`text-2xl font-bold ${scoreColor(note.analysis.score)}`}>{note.analysis.score}</div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug">{note.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{note.content}</p>
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {note.likes.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" /> {note.collects.toLocaleString()}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {note.comments.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {note.analysis.keywords.slice(0, 3).map((kw) => (
                  <span key={kw} className="text-xs px-2 py-0.5 bg-white/70 rounded-full text-gray-600 border border-gray-200">{kw}</span>
                ))}
                {note.analysis.keywords.length > 3 && <span className="text-xs text-gray-400">+{note.analysis.keywords.length - 3}</span>}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200/50">
                <span className="text-xs text-gray-500">建议预算 <strong className="text-gray-800">¥{note.analysis.suggestedBudget}/天</strong></span>
                <span className="text-xs text-gray-500">预期CPA <strong className="text-gray-800">¥{note.analysis.expectedCPA}</strong></span>
              </div>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" onClick={() => setSelectedNote(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className={`badge text-sm ${STRATEGY_COLORS[selectedNote.analysis.strategy]}`}>{STRATEGY_LABELS[selectedNote.analysis.strategy]}</span>
                <span className={`text-3xl font-bold ${scoreColor(selectedNote.analysis.score)}`}>{selectedNote.analysis.score}<span className="text-sm font-normal text-gray-400">/100</span></span>
              </div>
              <button onClick={() => setSelectedNote(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedNote.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedNote.content}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>作者：{selectedNote.author}</span><span>品牌：{selectedNote.brandMentioned}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {selectedNote.likes.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" /> {selectedNote.collects.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Share2 className="w-3 h-3" /> {selectedNote.shares.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 font-medium mb-3 text-sm"><Sparkles className="w-4 h-4" /> AI 投流分析</div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-green-700 mb-1.5">✅ 投流优势</div>
                      <ul className="space-y-1">{(selectedNote.analysis.strengths || []).map((s, i) => <li key={i} className="text-xs text-gray-700 flex gap-1.5"><span className="text-green-500">•</span> {s}</li>)}</ul>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-red-700 mb-1.5">⚠️ 投流劣势</div>
                      <ul className="space-y-1">{(selectedNote.analysis.weaknesses || []).map((w, i) => <li key={i} className="text-xs text-gray-700 flex gap-1.5"><span className="text-red-400">•</span> {w}</li>)}</ul>
                    </div>
                  </div>
                  <div><div className="text-xs font-medium text-gray-700 mb-1.5">🔑 搜索关键词</div>
                    <div className="flex flex-wrap gap-1.5">{(selectedNote.analysis.keywords || []).map((kw) => <span key={kw} className="text-xs px-2.5 py-1 bg-white rounded-full text-blue-700 border border-blue-200">{kw}</span>)}</div>
                  </div>
                  <div><div className="text-xs font-medium text-gray-700 mb-1.5">👥 目标人群</div>
                    <div className="flex flex-wrap gap-1.5">{(selectedNote.analysis.targetAudience || []).map((ta) => <span key={ta} className="text-xs px-2.5 py-1 bg-white rounded-full text-purple-700 border border-purple-200">{ta}</span>)}</div>
                  </div>
                  <div><div className="text-xs font-medium text-gray-700 mb-1.5">📊 人群匹配度</div>
                    <div className="flex gap-4">
                      <div className="flex-1"><div className="flex justify-between text-xs mb-1"><span className="text-blue-600">拉新吸引力</span><span className="font-semibold">{selectedNote.analysis.matchScore.newUser}</span></div><div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedNote.analysis.matchScore.newUser}%` }} /></div></div>
                      <div className="flex-1"><div className="flex justify-between text-xs mb-1"><span className="text-amber-600">老客转化力</span><span className="font-semibold">{selectedNote.analysis.matchScore.oldUser}</span></div><div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedNote.analysis.matchScore.oldUser}%` }} /></div></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100"><div className="text-xs font-medium text-blue-700 mb-1">💡 投流建议</div><p className="text-sm text-gray-700 leading-relaxed">{selectedNote.analysis.recommendation}</p></div>
                  <div className="flex items-center gap-6 text-sm">
                    <div><span className="text-gray-400">建议日预算 </span><strong className="text-gray-900">¥{selectedNote.analysis.suggestedBudget}</strong></div>
                    <div><span className="text-gray-400">预期CPA </span><strong className="text-gray-900">¥{selectedNote.analysis.expectedCPA}</strong></div>
                    <div><span className="text-gray-400">购买意向比 </span><strong className="text-gray-900">{Math.round(selectedNote.analysis.commentIntentRate * 100)}%</strong></div>
                  </div>
                </div>
              </div>
              {selectedNote.comments.length > 0 && (
                <div><div className="text-sm font-medium text-gray-700 mb-2">💬 评论分析（共 {selectedNote.comments.length} 条）</div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">{(selectedNote.comments || []).map((c, i) => <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 flex justify-between items-center"><span>"{c.content}"</span><span className="text-gray-400 shrink-0 ml-2">{c.likes}👍</span></div>)}</div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-6 border-t border-gray-100">
              <div className="text-xs text-gray-400">{selectedNote.analysis.contentQuality}</div>
              <button onClick={() => setSelectedNote(null)} className="btn-secondary">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== IMPORT MODAL ==================== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Tab bar */}
            <div className="flex items-center border-b border-gray-100">
              {[
                { key: 'manual' as ImportTab, icon: Plus, label: '手动填写' },
                { key: 'url' as ImportTab, icon: Link2, label: '粘贴链接导入' },
                { key: 'excel' as ImportTab, icon: FileSpreadsheet, label: 'Excel 批量导入' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setImportTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                    importTab === tab.key
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>

            {/* === TAB: MANUAL === */}
            {importTab === 'manual' && (
              <>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    手动填写单篇笔记信息，适用于少量笔记或现场演示。
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">笔记标题 *</label>
                      <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="输入小红书笔记标题..." value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">作者昵称</label>
                      <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newNote.author} onChange={(e) => setNewNote({ ...newNote, author: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">笔记内容 *</label>
                    <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none" placeholder="粘贴笔记正文内容..." value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">涉及品牌</label>
                      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newNote.brand} onChange={(e) => setNewNote({ ...newNote, brand: e.target.value })}>
                        <option value="BOLOLO">BOLOLO 波咯咯</option><option value="小白熊">小白熊</option><option value="新贝">新贝</option><option value="云贝">云贝</option><option value="未提及">未提及品牌</option><option value="其它">其它</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">内容类型</label>
                      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newNote.coverType} onChange={(e) => setNewNote({ ...newNote, coverType: e.target.value })}>
                        <option value="review">评测种草</option><option value="story">场景故事</option><option value="comparison">横评对比</option><option value="tip">避坑攻略</option><option value="scenario">好物分享</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['likes', 'collects', 'shares'] as const).map((k) => (
                      <div key={k}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{k === 'likes' ? '点赞数' : k === 'collects' ? '收藏数' : '分享数'}</label>
                        <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newNote[k]} onChange={(e) => setNewNote({ ...newNote, [k]: +e.target.value })} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">评论内容（每行一条评论）</label>
                    <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none" placeholder={'这个多少钱？求链接\n好用吗？\n已下单！'} value={newNote.comments} onChange={(e) => setNewNote({ ...newNote, comments: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-6 border-t border-gray-100">
                  <button onClick={() => setShowImportModal(false)} className="btn-secondary">取消</button>
                  <button onClick={handleManualImport} disabled={analyzing || !newNote.title || !newNote.content} className="btn-primary flex items-center gap-2">
                    {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> {analyzeProgress}</> : <><Sparkles className="w-4 h-4" /> 开始分析</>}
                  </button>
                </div>
              </>
            )}

            {/* === TAB: URL === */}
            {importTab === 'url' && (
              <>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    粘贴小红书笔记链接，每行一条。系统将自动获取笔记信息并 AI 分析投流价值。<br />
                    当前为 Demo 版本，链接解析为模拟数据，接入聚光/蒲公英 API 后可获取真实笔记数据。
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">小红书笔记链接</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 resize-none font-mono text-xs"
                      placeholder={`https://www.xiaohongshu.com/explore/abc123\nhttps://www.xiaohongshu.com/explore/def456\nhttps://www.xiaohongshu.com/explore/ghi789`}
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <div className="text-xs text-gray-400 mt-1">每行一条链接，支持 explore 和 search_result 格式</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-6 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    {urlInput.trim() ? `已输入 ${urlInput.split('\n').filter((l) => l.trim()).length} 条链接` : '请粘贴小红书笔记链接'}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowImportModal(false)} className="btn-secondary">取消</button>
                    <button onClick={handleUrlImport} disabled={analyzing || !urlInput.trim()} className="btn-primary flex items-center gap-2">
                      {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> {analyzeProgress}</> : <><Upload className="w-4 h-4" /> 获取并分析</>}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* === TAB: EXCEL === */}
            {importTab === 'excel' && (
              <>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Format guide */}
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-amber-800">📋 Excel 粘贴格式说明</div>
                      <button onClick={copyTemplate} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white rounded-md border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">
                        {copied ? <><Check className="w-3 h-3" /> 已复制</> : <><Copy className="w-3 h-3" /> 复制示例数据</>}
                      </button>
                    </div>
                    <div className="text-xs text-amber-700 mb-2">
                      在 Excel 中整理好数据后，选中所有行 → Ctrl+C 复制 → 粘贴到下方输入框。<br />
                      每列用 <strong>Tab 键</strong> 分隔（Excel 复制时自动使用 Tab 分隔），每行一条笔记。
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-amber-100">
                            {excelColumns.map((col) => (
                              <th key={col} className="px-2 py-1.5 text-left border border-amber-200 font-medium text-amber-900">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="px-2 py-1 border border-amber-100 text-gray-600">泡奶机真实体验</td>
                            <td className="px-2 py-1 border border-amber-100 text-gray-600">用了三个月定量出水精准...</td>
                            <td className="px-2 py-1 border border-amber-100 text-gray-600">真实宝妈</td>
                            <td className="px-2 py-1 border border-amber-100 text-gray-600">356</td>
                            <td className="px-2 py-1 border border-amber-100 text-gray-600">189</td>
                            <td className="px-2 py-1 border border-amber-100 text-gray-600">45</td>
                            <td className="px-2 py-1 border border-amber-100 text-gray-600">求链接！|已下单|好用</td>
                            <td className="px-2 py-1 border border-amber-100 text-gray-600">review</td>
                            <td className="px-2 py-1 border border-amber-100 text-gray-600">BOLOLO</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="text-xs text-amber-600 mt-2">
                      💡 类型可选：review(评测) / story(场景) / comparison(横评) / tip(避坑) / scenario(分享)<br />
                      💡 评论列用 <strong>|</strong> 竖线分隔多条评论
                    </div>
                  </div>

                  {/* Paste area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      从 Excel 复制数据粘贴到此处
                    </label>
                    <textarea
                      className="w-full px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-solid h-48 resize-none font-mono text-xs"
                      placeholder="从 Excel 选中数据行 → Ctrl+C → 在此处 Ctrl+V 粘贴"
                      value={excelInput}
                      onChange={(e) => setExcelInput(e.target.value)}
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {excelInput.trim()
                        ? `已识别 ${excelInput.split('\n').filter((l) => l.trim() && l.includes('\t')).length} 条笔记数据`
                        : '支持带表头或不带表头粘贴（自动跳过表头行）'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-6 border-t border-gray-100">
                  <div className="text-xs text-gray-400">Excel 数据将批量调用 AI 分析</div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowImportModal(false)} className="btn-secondary">取消</button>
                    <button onClick={handleExcelImport} disabled={analyzing || !excelInput.trim()} className="btn-primary flex items-center gap-2">
                      {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> {analyzeProgress}</> : <><Upload className="w-4 h-4" /> 批量分析</>}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== CLEAR CONFIRMATION ==================== */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full mx-4 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">清空笔记数据</h3>
                <p className="text-xs text-gray-500">当前共有 {notes.length} 篇笔记</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">确定要清空所有笔记吗？此操作不可撤销。<br />你也可以选择"重置"恢复为预置的 20 篇示例数据。</p>
            <div className="flex flex-col gap-2">
              <button onClick={clearAllNotes} className="w-full py-2.5 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors">
                全部清空（保留空看板）
              </button>
              <button onClick={resetToDefault} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
                重置为示例数据（20篇）
              </button>
              <button onClick={() => setShowClearConfirm(false)} className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-8">
        KOC 投流价值 AI 评估引擎 · Demo v1.1 · Built with DeepSeek API
      </footer>
    </div>
  )
}
