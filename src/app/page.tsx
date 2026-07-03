'use client'

import { useState, useMemo, useRef } from 'react'
import { preAnalyzedNotes } from '@/lib/mock-data'
import { AnalyzedNote, STRATEGY_LABELS, STRATEGY_COLORS, COVER_TYPE_LABELS } from '@/lib/types'
import { analyzeNoteClient } from '@/lib/deepseek-client'
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
  PanelRightOpen,
  PanelRightClose,
  GitBranch,
  Gauge,
  ListChecks,
  ArrowRight,
  CircleDot,
  Lightbulb,
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
  const [showStrategy, setShowStrategy] = useState(true)
  const [showScoringRules, setShowScoringRules] = useState(false)

  const strategyStats = useMemo(() => {
    const aq = notes.filter((n) => n.analysis.strategy === 'acquisition')
    const rt = notes.filter((n) => n.analysis.strategy === 'retention')
    const both = notes.filter((n) => n.analysis.strategy === 'both')
    const nr = notes.filter((n) => n.analysis.strategy === 'not_recommended')
    const high = notes.filter((n) => n.analysis.score >= 80)
    const mid = notes.filter((n) => n.analysis.score >= 60 && n.analysis.score < 80)
    const low = notes.filter((n) => n.analysis.score >= 40 && n.analysis.score < 60)
    const bad = notes.filter((n) => n.analysis.score < 40)
    return { aq: aq.length, rt: rt.length, both: both.length, nr: nr.length, high: high.length, mid: mid.length, low: low.length, bad: bad.length }
  }, [notes])

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
      const note = { id: `manual-${Date.now()}`, title: newNote.title, content: newNote.content, author: newNote.author, likes: newNote.likes, collects: newNote.collects, shares: newNote.shares, comments, coverType: newNote.coverType as any, brandMentioned: newNote.brand }
      const analysis = await analyzeNoteClient(note)
      const analyzed = { ...note, analysis, analyzedAt: new Date().toISOString() }
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

    // Demo: extract note ID from URL. Production would use 蒲公英API to fetch real note data.
    const parsedNotes = urls.map((url, i) => {
      const urlObj = url.trim()
      // Support explore/, search_result/, discovery/item/ URL formats
      const noteIdMatch = urlObj.match(/(?:explore|search_result|discovery\/item)\/([a-f0-9]+)/)
      const noteId = noteIdMatch ? noteIdMatch[1].slice(0, 8) : `note-${i}`
      return {
        id: `url-${noteId}-${Date.now()}`,
        title: `小红书笔记 ${noteId}`,
        content: `[Demo模式] 该笔记内容需手动补充。\n链接: ${urlObj}\n\n说明：静态网页无法抓取小红书内容（浏览器跨域限制）。接入蒲公英 API 后可自动获取笔记标题、正文、互动数据。`,
        author: '待补充',
        likes: 0,
        collects: 0,
        shares: 0,
        comments: [] as { content: string; likes: number }[],
        coverType: 'review' as const,
        brandMentioned: '未提及',
        url: urlObj,
      }
    })

    // Analyze each note
    const results: AnalyzedNote[] = []
    for (let i = 0; i < parsedNotes.length; i++) {
      setAnalyzeProgress(`正在分析第 ${i + 1}/${parsedNotes.length} 篇笔记...`)
      try {
        const analysis = await analyzeNoteClient(parsedNotes[i])
        results.push({ ...parsedNotes[i], analysis, analyzedAt: new Date().toISOString() })
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
        brandMentioned: brand?.trim() || '未提及',
      })
    }

    if (parsedNotes.length === 0) { setAnalyzing(false); alert('未解析到有效数据，请检查格式'); return }

    const results: AnalyzedNote[] = []
    for (let i = 0; i < parsedNotes.length; i++) {
      setAnalyzeProgress(`正在分析第 ${i + 1}/${parsedNotes.length} 篇笔记...`)
      try {
        const analysis = await analyzeNoteClient(parsedNotes[i])
        results.push({ ...parsedNotes[i], analysis, analyzedAt: new Date().toISOString() })
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

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className={`flex gap-6 ${showStrategy ? '' : ''}`}>
        {/* Left content area */}
        <div className="flex-1 min-w-0">
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

        {/* Filters + Strategy toggle */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={() => setShowStrategy(!showStrategy)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
              showStrategy ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            title={showStrategy ? '收起策略面板' : '展开策略面板'}
          >
            {showStrategy ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            投流策略{showStrategy ? '' : ''}
          </button>
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
        <div className={`grid grid-cols-1 md:grid-cols-2 ${showStrategy ? 'xl:grid-cols-2' : 'lg:grid-cols-3'} gap-4`}>
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
        </div>{/* end left content */}

        {/* ==================== STRATEGY SIDEBAR ==================== */}
        {showStrategy && (
          <aside className="w-80 shrink-0 hidden xl:block">
            <div className="space-y-4">

              {/* Section 1: AI决策流程 */}
              <div className="card p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
                  <GitBranch className="w-4 h-4 text-blue-600" /> AI 投流决策流程
                </div>
                <div className="space-y-0">
                  {[
                    { icon: Upload, label: '内容导入', desc: 'KOC笔记数据汇聚', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                    { icon: Search, label: '多维评估', desc: '内容质量 · 评论意向 · 关键词覆盖 · 品牌匹配', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                    { icon: Target, label: '策略分类', desc: '拉新 / 收割 / 两者皆可 / 不推荐', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                    { icon: Zap, label: '预算建议', desc: '基于评分自动匹配日预算区间', color: 'bg-green-50 border-green-200 text-green-700' },
                  ].map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${step.color}`}>
                          <step.icon className="w-4 h-4" />
                        </div>
                        {i < 3 && <div className="w-0.5 h-5 bg-gray-200 my-1" />}
                      </div>
                      <div className="pb-3">
                        <div className="text-sm font-medium text-gray-800">{step.label}</div>
                        <div className="text-xs text-gray-500">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: 策略分类标准 */}
              <div className="card p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                  <ListChecks className="w-4 h-4 text-blue-600" /> 策略分类标准
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { strategy: 'acquisition', icon: '🎯', label: '拉新', desc: '对新用户吸引力\n> 70 分', color: 'border-blue-300 bg-blue-50' },
                    { strategy: 'retention', icon: '🔄', label: '收割', desc: '对老用户转化力\n> 70 分', color: 'border-amber-300 bg-amber-50' },
                    { strategy: 'both', icon: '🔀', label: '拉新+收割', desc: '两者都\n> 60 分', color: 'border-green-300 bg-green-50' },
                    { strategy: 'not_recommended', icon: '⛔', label: '不推荐', desc: '评分 < 40\n或有负面信号', color: 'border-gray-300 bg-gray-50' },
                  ].map((s) => (
                    <div key={s.strategy} className={`p-2.5 rounded-lg border ${s.color} text-center`}>
                      <div className="text-lg">{s.icon}</div>
                      <div className="text-xs font-bold text-gray-800 mt-0.5">{s.label}</div>
                      <div className="text-xs text-gray-500 whitespace-pre-line leading-tight mt-0.5">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: 预算分配模型 */}
              <div className="card p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                  <Gauge className="w-4 h-4 text-blue-600" /> 预算分配模型
                </div>
                <div className="space-y-2">
                  {[
                    { range: '80-100 分', budget: '¥300-500/天', label: '主力投流', color: 'bg-green-100 border-green-300', dot: 'bg-green-500', width: 'w-full' },
                    { range: '60-79 分', budget: '¥150-300/天', label: '常规投流', color: 'bg-amber-100 border-amber-300', dot: 'bg-amber-500', width: 'w-3/4' },
                    { range: '40-59 分', budget: '¥50-150/天', label: '小预算测试', color: 'bg-orange-100 border-orange-300', dot: 'bg-orange-500', width: 'w-2/4' },
                    { range: '< 40 分', budget: '¥0', label: '不投流', color: 'bg-gray-100 border-gray-300', dot: 'bg-gray-400', width: 'w-1/4' },
                  ].map((tier) => (
                    <div key={tier.range} className={`flex items-center gap-3 p-2.5 rounded-lg border ${tier.color}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${tier.dot} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800">{tier.range}</span>
                          <span className="text-xs font-bold text-gray-800">{tier.budget}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${tier.dot} rounded-full ${tier.width}`} />
                          </div>
                          <span className="text-xs text-gray-500">{tier.label}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-1.5 mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    评分 <strong>80+</strong> 的笔记应占投流总预算的 <strong>60%以上</strong>，优先保头部内容放量。
                  </p>
                </div>
              </div>

              {/* Section 4: 当前数据实时概览 */}
              <div className="card p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> 当前看板数据分布
                </div>
                {/* Strategy distribution */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-2">策略分布</div>
                  <div className="flex h-3 rounded-full overflow-hidden">
                    {strategyStats.aq > 0 && <div className="bg-blue-400" style={{ width: `${(strategyStats.aq / notes.length) * 100}%` }} title={`拉新 ${strategyStats.aq}篇`} />}
                    {strategyStats.rt > 0 && <div className="bg-amber-400" style={{ width: `${(strategyStats.rt / notes.length) * 100}%` }} title={`收割 ${strategyStats.rt}篇`} />}
                    {strategyStats.both > 0 && <div className="bg-green-400" style={{ width: `${(strategyStats.both / notes.length) * 100}%` }} title={`拉新+收割 ${strategyStats.both}篇`} />}
                    {strategyStats.nr > 0 && <div className="bg-gray-300" style={{ width: `${(strategyStats.nr / notes.length) * 100}%` }} title={`不推荐 ${strategyStats.nr}篇`} />}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> 拉新 {strategyStats.aq}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 收割 {strategyStats.rt}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> 双策略 {strategyStats.both}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> 不推荐 {strategyStats.nr}</span>
                  </div>
                </div>
                {/* Score distribution */}
                <div>
                  <div className="text-xs text-gray-500 mb-2">评分分布</div>
                  <div className="space-y-1">
                    {[
                      { label: '80+', count: strategyStats.high, color: 'bg-green-500' },
                      { label: '60-79', count: strategyStats.mid, color: 'bg-amber-500' },
                      { label: '40-59', count: strategyStats.low, color: 'bg-orange-500' },
                      { label: '<40', count: strategyStats.bad, color: 'bg-red-500' },
                    ].map((b) => (
                      <div key={b.label} className="flex items-center gap-2 text-xs">
                        <span className="w-8 text-right text-gray-500">{b.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${b.color} rounded-full`} style={{ width: `${notes.length > 0 ? (b.count / notes.length) * 100 : 0}%` }} />
                        </div>
                        <span className="w-6 text-gray-700 font-medium">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 5: 评分规则详解 */}
              <div className="card p-4">
                <button
                  onClick={() => setShowScoringRules(!showScoringRules)}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-blue-600" /> 评分规则详解
                  </div>
                  <span className={`text-xs text-gray-400 transition-transform ${showScoringRules ? 'rotate-90' : ''}`}>▶</span>
                </button>
                {showScoringRules && (
                  <div className="mt-3 space-y-3 text-xs">
                    {/* Dimension 1 */}
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-red-800">💬 评论购买意向</span>
                        <span className="text-red-500 font-bold">~30%</span>
                      </div>
                      <div className="text-red-700 leading-relaxed">
                        逐条分析评论内容。高意向信号（"求链接""多少钱""已下单"）→ 大幅加分；噪音信号（"博主好美""拍的什么滤镜""宝宝好可爱"）→ 扣分，说明内容种草力弱。
                      </div>
                    </div>

                    {/* Dimension 2 */}
                    <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-orange-800">📝 内容种草力</span>
                        <span className="text-orange-500 font-bold">~20%</span>
                      </div>
                      <div className="text-orange-700 leading-relaxed">
                        痛点是否精准（"以前要兑水温摸黑找工具"）、体验是否具体（温差&lt;1℃/静音&lt;60db）、是否有信任建设（"用了三个月才来评""退了两台才找到它"）。
                      </div>
                    </div>

                    {/* Dimension 3 */}
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-amber-800">🏷️ 品牌关联度</span>
                        <span className="text-amber-500 font-bold">~15%</span>
                      </div>
                      <div className="text-amber-700 leading-relaxed">
                        推荐 BOLOLO → 直接加分；推荐竞品但评论区有人问 BOLOLO → 截流加分；闲置转让/退货/投诉 → <strong>一票否决</strong>，评分压在 40 以下。
                      </div>
                    </div>

                    {/* Dimension 4 */}
                    <div className="p-2.5 rounded-lg bg-yellow-50 border border-yellow-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-yellow-800">📊 互动结构</span>
                        <span className="text-yellow-500 font-bold">~12%</span>
                      </div>
                      <div className="text-yellow-700 leading-relaxed">
                        不只看绝对值。收藏/点赞比 &gt; 0.5（用户存下来做决策）→ 加分；万赞零评 → 疑似刷量；评论全是打卡表情 → 无效互动。
                      </div>
                    </div>

                    {/* Dimension 5 */}
                    <div className="p-2.5 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-green-800">🔑 关键词覆盖</span>
                        <span className="text-green-500 font-bold">~10%</span>
                      </div>
                      <div className="text-green-700 leading-relaxed">
                        高价值词（"怎么选""推荐""测评""对比"）→ 覆盖决策期搜索流量；低价值词（单一品牌词）→ 仅触达已知品牌用户。覆盖越丰富，投流可定向流量越大。
                      </div>
                    </div>

                    {/* Dimension 6 */}
                    <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-teal-800">🎯 策略匹配度</span>
                        <span className="text-teal-500 font-bold">~8%</span>
                      </div>
                      <div className="text-teal-700 leading-relaxed">
                        避坑攻略 → 拉新+收割（收藏率极高）；横评对比 → 拉新（覆盖决策期用户）；促销内容 → 仅收割（无拉新价值）；闲置转让 → 直接不推荐。
                      </div>
                    </div>

                    {/* Dimension 7 */}
                    <div className="p-2.5 rounded-lg bg-gray-100 border border-gray-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-gray-700">⚠️ 负面信号</span>
                        <span className="text-gray-500 font-bold">扣分项</span>
                      </div>
                      <div className="text-gray-600 leading-relaxed">
                        二手转让、退货经历、质量投诉、竞品明显优于 BOLOLO 且结论一边倒 → 不论其他维度多好，直接压在 40 分以下。
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="text-blue-800 leading-relaxed">
                        <strong>🤖 AI 综合判断</strong><br />
                        7 个维度<span className="text-blue-600 font-bold"> 不是简单加权求和</span>——DeepSeek AI 模拟资深投手的判断逻辑，理解"评论都在夸博主好看≠种草成功"这类隐晦信号。<br />
                        <span className="text-blue-500 text-xs mt-1 block">temperature: 0.3 · 同一笔记多次分析结果一致</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </aside>
        )}
        </div>{/* end flex row */}
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
                    <div>
                      粘贴小红书笔记链接，每行一条。系统将提取笔记 ID 并调用 AI 分析投流价值。<br />
                      <span className="text-blue-500">Demo 模式：因静态网页无法爬取小红书（跨域限制），笔记标题和内容需手动补充。接入蒲公英 API 后可自动获取。</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">小红书笔记链接</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 resize-none font-mono text-xs"
                      placeholder={`https://www.xiaohongshu.com/explore/69c34f0d0000000028008b46\nhttps://www.xiaohongshu.com/search_result/68e63b060000000007003e51\n每行一条链接`}
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <div className="text-xs text-gray-400 mt-1">每行一条链接，支持 explore / search_result / discovery 格式</div>
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
