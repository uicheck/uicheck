import html2canvas from 'html2canvas'
import { installUiCheck } from './client'
import { parseUiCheckOptionsFromUrl } from './options'

function parseOptions() {
  const script = document.currentScript
  const scriptSrc = script instanceof HTMLScriptElement ? script.src : window.location.href
  return parseUiCheckOptionsFromUrl(scriptSrc, window.location.href)
}

function install(): void {
  installUiCheck(html2canvas, parseOptions())
}

if (document.body) {
  install()
} else {
  document.addEventListener('DOMContentLoaded', install, { once: true })
}
