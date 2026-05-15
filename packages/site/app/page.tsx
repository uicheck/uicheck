'use client'

import { useEffect, useMemo, useState } from 'react'
import { generatedDocsByLocale, type GeneratedDocBlock, type GeneratedLocale } from './generated-docs'

const locales = ['zh-CN', 'en'] as const satisfies GeneratedLocale[]
type Locale = (typeof locales)[number]

const dictionaries = {
  'zh-CN': {
    htmlLang: 'zh-CN',
    nav: {
      workflow: '工作流',
      tools: 'MCP Tools',
      docs: '文档',
      install: '接入'
    },
    languageLabel: '语言',
    hero: {
      eyebrow: '@uicheck/mcp + @uicheck/web',
      title: '让 AI 看懂真实浏览器页面',
      lead: 'UI Check 把页面截图、DOM 元素、布局盒、间距和坐标暴露给 AI。AI 可以通过 MCP 查询页面，也可以接收人工标注后的图片证据，再回到代码里修复 UI。',
      primary: '开始接入',
      secondary: '查看工具',
      previewLabel: 'UI Check 产品预览'
    },
    workflow: {
      eyebrow: 'Workflow',
      title: '两条输入，一次修复',
      text: '结构化布局信息适合机器判断，带标注截图适合视觉确认。两者一起给 AI，UI 修复会少很多盲猜。',
      steps: [
        ['1', '页面接入 @uicheck/web', '注入悬浮球和 WebSocket 客户端，连接本机 @uicheck/mcp。'],
        ['2', 'AI 调用 MCP 工具', '查询页面截图、元素布局、可见文本、坐标和样式信息。'],
        ['3', '人工可补充标注', '手动选择元素后生成带编号和连线的图片到剪切板。'],
        ['4', '把证据交给 AI 修复', 'AI 同时拿到结构化 DOM 和视觉截图，减少猜测。']
      ]
    },
    tools: {
      eyebrow: 'MCP Tools',
      title: 'AI 可以直接调用的页面观察能力',
      text: '@uicheck/mcp 是本地 MCP 服务，浏览器页面通过 WebSocket 接入后，AI 就能向页面发请求。',
      items: [
        ['list_clients', '查看已连接的浏览器页面、标题、URL、视口和在线状态。'],
        ['capture_page', '让页面返回 PNG 截图，AI 可以直接看当前 UI。'],
        ['inspect_elements', '读取选择器、文本、布局盒、间距、颜色等结构化信息。'],
        ['get_element_at_point', '按坐标定位元素，并返回祖先链，适合修复错位和遮挡。']
      ]
    },
    markup: {
      eyebrow: 'Manual Markup',
      title: '人工选择元素，生成标注图到剪切板',
      text: '当 AI 需要更明确的视觉上下文时，开发者可以用悬浮球进入标注模式，选择页面元素并复制带编号、边框、布局信息的图片。',
      useCases: [
        '定位按钮、弹窗、表格、表单等元素的真实位置',
        '排查间距、遮挡、溢出、响应式错位',
        '把页面视觉证据直接喂给 AI，让它改代码更准',
        '在本地开发页面中快速标注问题区域'
      ]
    },
    docs: {
      eyebrow: 'Generated Docs',
      title: '从包 README 自动生成的文档',
      text: '官网构建前会读取 workspace 包的 package.json 和对应语言 README，同步生成文档数据，避免官网内容和包文档分叉。'
    },
    install: {
      eyebrow: 'Install',
      title: '本地服务 + 页面脚本',
      text: '一个端口跑 MCP，一个 WebSocket 连接页面。页面可以通过 npm 包接入，也可以用本地 CDN 脚本接入。',
      mcpTitle: '启动 @uicheck/mcp',
      webTitle: '页面接入 @uicheck/web'
    }
  },
  en: {
    htmlLang: 'en',
    nav: {
      workflow: 'Workflow',
      tools: 'MCP Tools',
      docs: 'Docs',
      install: 'Install'
    },
    languageLabel: 'Language',
    hero: {
      eyebrow: '@uicheck/mcp + @uicheck/web',
      title: 'Help AI understand real browser pages',
      lead: 'UI Check exposes screenshots, DOM elements, layout boxes, spacing, and coordinates to AI. Agents can query the live page through MCP or use manually annotated visual evidence before fixing UI code.',
      primary: 'Get started',
      secondary: 'View tools',
      previewLabel: 'UI Check product preview'
    },
    workflow: {
      eyebrow: 'Workflow',
      title: 'Two evidence streams, one UI fix',
      text: 'Structured layout data is machine-friendly, while annotated screenshots make visual issues obvious. Together they reduce guesswork in AI-assisted UI fixes.',
      steps: [
        ['1', 'Install @uicheck/web', 'Inject the floating checker and WebSocket client, then connect it to local @uicheck/mcp.'],
        ['2', 'Let AI call MCP tools', 'Query screenshots, element layout, visible text, coordinates, and style details.'],
        ['3', 'Add manual markup when useful', 'Select elements manually and copy a numbered annotation image to the clipboard.'],
        ['4', 'Send evidence back to code', 'Give AI both structured DOM data and visual proof so fixes are grounded in the real UI.']
      ]
    },
    tools: {
      eyebrow: 'MCP Tools',
      title: 'Page inspection tools AI can call directly',
      text: '@uicheck/mcp runs locally. Once a client connects over WebSocket, AI can request observations from the page.',
      items: [
        ['list_clients', 'List connected pages with title, URL, viewport, and online status.'],
        ['capture_page', 'Ask the page for a PNG screenshot so AI can inspect the current UI.'],
        ['inspect_elements', 'Read selectors, text, layout boxes, spacing, colors, and other structured details.'],
        ['get_element_at_point', 'Locate the element at viewport coordinates and return its ancestor chain.']
      ]
    },
    markup: {
      eyebrow: 'Manual Markup',
      title: 'Select elements and copy annotated screenshots',
      text: 'When AI needs clearer visual context, developers can open markup mode from the floating checker, select page elements, and copy a numbered layout image.',
      useCases: [
        'Find the real position of buttons, modals, tables, and forms',
        'Debug spacing, overlap, overflow, and responsive layout issues',
        'Feed visual evidence directly to AI so code changes are more precise',
        'Quickly annotate problem areas in local development pages'
      ]
    },
    docs: {
      eyebrow: 'Generated Docs',
      title: 'Documentation generated from package READMEs',
      text: 'Before the website builds, it reads workspace package.json files and localized READMEs to keep the website docs aligned with package docs.'
    },
    install: {
      eyebrow: 'Install',
      title: 'Local service + page client',
      text: 'Run MCP on one port and connect the page over WebSocket. Use the npm package or the local CDN script.',
      mcpTitle: 'Start @uicheck/mcp',
      webTitle: 'Install @uicheck/web'
    }
  }
} satisfies Record<Locale, Record<string, unknown>>

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-CN'
  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (fromUrl === 'en' || fromUrl === 'zh-CN') return fromUrl
  const stored = window.localStorage.getItem('uicheck-locale')
  if (stored === 'en' || stored === 'zh-CN') return stored
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

