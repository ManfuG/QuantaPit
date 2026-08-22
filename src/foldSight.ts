export type SymbolKind = 'circle' | 'triangle' | 'cross' | 'star' | 'square' | 'diamond'
export type FaceId = 0 | 1 | 2 | 3 | 4 | 5
export interface Vector { x: number; y: number; z: number }
export interface Point { x: number; y: number }
export interface Orientation { normal: Vector; up: Vector; right: Vector }
export interface FoldFace { id: FaceId; cell: Point; symbol: SymbolKind; color: string; rotation: 0 | 90 | 180 | 270; orientation: Orientation }
export interface NetLayout { name: string; cells: Record<FaceId, Point> }
export interface CubeView { id: string; top: FoldFace; front: FoldFace; right: FoldFace; valid: boolean }
export interface FoldSightQuestion { net: FoldFace[]; options: CubeView[]; correctView: CubeView }

export const SYMBOLS: readonly SymbolKind[] = ['circle', 'triangle', 'cross', 'star', 'square', 'diamond']
export const COLORS = ['#c9f27a', '#8bd3dd', '#f39e80', '#c4a7e7', '#f6d365', '#7dd3a6'] as const
const V = (x: number, y: number, z: number): Vector => ({ x, y, z })
const equal = (a: Vector, b: Vector) => a.x === b.x && a.y === b.y && a.z === b.z
const neg = (a: Vector) => V(-a.x, -a.y, -a.z)
const east = (o: Orientation): Orientation => ({ normal: o.right, up: o.up, right: neg(o.normal) })
const west = (o: Orientation): Orientation => ({ normal: neg(o.right), up: o.up, right: o.normal })
const north = (o: Orientation): Orientation => ({ normal: o.up, up: neg(o.normal), right: o.right })
const south = (o: Orientation): Orientation => ({ normal: neg(o.up), up: o.normal, right: o.right })
const origin: Orientation = { normal: V(0, 0, 1), up: V(0, 1, 0), right: V(1, 0, 0) }

export const NET_LAYOUTS: readonly NetLayout[] = [
  { name: 'cross-left-tail', cells: { 0: { x: 0, y: 0 }, 1: { x: -1, y: 0 }, 2: { x: 1, y: 0 }, 3: { x: 0, y: -1 }, 4: { x: 0, y: 1 }, 5: { x: -2, y: 0 } } },
  { name: 'long-zigzag', cells: { 0: { x: 0, y: 0 }, 1: { x: 1, y: 0 }, 2: { x: 2, y: 0 }, 3: { x: 3, y: 0 }, 4: { x: 1, y: 1 }, 5: { x: 2, y: -1 } } },
  { name: 'asymmetric-t', cells: { 0: { x: 0, y: 0 }, 1: { x: -1, y: 0 }, 2: { x: -2, y: 0 }, 3: { x: -1, y: 1 }, 4: { x: -1, y: -1 }, 5: { x: -3, y: 0 } } },
  { name: 'forked-chain', cells: { 0: { x: 0, y: 0 }, 1: { x: 1, y: 0 }, 2: { x: 2, y: 0 }, 3: { x: 3, y: 0 }, 4: { x: 3, y: 1 }, 5: { x: 2, y: -1 } } },
  { name: 'split-chain', cells: { 0: { x: 0, y: 0 }, 1: { x: 1, y: 0 }, 2: { x: 2, y: 0 }, 3: { x: 3, y: 0 }, 4: { x: 1, y: 1 }, 5: { x: 3, y: -1 } } },
]

const key = (p: Point) => `${p.x},${p.y}`
const direction = (from: Point, to: Point): ((orientation: Orientation) => Orientation) | null => {
  const dx = to.x - from.x; const dy = to.y - from.y
  if (dx === 1 && dy === 0) return east
  if (dx === -1 && dy === 0) return west
  if (dx === 0 && dy === -1) return north
  if (dx === 0 && dy === 1) return south
  return null
}

