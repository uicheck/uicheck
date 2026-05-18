import {
  createUiCheckEvidenceLayout,
  getUiCheckEvidenceMetrics,
  getUiCheckEvidenceScaledBox,
  type UiCheckEvidenceElement,
  type UiCheckEvidenceLayoutItem,
  type UiCheckEvidenceMetrics,
  type UiCheckEvidenceOptions,
  type UiCheckEvidenceRect,
  type UiCheckEvidenceScreenshot
} from '@uicheck/core/evidence'

export type {
  UiCheckEvidenceElement,
  UiCheckEvidenceMetrics,
  UiCheckEvidenceOptions,
  UiCheckEvidenceRect,
  UiCheckEvidenceScreenshot
}

export function renderUiCheckEvidence(container: HTMLElement, options: UiCheckEvidenceOptions): void {
  container.innerHTML = ''
  const app = createEvidenceView(options)
  container.append(createStyle(options), app)
  renderAnnotations(app, options)
}

function createEvidenceView(options: UiCheckEvidenceOptions): HTMLElement {
  const metrics = getUiCheckEvidenceMetrics(options)
  const app = element('main', 'uicheck-evidence-app')
  app.classList.add(`uicheck-evidence-${options.mode}`)
  app.style.setProperty('--uicheck-bg', options.theme.background)
  app.style.setProperty('--uicheck-nav', options.theme.nav)
  app.style.setProperty('--uicheck-accent', options.theme.accent)
  app.style.setProperty('--uicheck-soft', options.theme.soft)

  const diagram = element('section', 'uicheck-evidence-diagram')
  diagram.dataset.uicheckEvidenceDiagram = 'true'
  diagram.style.width = `${metrics.width}px`
  diagram.style.height = `${metrics.height}px`

  const screenshot = createScreenshot(options, metrics)
  const title = element('div', 'uicheck-evidence-title')
  title.innerHTML = `
    <strong>${escapeHtml(options.title)}</strong>
    <span>${escapeHtml(options.subtitle)}</span>
  `
  const status = element('div', 'uicheck-evidence-status')
  status.textContent = 'capture_page + inspect_elements'

  diagram.append(title, status, screenshot)
  app.append(diagram)
  return app
}

function createScreenshot(options: UiCheckEvidenceOptions, metrics: UiCheckEvidenceMetrics): HTMLElement {
  const shot = element('section', 'uicheck-evidence-screenshot')
  shot.style.left = `${metrics.shotX}px`
  shot.style.top = `${metrics.shotY}px`
  shot.style.width = `${metrics.shotWidth}px`
  shot.style.height = `${metrics.shotHeight}px`
  shot.dataset.uicheckEvidenceScreenshot = 'true'
  if (options.screenshot.imageBase64) {
    const mimeType = options.screenshot.mimeType ?? 'image/png'
    shot.innerHTML = `<img class="uicheck-evidence-screenshot-image" src="data:${escapeHtml(mimeType)};base64,${escapeHtml(options.screenshot.imageBase64)}" alt="${escapeHtml(options.screenshot.title)}" />`
    return shot
  }

  shot.innerHTML = `
    <header class="uicheck-evidence-screen-header">
      <div>
        <div class="uicheck-evidence-screen-title">${escapeHtml(options.screenshot.title)}</div>
        ${options.screenshot.route ? `<div class="uicheck-evidence-screen-route">${escapeHtml(options.screenshot.route)}</div>` : ''}
      </div>
      <div class="uicheck-evidence-screen-pill">${escapeHtml(options.screenshot.platform)}</div>
    </header>
    <div class="uicheck-evidence-screen-body">${options.screenshot.contentHtml ?? ''}</div>
  `
  return shot
}

function renderAnnotations(app: HTMLElement, options: UiCheckEvidenceOptions): void {
  const metrics = getUiCheckEvidenceMetrics(options)
  const diagram = app.querySelector<HTMLElement>('[data-uicheck-evidence-diagram="true"]')
  const screenshot = app.querySelector<HTMLElement>('[data-uicheck-evidence-screenshot="true"]')
  if (!diagram || !screenshot) return

  diagram.querySelectorAll('.uicheck-evidence-connectors,.uicheck-evidence-element-box,.uicheck-evidence-marker,.uicheck-evidence-label').forEach((node) => node.remove())

  const measuredBoxes = options.elements.map((item) => getMeasuredBox(item, screenshot, metrics))
  const layout = createUiCheckEvidenceLayout(options, measuredBoxes)

  const connectors = createConnectors(layout.items, layout.metrics)
  diagram.append(connectors)
  for (const entry of layout.items) {
    diagram.append(createElementBox(entry), createMarker(entry), createLabel(entry))
  }
}

function createElementBox(entry: UiCheckEvidenceLayoutItem): HTMLElement {
  const box = element('div', 'uicheck-evidence-element-box')
  box.style.setProperty('--uicheck-color', entry.color)
  box.style.left = `${entry.box.x}px`
  box.style.top = `${entry.box.y}px`
  box.style.width = `${entry.box.width}px`
  box.style.height = `${entry.box.height}px`
  if (entry.item.selected) box.classList.add('is-selected')
  return box
}