function renderDocBlock(block: GeneratedDocBlock, index: number) {
  if (block.type === 'heading') {
    const HeadingTag = block.level >= 3 ? 'h5' : 'h4'
    return <HeadingTag key={index}>{block.text}</HeadingTag>
  }

  if (block.type === 'paragraph') return <p key={index}>{block.text}</p>
  if (block.type === 'code') return <pre key={index}>{block.code}</pre>

  if (block.type === 'list') {
    return (
      <ul key={index}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }

  return (
    <div className="doc-table-wrap" key={index}>
      <table>
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)
  const t = dictionaries[locale]
  const docs = generatedDocsByLocale[locale]

  useEffect(() => {
    document.documentElement.lang = dictionaries[locale].htmlLang
  }, [locale])

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale)
    window.localStorage.setItem('uicheck-locale', nextLocale)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', nextLocale)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  const mcpCode = useMemo(
    () => `npm install -g @uicheck/mcp
uicheck-mcp

# MCP    http://127.0.0.1:17322/mcp
# Socket ws://127.0.0.1:17322/socket`,
    []
  )
  const webCode = useMemo(
    () => `npm install @uicheck/web html2canvas

import html2canvas from 'html2canvas'
import { installUiCheck } from '@uicheck/web'

installUiCheck(html2canvas, {
  position: 'bottom-left',
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})`,
    []
  )

  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="Primary">
          <a className="brand" href="#top" aria-label="UI Check home">
            <span className="brand-mark">UI</span>
            <span>UI Check</span>
          </a>
          <div className="nav-actions">
            <div className="nav-links">
              <a href="#workflow">{t.nav.workflow}</a>
              <a href="#tools">{t.nav.tools}</a>
              <a href="#docs">{t.nav.docs}</a>
              <a href="#install">{t.nav.install}</a>
            </div>
            <div className="locale-switcher" aria-label={t.languageLabel}>
              {locales.map((item) => (
                <button className={item === locale ? 'active' : ''} key={item} type="button" onClick={() => changeLocale(item)}>
                  {item === 'zh-CN' ? '中' : 'EN'}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="hero-inner" id="top">
          <div className="hero-copy">
            <p className="eyebrow">{t.hero.eyebrow}</p>
            <h1>{t.hero.title}</h1>
            <p className="lead">{t.hero.lead}</p>
            <div className="hero-actions">
              <a className="button primary" href="#install">
                {t.hero.primary}
              </a>
              <a className="button secondary" href="#tools">
                {t.hero.secondary}
              </a>
            </div>
          </div>

          <div className="inspector" aria-label={t.hero.previewLabel}>
            <div className="browser">
              <div className="browser-bar">
                <span />
                <span />
                <span />
                <code>localhost:3000/dashboard</code>
              </div>
              <div className="mock-page">
                <div className="mock-sidebar">
                  <b>Studio</b>
                  <span />
                  <span />
                  <span />
                </div>
                <div className="mock-content">
                  <div className="mock-header">
                    <span />
                    <button>Publish</button>
                  </div>
                  <div className="mock-grid">
                    <article className="target target-one">
                      <span className="pin">1</span>
                      <strong>Revenue</strong>
                      <em>+18.2%</em>
                    </article>
                    <article className="target target-two">
                      <span className="pin">2</span>
                      <strong>Conversion</strong>
                      <em>3.74%</em>
                    </article>
                    <article>
                      <strong>Latency</strong>
                      <em>126ms</em>
                    </article>
                  </div>
                  <div className="mock-table">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
              <div className="floatball">⌕</div>
              <div className="annotation one">#1 margin 24 / padding 18</div>
              <div className="annotation two">#2 selector .metric-card:nth-of-type(2)</div>
            </div>

            <div className="agent-panel">
              <div>
                <span className="status-dot" />
                <span>AI Agent</span>
              </div>
              <pre>{`inspect_elements({
  selector: ".mock-grid",
  limit: 20
})

capture_page({ waitMs: 300 })`}</pre>
            </div>
          </div>
        </div>
      </section>

      <section className="section strip" id="workflow">
        <div className="section-head">
          <p className="eyebrow">{t.workflow.eyebrow}</p>
          <h2>{t.workflow.title}</h2>
          <p>{t.workflow.text}</p>
        </div>
        <div className="timeline">
          {t.workflow.steps.map(([number, title, text]) => (
            <div className="step" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section split" id="tools">
        <div className="section-head align-left">
          <p className="eyebrow">{t.tools.eyebrow}</p>
          <h2>{t.tools.title}</h2>
          <p>{t.tools.text}</p>
        </div>
        <div className="tool-list">
          {t.tools.items.map(([name, description]) => (
            <article className="tool-card" key={name}>
              <code>{name}</code>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section visual-band">
        <div className="clipboard-preview">
          <div className="canvas-shot">
            <div className="shot-top" />
            <div className="shot-body">
              <span className="box a">1</span>
              <span className="box b">2</span>
              <span className="box c">3</span>
            </div>
          </div>
          <div className="clipboard-copy">
            <p className="eyebrow">{t.markup.eyebrow}</p>
            <h2>{t.markup.title}</h2>
            <p>{t.markup.text}</p>
            <ul>
              {t.markup.useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section docs" id="docs">
        <div className="section-head">
          <p className="eyebrow">{t.docs.eyebrow}</p>
          <h2>{t.docs.title}</h2>
          <p>{t.docs.text}</p>
        </div>
        <div className="docs-grid">
          {docs.map((doc) => (
            <article className="doc-card" key={doc.id}>
              <div className="doc-card-head">
                <div>
                  <h3>{doc.name}</h3>
                  <p>{doc.description}</p>
                </div>
                <span>{doc.version}</span>
              </div>
              <pre className="install-command">{doc.install}</pre>
              <div className="doc-source">{doc.source}</div>
              <div className="doc-body">{doc.blocks.map(renderDocBlock)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="section install" id="install">
        <div className="section-head">
          <p className="eyebrow">{t.install.eyebrow}</p>
          <h2>{t.install.title}</h2>
          <p>{t.install.text}</p>
        </div>
        <div className="code-grid">
          <div className="code-block">
            <div className="code-title">{t.install.mcpTitle}</div>
            <pre>{mcpCode}</pre>
          </div>
          <div className="code-block">
            <div className="code-title">{t.install.webTitle}</div>
            <pre>{webCode}</pre>
          </div>
        </div>
      </section>
    </main>
  )
}