export function foldNet(layout: NetLayout): Record<FaceId, Orientation> {
  const byCell = new Map(Object.entries(layout.cells).map(([id, p]) => [key(p), Number(id) as FaceId]))
  const orientations: Partial<Record<FaceId, Orientation>> = { 0: origin }
  const queue: FaceId[] = [0]
  while (queue.length) {
    const id = queue.shift() as FaceId; const current = orientations[id]!; const cell = layout.cells[id]
    for (const neighbor of Object.values(layout.cells) as Point[]) {
      const nextId = byCell.get(key(neighbor)); const rotate = direction(cell, neighbor)
      if (nextId === undefined || !rotate) continue
      const next = rotate(current)
      if (orientations[nextId] && !equal(orientations[nextId]!.normal, next.normal)) throw new Error('Invalid cube net: conflicting fold orientation.')
      if (!orientations[nextId]) { orientations[nextId] = next; queue.push(nextId) }
    }
  }
  if (Object.keys(orientations).length !== 6) throw new Error('Invalid cube net: disconnected faces.')
  return orientations as Record<FaceId, Orientation>
}

export function isValidNet(layout: NetLayout): boolean {
  try { const orientations = foldNet(layout); return new Set(Object.values(orientations).map(o => `${o.normal.x},${o.normal.y},${o.normal.z}`)).size === 6 } catch { return false }
}

const randomInt = (max: number) => Math.floor(Math.random() * max)
const rotations = [0, 90, 180, 270] as const
const randomItem = <T,>(items: readonly T[]) => items[randomInt(items.length)]
const faceAtNormal = (faces: FoldFace[], normal: Vector) => faces.find(face => equal(face.orientation.normal, normal))!
const opposite = (faces: FoldFace[], face: FoldFace) => faceAtNormal(faces, neg(face.orientation.normal))

export function isValidCubeView(view: CubeView): boolean {
  const faces = [view.top, view.front, view.right]
  if (new Set(faces.map(face => face.id)).size !== 3) return false
  const normals = faces.map(face => face.orientation.normal)
  return normals.every((normal, index) => normals.slice(index + 1).every(other => Math.abs(normal.x * other.x + normal.y * other.y + normal.z * other.z) === 0))
}

export function isFoldSightAnswerCorrect(question: FoldSightQuestion, view: CubeView): boolean {
  return isValidCubeView(view) && view.top.id === question.correctView.top.id && view.front.id === question.correctView.front.id && view.right.id === question.correctView.right.id
}

export function generateFoldSightQuestion(): FoldSightQuestion {
  const layout = randomItem(NET_LAYOUTS); const orientations = foldNet(layout)
  const faces: FoldFace[] = (Object.keys(layout.cells).map(Number) as FaceId[]).map((id, index) => ({ id, cell: layout.cells[id], symbol: SYMBOLS[index], color: COLORS[index], rotation: randomItem(rotations), orientation: orientations[id] }))
  const top = faceAtNormal(faces, V(0, 1, 0)); const front = faceAtNormal(faces, V(0, 0, 1)); const right = faceAtNormal(faces, V(1, 0, 0))
  const correctView: CubeView = { id: 'correct', top, front, right, valid: true }
  const invalidViews: CubeView[] = [
    { id: 'distractor-1', top: opposite(faces, front), front, right, valid: false },
    { id: 'distractor-2', top, front: opposite(faces, top), right, valid: false },
    { id: 'distractor-3', top, front, right: opposite(faces, front), valid: false },
    { id: 'distractor-4', top, front: top, right, valid: false },
  ]
  const options = [correctView, ...invalidViews].sort(() => Math.random() - 0.5).map((view, index) => ({ ...view, id: `option-${index + 1}` }))
  return { net: faces, options, correctView: options.find(option => option.top.id === top.id && option.front.id === front.id && option.right.id === right.id)! }
}
