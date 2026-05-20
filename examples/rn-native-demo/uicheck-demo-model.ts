export interface RnDemoRow {
  id: string
  labelId: string
  valueId: string
  text: string
  value: string
}

export interface RnDemoElement {
  id?: string
  tag: string
  testID?: string
  accessibilityLabel?: string
  text?: string
  box: [number, number, number, number]
  className?: string
  dataset?: Record<string, unknown>
}

export const rnDemoText = {
  eyebrow: 'UICheck RN',
  title: 'Checkout screen',
  summaryTitle: 'Registered ref summary',
  summaryText: 'MCP reads runtime boxes, text, testID and labels.',
  itemsTitle: 'Order items',
  starterLicense: 'Starter license',
  teamAddon: 'Team add-on',
  total: 'Total',
  statusTitle: 'Ready for MCP inspection',
  statusText: 'This real demo has 100+ inspectable nodes.',
  detailsTitle: 'Runtime detail matrix',
  detailsGrid: 'Runtime details',
  hint: 'MCP can inspect all elements or a selected target.',
  submit: 'Submit order'
} as const

export const rnDemoRows: RnDemoRow[] = Array.from({ length: 34 }, (_, index) => {
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

export function createRnDemoSnapshotElements(): RnDemoElement[] {
  const elements: RnDemoElement[] = [
    {
      id: 'screen',
      tag: 'View',
      accessibilityLabel: rnDemoText.title,
      text: rnDemoText.title,
      box: [0, 0, 390, 844]
    },
    {
      id: 'eyebrow',
      tag: 'Text',
      accessibilityLabel: rnDemoText.eyebrow,
      text: rnDemoText.eyebrow,
      box: [24, 20, 84, 18]
    },
    {
      id: 'title',
      tag: 'Text',
      accessibilityLabel: rnDemoText.title,
      text: rnDemoText.title,
      box: [24, 42, 248, 34]
    },
    {
      id: 'summary-card',
      tag: 'View',
      accessibilityLabel: rnDemoText.summaryTitle,
      text: rnDemoText.summaryTitle,
      box: [14, 96, 362, 66],
      className: 'card'
    },
    {
      id: 'summary-title',
      tag: 'Text',
      accessibilityLabel: rnDemoText.summaryTitle,
      text: rnDemoText.summaryTitle,
      box: [24, 106, 180, 18]
    },
    {
      id: 'summary-text',
      tag: 'Text',
      accessibilityLabel: rnDemoText.summaryText,
      text: rnDemoText.summaryText,
      box: [24, 128, 320, 24]
    },
    {
      id: 'items-card',
      tag: 'View',
      accessibilityLabel: rnDemoText.itemsTitle,
      text: rnDemoText.itemsTitle,
      box: [14, 170, 362, 92],
      className: 'card'
    },
    {
      id: 'items-title',
      tag: 'Text',
      accessibilityLabel: rnDemoText.itemsTitle,
      text: rnDemoText.itemsTitle,
      box: [24, 180, 120, 18]
    },
    {
      id: 'item-row-1',
      tag: 'Text',
      accessibilityLabel: `${rnDemoText.starterLicense} $19`,
      text: `${rnDemoText.starterLicense} $19`,
      box: [24, 202, 320, 15]
    },
    {
      id: 'item-row-2',
      tag: 'Text',
      accessibilityLabel: `${rnDemoText.teamAddon} $8`,
      text: `${rnDemoText.teamAddon} $8`,
      box: [24, 220, 320, 15]
    },
    {
      id: 'total-row',
      tag: 'Text',
      accessibilityLabel: `${rnDemoText.total} $27`,
      text: `${rnDemoText.total} $27`,
      box: [24, 240, 320, 16]
    },
    {
      id: 'status-card',
      tag: 'View',
      accessibilityLabel: rnDemoText.statusTitle,
      text: rnDemoText.statusTitle,
      box: [14, 270, 362, 66],
      className: 'card'
    },
    {
      id: 'status-title',
      tag: 'Text',
      accessibilityLabel: rnDemoText.statusTitle,
      text: rnDemoText.statusTitle,
      box: [24, 280, 190, 18]
    },
    {
      id: 'status-text',
      tag: 'Text',
      accessibilityLabel: rnDemoText.statusText,
      text: rnDemoText.statusText,
      box: [24, 302, 260, 24]
    },
    {
      id: 'details-panel',
      tag: 'View',
      accessibilityLabel: rnDemoText.detailsTitle,
      text: rnDemoText.detailsTitle,
      box: [14, 344, 362, 370],
      className: 'details'
    },
    {
      id: 'details-title',
      tag: 'Text',
      accessibilityLabel: rnDemoText.detailsTitle,
      text: rnDemoText.detailsTitle,
      box: [22, 352, 150, 18]
    },
    {
      id: 'details-grid',
      tag: 'View',
      accessibilityLabel: rnDemoText.detailsGrid,
      text: rnDemoText.detailsGrid,
      box: [22, 374, 346, 330]
    }
  ]

  rnDemoRows.forEach((row, index) => {
    const column = index % 2
    const line = Math.floor(index / 2)
    const x = 22 + column * 174
    const y = 374 + line * 19
    elements.push(
      {
        id: row.id,
        tag: 'View',
        accessibilityLabel: `${row.text} ${row.value}`,
        text: `${row.text} ${row.value}`,
        box: [x, y, 166, 16],
        className: 'detail-row'
      },
      {
        id: row.labelId,
        tag: 'Text',
        accessibilityLabel: row.text,
        text: row.text,
        box: [x + 4, y + 2, 108, 12]
      },
      {
        id: row.valueId,
        tag: 'Text',
        accessibilityLabel: row.value,
        text: row.value,
        box: [x + 126, y + 2, 34, 12]
      }
    )
  })

  elements.push(
    {
      id: 'hint-banner',
      tag: 'Text',
      accessibilityLabel: rnDemoText.hint,
      text: rnDemoText.hint,
      box: [14, 722, 362, 34],
      className: 'hint'
    },
    {
      id: 'submit-button',
      tag: 'Pressable',
      testID: 'submit-button',
      accessibilityLabel: rnDemoText.submit,
      text: rnDemoText.submit,
      box: [14, 766, 362, 40],
      dataset: { role: 'primary-action' }
    },
    {
      id: 'submit-label',
      tag: 'Text',
      accessibilityLabel: rnDemoText.submit,
      text: rnDemoText.submit,
      box: [145, 778, 100, 16]
    }
  )

  return elements
}