function createMarker(entry: UiCheckEvidenceLayoutItem): HTMLElement {
  const marker = element('div', 'uicheck-evidence-marker')
  marker.textContent = String(entry.index + 1)
  marker.style.setProperty('--uicheck-color', entry.color)
  marker.style.left = `${entry.marker.x}px`
  marker.style.top = `${entry.marker.y}px`
  if (entry.item.selected) marker.classList.add('is-selected')
  return marker
}

function createLabel(entry: UiCheckEvidenceLayoutItem): HTMLElement {
  const item = entry.item
  const label = element('article', 'uicheck-evidence-label')
  label.style.setProperty('--uicheck-color', entry.color)
  label.style.left = `${entry.label.x}px`
  label.style.top = `${entry.label.y}px`
  label.style.width = `${entry.label.width}px`
  if (item.selected) label.classList.add('is-selected')

  label.innerHTML = `
    <div class="uicheck-evidence-label-title">
      <span class="uicheck-evidence-label-number">${entry.index + 1}</span>
      <code>${escapeHtml(item.tag)}${item.id ? `#${escapeHtml(item.id)}` : ''}</code>
    </div>
    <div class="uicheck-evidence-label-selector">${escapeHtml(shorten(item.selector, 34))}</div>
    <div class="uicheck-evidence-label-size">${Math.round(entry.box.width)}x${Math.round(entry.box.height)}${item.selected ? ' selected' : ''}</div>
    ${item.text ? `<div class="uicheck-evidence-label-text">text: ${escapeHtml(shorten(item.text, 28))}</div>` : ''}
    ${(item.meta ?? []).slice(0, 2).map((entry) => `<div class="uicheck-evidence-label-meta">${escapeHtml(shorten(entry, 34))}</div>`).join('')}
  `
  return label
}

function createConnectors(items: UiCheckEvidenceLayoutItem[], metrics: UiCheckEvidenceMetrics): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('uicheck-evidence-connectors')
  svg.setAttribute('viewBox', `0 0 ${metrics.width} ${metrics.height}`)
  svg.setAttribute('preserveAspectRatio', 'none')

  items.forEach((item) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.style.setProperty('--uicheck-color', item.color)
    path.setAttribute('d', item.connectorPath)
    svg.append(path)
  })

  return svg
}

function getMeasuredBox(item: UiCheckEvidenceElement, screenshot: HTMLElement, metrics: UiCheckEvidenceMetrics): UiCheckEvidenceRect {
  const target = findEvidenceTarget(item, screenshot)
  if (!target) return getUiCheckEvidenceScaledBox(item, metrics)

  const targetRect = target.getBoundingClientRect()
  const screenshotRect = screenshot.getBoundingClientRect()
  const x = targetRect.left - screenshotRect.left + metrics.shotX
  const y = targetRect.top - screenshotRect.top + metrics.shotY
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(6, Math.round(targetRect.width)),
    height: Math.max(6, Math.round(targetRect.height))
  }
}

function findEvidenceTarget(item: UiCheckEvidenceElement, screenshot: HTMLElement): Element | null {
  if (item.id) {
    const byId = screenshot.querySelector(`[data-uicheck-id="${escapeCssString(item.id)}"]`)
    if (byId) return byId
  }
  if (item.id === 'app' || item.id === 'page' || item.id === 'screen') return screenshot
  if (item.id === 'header' || item.id === 'nav') return screenshot.querySelector('.uicheck-evidence-screen-header')
  if (item.id === 'route') return screenshot.querySelector('.uicheck-evidence-screen-route')
  if (item.id === 'platform') return screenshot.querySelector('.uicheck-evidence-screen-pill')
  try {
    return screenshot.querySelector(item.selector)
  } catch {
    return null
  }
}

function createStyle(_options: UiCheckEvidenceOptions): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = `
*{box-sizing:border-box}
html,body{margin:0;width:100%;min-height:100%;overflow:hidden;background:#f8fbff;color:#111827;font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.uicheck-evidence-app{width:100vw;height:100vh;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f8fbff}
.uicheck-evidence-diagram{position:relative;flex:0 0 auto;overflow:hidden;background-image:radial-gradient(#c7d3e3 1.4px,transparent 1.4px);background-size:20px 20px}
.uicheck-evidence-title{position:absolute;left:28px;top:24px;z-index:40;color:#111827}
.uicheck-evidence-title strong{display:block;font-size:22px;font-weight:850}
.uicheck-evidence-title span{display:block;margin-top:3px;color:#52627a;font-size:12px;font-weight:650}
.uicheck-evidence-status{position:absolute;right:28px;top:24px;z-index:40;display:flex;gap:8px;align-items:center;border:1px solid #d7deea;background:rgba(255,255,255,.92);border-radius:999px;padding:9px 13px;color:#334155;font-weight:750;white-space:nowrap;box-shadow:0 8px 22px rgba(15,23,42,.08)}
.uicheck-evidence-status:before{content:"";width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.15)}
.uicheck-evidence-screenshot{position:absolute;overflow:hidden;border:1px solid rgba(15,23,42,.62);border-radius:4px;background:#fff;box-shadow:0 18px 42px rgba(15,23,42,.18);z-index:10}
.uicheck-evidence-phone .uicheck-evidence-screenshot{border-radius:22px}
.uicheck-evidence-screenshot-image{display:block;width:100%;height:100%;object-fit:fill}
.uicheck-evidence-screen-header{height:62px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;background:var(--uicheck-nav);color:#fff}
.uicheck-evidence-phone .uicheck-evidence-screen-header{height:70px;padding:14px 16px}
.uicheck-evidence-screen-title{font-size:18px;font-weight:850}
.uicheck-evidence-phone .uicheck-evidence-screen-title{font-size:15px}
.uicheck-evidence-screen-route{margin-top:3px;font-size:11px;opacity:.78}
.uicheck-evidence-screen-pill{border:1px solid rgba(255,255,255,.36);background:rgba(255,255,255,.16);border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800}
.uicheck-evidence-screen-body{position:relative;height:calc(100% - 62px);padding:22px;background:#fff}
.uicheck-evidence-phone .uicheck-evidence-screen-body{height:calc(100% - 70px);padding:18px}
.uicheck-evidence-screen-body h1{margin:0 0 8px;font-size:22px}
.uicheck-evidence-phone .uicheck-evidence-screen-body h1{font-size:18px}
.uicheck-evidence-screen-body p{margin:0 0 18px;color:#64748b}
.uicheck-evidence-screen-body .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:22px}
.uicheck-evidence-phone .uicheck-evidence-screen-body .cards{grid-template-columns:1fr}
.uicheck-evidence-screen-body .card{min-height:78px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;padding:12px}
.uicheck-evidence-phone .uicheck-evidence-screen-body .card{min-height:70px}
.uicheck-evidence-screen-body .card strong{display:block;margin-bottom:6px}
.uicheck-evidence-screen-body .bar{height:7px;margin-top:9px;border-radius:999px;background:#cbd5e1}
.uicheck-evidence-screen-body .bar.short{width:64%;background:var(--uicheck-soft)}
.uicheck-evidence-screen-body .actions{display:flex;justify-content:flex-end;gap:12px}
.uicheck-evidence-phone .uicheck-evidence-screen-body .actions{position:absolute;right:18px;bottom:24px}
.uicheck-evidence-screen-body .secondary,.uicheck-evidence-screen-body .primary{height:48px;border-radius:10px;font-weight:850}
.uicheck-evidence-screen-body .secondary{padding:0 20px;border:1px solid #cbd5e1;background:#fff;color:#334155}
.uicheck-evidence-phone .uicheck-evidence-screen-body .secondary{display:none}
.uicheck-evidence-screen-body .primary{min-width:150px;border:0;background:var(--uicheck-accent);color:#fff}
.uicheck-evidence-phone .uicheck-evidence-screen-body .primary{min-width:120px}
.uicheck-evidence-element-box{position:absolute;border:1.5px solid var(--uicheck-color);border-radius:2px;background:rgba(37,99,235,.05);z-index:18}
.uicheck-evidence-element-box.is-selected{border-width:2.5px;background:rgba(234,88,12,.14)}
.uicheck-evidence-marker,.uicheck-evidence-label-number{display:grid;place-items:center;border-radius:999px;background:var(--uicheck-color);color:#fff;font:800 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.uicheck-evidence-marker{position:absolute;width:24px;height:24px;transform:translate(-50%,-50%);box-shadow:0 3px 10px rgba(15,23,42,.26);z-index:25}
.uicheck-evidence-marker.is-selected{outline:3px solid rgba(255,255,255,.88)}
.uicheck-evidence-label{position:absolute;height:82px;border-left:5px solid var(--uicheck-color);border-radius:4px;background:#252538;color:#dbeafe;padding:8px 10px;box-shadow:0 4px 12px rgba(15,23,42,.24);z-index:30;overflow:hidden}
.uicheck-evidence-label.is-selected{box-shadow:0 0 0 2px var(--uicheck-accent),0 8px 22px rgba(15,23,42,.28)}
.uicheck-evidence-label-title{display:flex;align-items:center;gap:8px;min-width:0}
.uicheck-evidence-label-number{min-width:22px;height:22px;font-size:11px}
.uicheck-evidence-label code{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#dbeafe;font:800 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.uicheck-evidence-label-selector{margin-top:4px;color:#86efac;font:700 10px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uicheck-evidence-label-size,.uicheck-evidence-label-text,.uicheck-evidence-label-meta{margin-top:3px;color:#bfdbfe;font:700 10px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uicheck-evidence-label-text{color:#fbcfe8}
.uicheck-evidence-label-meta{color:#a7f3d0}
.uicheck-evidence-connectors{position:absolute;inset:0;pointer-events:none;z-index:24}
.uicheck-evidence-connectors path{fill:none;stroke:var(--uicheck-color);stroke-width:2;stroke-linecap:round;opacity:.52}
`
  return style
}

function element(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = className
  return node
}

function shorten(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
