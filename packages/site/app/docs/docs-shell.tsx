'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { generatedDocsByLocale, type GeneratedLocale } from '../generated-docs'

const githubUrl = 'https://github.com/uicheck/uicheck'
const locales = ['zh-CN', 'en'] as const satisfies GeneratedLocale[]

function getLocale(pathname: string): GeneratedLocale {
  return pathname.startsWith('/docs/en') ? 'en' : 'zh-CN'
}

function getDocId(pathname: string): string {
  const [, , , docId] = pathname.split('/')
  return docId ?? ''
}

function getLocaleHref(pathname: string, nextLocale: GeneratedLocale) {
  const docId = getDocId(pathname)
  return docId ? `/docs/${nextLocale}/${docId}/` : `/docs/${nextLocale}/`
}

export function DocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const locale = getLocale(pathname)
  const docs = generatedDocsByLocale[locale]
  const docId = getDocId(pathname)

  return (
    <div className="docs-framework-shell">
      <nav className="nav docs-framework-nav" aria-label="Documentation">
        <Link className="brand" href="/">
          <span className="brand-mark">UI</span>
          <span>UI Check</span>
        </Link>
        <div className="nav-actions">
          <div className="nav-links">
            <Link href="/">Home</Link>
            <a href={githubUrl} rel="noreferrer" target="_blank">
              GitHub
            </a>
          </div>
          <div className="locale-switcher docs-locale-switcher" aria-label="Documentation language">
            {locales.map((item) => (
              <Link className={item === locale ? 'active' : ''} href={getLocaleHref(pathname, item)} key={item}>
                {item === 'zh-CN' ? '中' : 'EN'}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="docs-framework-layout">
        <aside className="docs-framework-sidebar">
          <Link className={!docId ? 'active' : ''} href={`/docs/${locale}/`}>
            <span>{locale === 'zh-CN' ? '开始' : 'Start'}</span>
            <small>{locale === 'zh-CN' ? '选择包文档' : 'Choose a package'}</small>
          </Link>
          {docs.map((doc) => (
            <Link className={doc.id === docId ? 'active' : ''} href={`/docs/${locale}/${doc.id}/`} key={doc.id}>
              <span>{doc.name}</span>
              <small>{doc.description}</small>
            </Link>
          ))}
        </aside>

        <article className="docs-framework-content">{children}</article>
      </div>
    </div>
  )
}
