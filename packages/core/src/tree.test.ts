import { describe, expect, it } from 'vitest'
import { countElementTree, createFilteredElementTree, flattenElementTree, normalizeElementSearch } from './tree'

describe('element tree search', () => {
  it('returns only ancestor chains for matching nodes', () => {
    const tree = createFilteredElementTree(
      [
        { tag: 'main', id: 'app', box: { x: 0, y: 0, width: 300, height: 300 } },
        { tag: 'section', id: 'summary', box: { x: 10, y: 10, width: 200, height: 100 } },
        { tag: 'button', testId: 'submit-order', text: 'Submit order', box: { x: 20, y: 20, width: 100, height: 32 } },
        { tag: 'span', text: 'Ignored sibling', box: { x: 20, y: 70, width: 120, height: 20 } }
      ],
      normalizeElementSearch({ testId: 'submit' })
    )

    expect(countElementTree(tree)).toBe(3)
    expect(flattenElementTree(tree).map((node) => node.tag)).toEqual(['main', 'section', 'button'])
    expect(tree).toMatchObject([
      {
        id: 'app',
        children: [
          {
            id: 'summary',
            children: [
              {
                testId: 'submit-order',
                children: []
              }
            ]
          }
        ]
      }
    ])
  })

  it('matches specified styles without returning unrelated nodes', () => {
    const tree = createFilteredElementTree(
      [
        { tag: 'main', id: 'app', box: { x: 0, y: 0, width: 300, height: 300 } },
        {
          tag: 'button',
          id: 'submit',
          style: { color: 'rgb(255, 0, 0)', display: 'block' },
          box: { x: 20, y: 20, width: 100, height: 32 }
        },
        {
          tag: 'button',
          id: 'cancel',
          style: { color: 'rgb(0, 0, 0)', display: 'block' },
          box: { x: 20, y: 70, width: 100, height: 32 }
        }
      ],
      normalizeElementSearch({ styles: { color: '255, 0, 0', display: 'block' } })
    )

    expect(countElementTree(tree)).toBe(2)
    expect(flattenElementTree(tree).map((node) => node.id)).toEqual(['app', 'submit'])
  })
})
