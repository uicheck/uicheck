import html2canvas from '/vendor/html2canvas.esm.js'
import { renderUiCheckEvidence } from '../../packages/web/dist/evidence.js'
import { installUiCheck } from '../../packages/web/dist/index.js'

const params = new URLSearchParams(location.search)
const webElements = [
  { id: 'app', selector: 'main.checkout-app', tag: 'main', text: 'Order review', box: { x: 0, y: 0, width: 560, height: 360 }, meta: ['p: 22px'] },
  { id: 'header', selector: 'header.screen-header', tag: 'header', text: 'Checkout page', box: { x: 0, y: 0, width: 560, height: 62 }, meta: ['m: 0px'] },
  { id: 'title', selector: 'h1', tag: 'h1', text: 'Order review', box: { x: 22, y: 84, width: 152, height: 28 }, meta: ['font: 22px'] },
  { id: 'intro', selector: '.screen-body > p', tag: 'p', text: 'Rendered page captured by the Web demo app.', box: { x: 22, y: 120, width: 330, height: 22 }, meta: ['color: slate'] },
  { id: 'cards', selector: '.cards', tag: 'div', text: 'Cart Address Status', box: { x: 22, y: 164, width: 516, height: 78 }, meta: ['display: grid'] },
  { id: 'cart', selector: '.card:nth(1)', tag: 'div', text: 'Cart 3 items', box: { x: 22, y: 164, width: 160, height: 78 }, meta: ['p: 12px'] },
  { id: 'address', selector: '.card:nth(2)', tag: 'div', text: 'Address Ready', box: { x: 194, y: 164, width: 160, height: 78 }, meta: ['p: 12px'] },
  { id: 'status', selector: '.card:nth(3)', tag: 'div', text: 'Status Visible', box: { x: 366, y: 164, width: 160, height: 78 }, meta: ['p: 12px'] },
  { id: 'cart-bar', selector: '.card:nth(1) .bar', tag: 'div', box: { x: 34, y: 213, width: 136, height: 7 }, meta: ['radius: 999px'] },
  { id: 'address-bar', selector: '.card:nth(2) .bar', tag: 'div', box: { x: 206, y: 213, width: 136, height: 7 }, meta: ['radius: 999px'] },
  { id: 'status-bar', selector: '.card:nth(3) .bar', tag: 'div', box: { x: 378, y: 213, width: 136, height: 7 }, meta: ['radius: 999px'] },
  { id: 'actions', selector: '.actions', tag: 'div', text: 'Inspect Submit order', box: { x: 284, y: 288, width: 254, height: 48 }, meta: ['display: flex'] },
  { id: 'inspect', selector: 'button.secondary', tag: 'button', text: 'Inspect', box: { x: 284, y: 288, width: 92, height: 48 }, meta: ['visible: true'] },
  {
    id: 'submit',
    selector: '#submit',
    tag: 'button',
    text: 'Submit order',
    box: { x: 388, y: 288, width: 150, height: 48 },
    meta: ['testId: submit-button', 'visible: true'],
    selected: true
  },
  { id: 'platform', selector: '.screen-pill', tag: 'div', text: 'Web', box: { x: 482, y: 15, width: 56, height: 32 }, meta: ['role: badge'] },
  { id: 'route', selector: '.screen-route', tag: 'div', text: '/checkout', box: { x: 18, y: 38, width: 86, height: 14 }, meta: ['opacity: .78'] },
  { id: 'card-title', selector: '.card strong', tag: 'strong', text: 'Cart', box: { x: 34, y: 177, width: 36, height: 18 }, meta: ['font-weight: 700'] },
  { id: 'card-meta', selector: '.card span', tag: 'span', text: '3 items', box: { x: 34, y: 197, width: 52, height: 18 }, meta: ['inline text'] }
]

const webEvidenceOptions = {
  title: 'UICheck Web Demo App',
  subtitle: 'All visible DOM elements with selected target #submit',
  mode: 'desktop',
  theme: {
    background: '#eef4ff',
    nav: '#2563eb',
    accent: '#f97316',
    soft: '#dbeafe'
  },
  screenshot: {
    title: 'Checkout page',
    route: '/checkout',
    platform: 'Web',
    width: 560,
    height: 360,
    contentHtml: `
      <h1 data-uicheck-id="title">Order review</h1>
      <p data-uicheck-id="intro">Rendered page captured by the Web demo app.</p>
      <div class="cards" data-uicheck-id="cards">
        <div class="card" data-uicheck-id="cart"><strong data-uicheck-id="card-title">Cart</strong><span data-uicheck-id="card-meta">3 items</span><div class="bar" data-uicheck-id="cart-bar"></div><div class="bar short"></div></div>
        <div class="card" data-uicheck-id="address"><strong>Address</strong><span>Ready</span><div class="bar" data-uicheck-id="address-bar"></div><div class="bar short"></div></div>
        <div class="card" data-uicheck-id="status"><strong>Status</strong><span>Visible</span><div class="bar" data-uicheck-id="status-bar"></div><div class="bar short"></div></div>
      </div>
      <div class="actions" data-uicheck-id="actions">
        <button class="secondary" data-uicheck-id="inspect">Inspect</button>
        <button id="submit" class="primary" data-testid="submit-button" data-uicheck-target>Submit order</button>
      </div>
    `
  },
  elements: webElements
}

