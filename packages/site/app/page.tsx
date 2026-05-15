const tools = [
  ['list_clients', '查看已连接的浏览器页面、标题、URL、视口和在线状态。'],
  ['capture_page', '让页面返回 PNG 截图，AI 可以直接看当前 UI。'],
  ['inspect_elements', '读取选择器、文本、布局盒、间距、颜色等结构化信息。'],
  ['get_element_at_point', '按坐标定位元素，并返回祖先链，适合修复错位和遮挡。']
]

const steps = [
  ['1', '页面接入 @uicheck/web', '注入悬浮球和 WebSocket 客户端，连接本机 @uicheck/mcp。'],
  ['2', 'AI 调用 MCP 工具', '查询页面截图、元素布局、可见文本、坐标和样式信息。'],
  ['3', '人工可补充标注', '手动选择元素后生成带编号和连线的图片到剪切板。'],
  ['4', '把证据交给 AI 修复', 'AI 同时拿到结构化 DOM 和视觉截图，减少猜测。']
]

const useCases = [
  '定位按钮、弹窗、表格、表单等元素的真实位置',
  '排查间距、遮挡、溢出、响应式错位',
  '把页面视觉证据直接喂给 AI，让它改代码更准',
  '在本地开发页面中快速标注问题区域'
]

export default function Home() {
  return (
    <main>
      <section className="hero">
        <nav className="nav" aria-label="Primary">
          <a className="brand" href="#top" aria-label="UI Check home">
            <span className="brand-mark">UI</span>
            <span>UI Check</span>
          </a>
          <div className="nav-links">
            <a href="#workflow">工作流</a>
            <a href="#tools">MCP Tools</a>
            <a href="#install">接入</a>
          </div>
        </nav>

        <div className="hero-inner" id="top">
          <div className="hero-copy">
            <p className="eyebrow">@uicheck/mcp + @uicheck/web</p>
            <h1>让 AI 看懂真实浏览器页面</h1>
            <p className="lead">
              UI Check 把页面截图、DOM 元素、布局盒、间距和坐标暴露给 AI。AI 可以通过 MCP 查询页面，也可以接收人工标注后的图片证据，再回到代码里修复 UI。
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#install">
                开始接入
              </a>
              <a className="button secondary" href="#tools">
                查看工具
              </a>
            </div>
          </div>

          <div className="inspector" aria-label="UI Check product preview">
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
          <p className="eyebrow">Workflow</p>
          <h2>两条输入，一次修复</h2>
          <p>结构化布局信息适合机器判断，带标注截图适合视觉确认。两者一起给 AI，UI 修复会少很多盲猜。</p>
        </div>
        <div className="timeline">
          {steps.map(([number, title, text]) => (
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
          <p className="eyebrow">MCP Tools</p>
          <h2>AI 可以直接调用的页面观察能力</h2>
          <p>@uicheck/mcp 是本地 MCP 服务，浏览器页面通过 WebSocket 接入后，AI 就能向页面发请求。</p>
        </div>
        <div className="tool-list">
          {tools.map(([name, description]) => (
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
            <p className="eyebrow">Manual Markup</p>
            <h2>人工选择元素，生成标注图到剪切板</h2>
            <p>
              当 AI 需要更明确的视觉上下文时，开发者可以用悬浮球进入标注模式，选择页面元素并复制带编号、边框、布局信息的图片。
            </p>
            <ul>
              {useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section install" id="install">
        <div className="section-head">
          <p className="eyebrow">Install</p>
          <h2>本地服务 + 页面脚本</h2>
          <p>一个端口跑 MCP，一个 WebSocket 连接页面。页面可以通过 npm 包接入，也可以用本地 CDN 脚本接入。</p>
        </div>
        <div className="code-grid">
          <div className="code-block">
            <div className="code-title">启动 @uicheck/mcp</div>
            <pre>{`npm install -g @uicheck/mcp
uicheck-mcp

# MCP    http://127.0.0.1:17322/mcp
# Socket ws://127.0.0.1:17322/socket`}</pre>
          </div>
          <div className="code-block">
            <div className="code-title">页面接入 @uicheck/web</div>
            <pre>{`npm install @uicheck/web html2canvas

import html2canvas from 'html2canvas'
import { installUiCheck } from '@uicheck/web'

installUiCheck(html2canvas, {
  position: 'bottom-left',
  socket: {
    url: 'ws://127.0.0.1:17322/socket'
  }
})`}</pre>
          </div>
        </div>
      </section>
    </main>
  )
}
