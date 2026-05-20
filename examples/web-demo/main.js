import { initUiCheck } from '../../packages/web/dist/index.js'

const params = new URLSearchParams(location.search)
const detailRows = Array.from({ length: 34 }, (_, index) => {
  const number = index + 1
  const padded = String(number).padStart(2, '0')
  return {
    id: `detail-row-${padded}`,
    labelId: `detail-label-${padded}`,
    valueId: `detail-value-${padded}`,
    text: `Runtime check ${padded}`,
    value: number % 3 === 0 ? 'ok' : number % 3 === 1 ? 'warn' : 'trace'
  }
})

const theme = {
  background: '#f8fafc',
  nav: '#111827',
  accent: '#a855f7'
}

const demoHtml = `
      <main id="screen" class="checkout-screen" data-uicheck-id="screen">
        <header id="header" class="header" data-uicheck-id="header">
          <div>
            <div id="eyebrow" class="eyebrow" data-uicheck-id="eyebrow">UICheck Web</div>
            <h1 id="title" data-uicheck-id="title">Checkout screen</h1>
          </div>
          <div id="runtime-badge" class="runtime-badge" data-uicheck-id="runtime-badge">web</div>
        </header>
        <div id="content" class="content" data-uicheck-id="content">
        <section id="summary-card" class="card compact-card" data-uicheck-id="summary-card">
          <strong id="summary-title" data-uicheck-id="summary-title">Registered ref summary</strong>
          <span id="summary-text" data-uicheck-id="summary-text">MCP reads runtime boxes, text, testID and labels.</span>
        </section>
        <section id="items-card" class="card items-card compact-card" data-uicheck-id="items-card">
          <strong id="items-title" data-uicheck-id="items-title">Order items</strong>
          <div id="item-row-1" data-uicheck-id="item-row-1" class="item-row"><span>Starter license</span><b>$19</b></div>
          <div id="item-row-2" data-uicheck-id="item-row-2" class="item-row"><span>Team add-on</span><b>$8</b></div>
          <div id="total-row" data-uicheck-id="total-row" class="item-row total-row"><span>Total</span><span>$27</span></div>
        </section>
        <section id="status-card" class="card status-card compact-card" data-uicheck-id="status-card">
          <strong id="status-title" data-uicheck-id="status-title">Ready for MCP inspection</strong>
          <span id="status-text" data-uicheck-id="status-text">This real demo has 100+ inspectable nodes.</span>
        </section>
        <section id="details-panel" class="details-panel" data-uicheck-id="details-panel">
          <strong id="details-title" data-uicheck-id="details-title">Runtime detail matrix</strong>
          <div id="details-grid" class="details-grid" data-uicheck-id="details-grid">
            ${detailRows
              .map(
                (row) => `
                  <div id="${row.id}" class="detail-row" data-uicheck-id="${row.id}">
                    <span id="${row.labelId}" data-uicheck-id="${row.labelId}">${row.text}</span>
                    <b id="${row.valueId}" data-uicheck-id="${row.valueId}">${row.value}</b>
                  </div>
                `
              )
              .join('')}
          </div>
        </section>
        <div id="hint-banner" class="hint-banner" data-uicheck-id="hint-banner">MCP can inspect all elements or a selected target.</div>
        <button id="submit-button" class="primary" data-testid="submit-button" data-uicheck-target data-uicheck-id="submit-button"><span id="submit-label" data-uicheck-id="submit-label">Submit order</span></button>
        </div>
      </main>
`

renderDemoApp()

if (params.has('socketUrl')) {
  initUiCheck({
    socket: {
      url: params.get('socketUrl') ?? '',
      clientId: params.get('clientId') ?? 'web-evidence',
      reconnectMs: 300
    }
  })
}

document.documentElement.dataset.uicheckReady = 'true'

function renderDemoApp() {
  document.head.append(createDemoStyle())
  document.body.innerHTML = `
    <main class="uicheck-demo-app">
      ${demoHtml}
    </main>
  `
}

function createDemoStyle() {
  const style = document.createElement('style')
  style.textContent = `
*{box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{margin:0;background:${theme.background};color:#111827;font:14px/1.45 Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.uicheck-demo-app{width:100vw;height:100vh;padding:0;background:${theme.background}}
.checkout-screen{width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#f8fafc}
.header{height:78px;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;background:${theme.nav};color:#fff}
.eyebrow{margin-bottom:4px;color:#93c5fd;font-size:13px;font-weight:700}.checkout-screen h1{margin:0;color:#fff;font-size:22px;line-height:28px;font-weight:900}
.runtime-badge{border:1px solid rgba(255,255,255,.36);border-radius:999px;padding:7px 12px;color:#fff;font-size:12px;font-weight:800}
.content{flex:1;min-height:0;padding:14px;display:flex;flex-direction:column;gap:8px}
.card,.details-panel{border:1px solid #dbe3ef;border-radius:10px;background:#fff;padding:10px;box-shadow:none}
.compact-card{height:66px}.items-card{height:92px}.status-card{height:66px}.card strong,.details-panel strong{display:block;margin-bottom:4px;color:#111827;font-size:13px;font-weight:850}.card span{display:block;color:#475569;font-size:11px;line-height:15px}
.item-row{display:flex;min-height:15px;margin-top:3px;color:#334155;font-size:11px;line-height:15px;justify-content:space-between}.item-row b{color:#111827}.total-row{margin-top:4px;padding-top:4px;border-top:1px solid #e2e8f0;color:#111827;font-weight:900}
.details-panel{height:370px;padding:8px}.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 6px}.detail-row{display:flex;justify-content:space-between;min-height:16px;padding:1px 4px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;color:#334155;font-size:9px;line-height:13px}.detail-row b{color:#0f766e;font-size:9px}
.hint-banner{min-height:34px;border-radius:10px;padding:8px 10px;background:#ecfeff;color:#0f766e;font-size:11px;font-weight:800;line-height:16px}
.primary{height:40px;margin-top:auto;border:0;border-radius:10px;background:${theme.accent};color:#fff;font-size:14px;font-weight:850}
`
  return style
}
