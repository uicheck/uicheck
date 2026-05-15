import Link from 'next/link'
import type { ReactNode } from 'react'
import { generatedDocsByLocale } from '../generated-docs'

const githubUrl = 'https://github.com/uicheck/uicheck'

export default function DocsLayout({ children }: { children: ReactNode }) {
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
        </div>
      </nav>

      <div className="docs-framework-layout">
        <aside className="docs-framework-sidebar">
          {Object.entries(generatedDocsByLocale).map(([locale, docs]) => (
            <div className="docs-framework-group" key={locale}>
              <Link className="docs-framework-locale" href={`/docs/${locale}/`}>
                {locale === 'zh-CN' ? '中文' : 'English'}
              </Link>
              {docs.map((doc) => (
                <Link href={`/docs/${locale}/${doc.id}/`} key={`${locale}-${doc.id}`}>
                  <span>{doc.name}</span>
                  <small>{doc.description}</small>
                </Link>
              ))}
            </div>
          ))}
        </aside>

        <article className="docs-framework-content">{children}</article>
      </div>
    </div>
  )
}
