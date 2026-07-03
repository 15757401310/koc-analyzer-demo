// Fetch Xiaohongshu note metadata via CORS proxy
// Note: XHS pages are client-rendered, only SEO metadata is accessible.
// Full content requires 蒲公英API (enterprise) or headless browser (server-side).
// Free CORS proxies are unreliable — success depends on proxy uptime and XHS anti-bot.

const CORS_PROXIES = [
  { url: 'https://corsproxy.io/?', type: 'prefix' },
  { url: 'https://api.allorigins.win/raw?url=', type: 'prefix' },
]

interface FetchedNote {
  title: string
  content: string
  author: string
  imageUrl: string
  success: boolean
  error?: string
}

async function tryFetch(url: string, proxyIndex: number = 0): Promise<string | null> {
  if (proxyIndex >= CORS_PROXIES.length) return null
  try {
    const response = await fetch(CORS_PROXIES[proxyIndex] + encodeURIComponent(url), {
      signal: AbortSignal.timeout(8000),
    })
    if (response.ok) return await response.text()
  } catch {}
  return tryFetch(url, proxyIndex + 1)
}

function extractMeta(html: string, property: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return m[1]
  }
  return ''
}

function extractTitle(html: string): string {
  // og:title is usually the note title on XHS
  const og = extractMeta(html, 'og:title')
  if (og) return og
  // Fallback to <title> tag
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1].trim() : ''
}

async function fetchNoteMetadata(url: string): Promise<FetchedNote> {
  const html = await tryFetch(url)
  if (!html) return { title: '', content: '', author: '', imageUrl: '', success: false, error: '网络请求失败，请检查链接是否正确或稍后重试' }

  const title = extractTitle(html)
  const description = extractMeta(html, 'og:description') || extractMeta(html, 'description')
  const imageUrl = extractMeta(html, 'og:image')

  if (!title) return { title: '', content: '', author: '', imageUrl: '', success: false, error: '未能解析到笔记内容（页面可能需要登录或链接已失效）' }

  return {
    title: title.replace(/[|｜-]\s*小红书.*$/, '').trim(), // Clean up " - 小红书" suffix
    content: description || '[注：仅获取到摘要，完整正文请手动补充]',
    author: '',
    imageUrl,
    success: true,
  }
}

export async function fetchNotesFromUrls(urls: string[]): Promise<FetchedNote[]> {
  const results: FetchedNote[] = []
  for (const url of urls) {
    const trimmed = url.trim()
    if (!trimmed) continue
    try {
      const note = await fetchNoteMetadata(trimmed)
      results.push(note)
    } catch {
      results.push({ title: '', content: '', author: '', imageUrl: '', success: false, error: '解析异常' })
    }
  }
  return results
}

export type { FetchedNote }
