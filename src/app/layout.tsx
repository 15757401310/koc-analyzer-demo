import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KOC投流价值AI评估引擎 | BOLOLO',
  description: 'AI驱动的KOC笔记投流价值评估与策略推荐系统',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
