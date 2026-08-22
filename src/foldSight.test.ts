import { describe, expect, it } from 'vitest'
import { generateFoldSightQuestion, foldNet, isFoldSightAnswerCorrect, isValidCubeView, isValidNet, NET_LAYOUTS, SYMBOLS } from './foldSight'

describe('FoldSight nets', () => {
  it('accepts every predefined layout and folds six faces', () => {
    for (const layout of NET_LAYOUTS) {
      expect(isValidNet(layout)).toBe(true)
      expect(Object.keys(foldNet(layout))).toHaveLength(6)
    }
  })
  it('contains genuinely different normalized shapes', () => {
    const signatures = NET_LAYOUTS.map(layout => {
      const points = Object.values(layout.cells); const minX = Math.min(...points.map(point => point.x)); const minY = Math.min(...points.map(point => point.y))
      return points.map(point => `${point.x - minX},${point.y - minY}`).sort().join('|')
    })
    expect(new Set(signatures).size).toBeGreaterThanOrEqual(3)
  })
  it('creates six unique face normals with opposite pairs', () => {
    const orientations = foldNet(NET_LAYOUTS[0])
    const normals = Object.values(orientations).map(face => `${face.normal.x},${face.normal.y},${face.normal.z}`)
    expect(new Set(normals).size).toBe(6)
    for (const orientation of Object.values(orientations)) {
      expect(normals).toContain(`${-orientation.normal.x},${-orientation.normal.y},${-orientation.normal.z}`)
    }
  })
})

describe('FoldSight question generation', () => {
  it('creates six symbols, five unique options and one correct option', () => {
    for (let index = 0; index < 30; index += 1) {
      const question = generateFoldSightQuestion()
      expect(question.net).toHaveLength(6)
      expect(question.net.map(face => face.symbol)).toEqual(SYMBOLS)
      expect(question.options).toHaveLength(5)
      expect(new Set(question.options.map(option => `${option.top.id}-${option.front.id}-${option.right.id}`)).size).toBe(5)
      const correct = question.options.filter(option => isFoldSightAnswerCorrect(question, option))
      expect(correct).toHaveLength(1)
      expect(correct[0].id).toBe(question.correctView.id)
      expect(question.options.filter(option => option.valid)).toHaveLength(1)
      for (const option of question.options) expect(isValidCubeView(option)).toBe(option.valid)
    }
  })
})
