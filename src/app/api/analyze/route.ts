import { NextRequest, NextResponse } from 'next/server'
import { analyzeNote } from '@/lib/deepseek'
import { KocNote } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Build note from request
    const note: KocNote = {
      id: body.id || `custom-${Date.now()}`,
      title: body.title || '',
      content: body.content || '',
      author: body.author || '未知作者',
      url: body.url || undefined,
      likes: body.likes || 0,
      comments: body.comments || [],
      collects: body.collects || 0,
      shares: body.shares || 0,
      coverType: body.coverType || 'review',
      brandMentioned: body.brandMentioned || body.brand || '未提及',
    }

    if (!note.title || !note.content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      )
    }

    const analysis = await analyzeNote(note)

    return NextResponse.json({
      ...note,
      analysis,
      analyzedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: error.message || '分析失败，请稍后重试' },
      { status: 500 }
    )
  }
}