renderDemoApp(webEvidenceOptions)

globalThis.uicheckRenderEvidence = () => {
  renderUiCheckEvidence(document.body, webEvidenceOptions)
  document.documentElement.dataset.uicheckEvidenceReady = 'true'
}

globalThis.uicheckRenderEvidenceFromMcp = ({ screenshot, inspected }) => {
  renderUiCheckEvidence(document.body, createMcpEvidenceOptions(webEvidenceOptions, screenshot, inspected))
  document.documentElement.dataset.uicheckEvidenceReady = 'true'
}

if (params.has('socketUrl')) {
  installUiCheck(html2canvas, {
    position: 'bottom-left',
    offset: [20, 20],
    size: 36,
    color: '#2563eb',
    draggable: false,
    socket: {
      url: params.get('socketUrl') ?? '',
      clientId: params.get('clientId') ?? 'web-evidence',
      reconnectMs: 300,
      enabled: true
    }
  })
}

document.documentElement.dataset.uicheckReady = 'true'

function renderDemoApp(options) {
  document.head.append(createDemoStyle(options))
  document.body.innerHTML = `
    <main class="uicheck-demo-app">
      <section class="uicheck-demo-screen">
        <header class="screen-header">
          <div>
            <div class="screen-title">${options.screenshot.title}</div>
            <div class="screen-route">${options.screenshot.route}</div>
          </div>
          <div class="screen-pill">${options.screenshot.platform}</div>
        </header>
        <div class="screen-body">${options.screenshot.contentHtml}</div>
      </section>
    </main>
  `
}

function createDemoStyle(options) {
  const style = document.createElement('style')
  style.textContent = `
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#f8fbff;color:#111827;font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.uicheck-demo-app{min-height:100vh;display:grid;place-items:center;padding:48px;background:linear-gradient(135deg,#f8fbff,${options.theme.background})}
.uicheck-demo-screen{width:${options.screenshot.width}px;height:${options.screenshot.height}px;overflow:hidden;border:1px solid rgba(15,23,42,.16);border-radius:14px;background:#fff;box-shadow:0 18px 42px rgba(15,23,42,.16)}
.screen-header{height:62px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;background:${options.theme.nav};color:#fff}
.screen-title{font-size:18px;font-weight:850}.screen-route{margin-top:3px;font-size:11px;opacity:.78}
.screen-pill{border:1px solid rgba(255,255,255,.36);background:rgba(255,255,255,.16);border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800}
.screen-body{position:relative;height:calc(100% - 62px);padding:22px}
.screen-body h1{margin:0 0 8px;font-size:22px}.screen-body p{margin:0 0 18px;color:#64748b}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:22px}
.card{min-height:78px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;padding:12px}.card strong{display:block;margin-bottom:6px}
.bar{height:7px;margin-top:9px;border-radius:999px;background:#cbd5e1}.bar.short{width:64%;background:${options.theme.soft}}
.actions{display:flex;justify-content:flex-end;gap:12px}.secondary,.primary{height:48px;border-radius:10px;font-weight:850}
.secondary{padding:0 20px;border:1px solid #cbd5e1;background:#fff;color:#334155}.primary{min-width:150px;border:0;background:${options.theme.accent};color:#fff}
`
  return style
}

function createMcpEvidenceOptions(baseOptions, screenshot, inspected) {
  const elements = Array.isArray(inspected?.elements)
    ? inspected.elements.map(normalizeMcpElement).filter(Boolean).slice(0, 18)
    : baseOptions.elements

  return {
    ...baseOptions,
    subtitle: 'Real @uicheck/mcp capture_page + inspect_elements result',
    screenshot: {
      title: screenshot.title ?? baseOptions.screenshot.title,
      route: screenshot.url ?? baseOptions.screenshot.route,
      platform: baseOptions.screenshot.platform,
      width: screenshot.width ?? baseOptions.screenshot.width,
      height: screenshot.height ?? baseOptions.screenshot.height,
      imageBase64: screenshot.base64,
      mimeType: screenshot.mimeType ?? 'image/png'
    },
    elements: elements.length > 0 ? elements : baseOptions.elements
  }
}

function normalizeMcpElement(element, index) {
  if (!element?.box) return null
  const id = element.id ?? element.testID ?? element.testId ?? `element-${index + 1}`
  return {
    id: String(id),
    selector: element.selector ?? `#${id}`,
    tag: element.tag ?? 'node',
    text: element.text,
    box: {
      x: element.box.x ?? element.box.left ?? 0,
      y: element.box.y ?? element.box.top ?? 0,
      width: element.box.width ?? 0,
      height: element.box.height ?? 0
    },
    meta: [
      element.testID || element.testId ? `testID: ${element.testID ?? element.testId}` : '',
      Array.isArray(element.classes) && element.classes.length > 0 ? `class: ${element.classes.slice(0, 2).join('.')}` : ''
    ].filter(Boolean),
    selected: id === 'submit' || element.testID === 'submit-button' || element.testId === 'submit-button'
  }
}
