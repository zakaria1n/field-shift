import { seededRandom } from './parcelGeometry'

/** Procedural agricultural surface: broad, coherent field plots in muted
 * greens and dry tans with soft bund transitions — deliberately stylized.
 * A selected dry or bare field is never turned into a lush farm. */

const PALETTE_GREENS = ['#6B9254', '#79A25E', '#8AB06B', '#5F8547']
const PALETTE_TANS = ['#BFA268', '#B2925A', '#C7AB72']
const PALETTE_SOIL = ['#8F7250', '#7E6344']

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 255) * factor))
  const g = Math.min(255, Math.round(((n >> 8) & 255) * factor))
  const b = Math.min(255, Math.round((n & 255) * factor))
  return `rgb(${r},${g},${b})`
}

export function createFieldTexture(seed: number, width = 1024, height = 1024): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const random = seededRandom(seed)

  // Base soil ground — everything sits on this.
  ctx.fillStyle = '#7E6344'
  ctx.fillRect(0, 0, width, height)

  // 4-6 broad plot bands, each split into 2-3 wide plots: a coherent landscape,
  // not a grid of tiles. Plot edges get soft blended transitions (bunds).
  const bandCount = 4 + Math.floor(random() * 3)
  const bandHeights = Array.from({ length: bandCount }, () => 120 + random() * 180)
  const totalH = bandHeights.reduce((a, b) => a + b, 0)
  let cursorY = 0
  for (let band = 0; band < bandCount; band++) {
    const bandH = (bandHeights[band] / totalH) * height
    const plotsInBand = 2 + Math.floor(random() * 2)
    let cursorX = -40
    let lastFamily = ''
    for (let plot = 0; plot < plotsInBand; plot++) {
      const plotW = width / plotsInBand + 90
      const x = Math.max(-20, cursorX)
      const w = Math.min(plotW, width - x + 20)
      const y = cursorY
      const h = bandH

      const roll = random()
      let family: 'green' | 'tan' | 'soil'
      if (roll < 0.58) family = 'green'
      else if (roll < 0.86) family = 'tan'
      else family = 'soil'
      // avoid strict left/right alternation — consecutive same-family plots
      // keep the surface reading as one landscape rather than a checkerboard
      if (family === lastFamily) family = family === 'green' ? 'tan' : 'green'
      lastFamily = family
      let base: string
      if (family === 'green') base = PALETTE_GREENS[Math.floor(random() * PALETTE_GREENS.length)]
      else if (family === 'tan') base = PALETTE_TANS[Math.floor(random() * PALETTE_TANS.length)]
      else base = PALETTE_SOIL[Math.floor(random() * PALETTE_SOIL.length)]

      // Gentle two-tone gradient per plot instead of flat fills.
      const gradient = ctx.createLinearGradient(x, y, x + w * 0.4, y + h)
      gradient.addColorStop(0, shade(base, 1.08))
      gradient.addColorStop(1, shade(base, 0.88))
      ctx.fillStyle = gradient
      ctx.fillRect(x, y, w, h)

      // Broad crop striations (green plots) or soft furrows (tilled plots).
      if (family === 'green') {
        ctx.strokeStyle = 'rgba(28,52,20,0.13)'
        ctx.lineWidth = 3
        for (let sy = y + 10; sy < y + h; sy += 18) {
          ctx.beginPath()
          ctx.moveTo(x, sy)
          ctx.bezierCurveTo(x + w * 0.3, sy - 4, x + w * 0.7, sy + 4, x + w, sy)
          ctx.stroke()
        }
      } else {
        ctx.strokeStyle = 'rgba(255,246,225,0.07)'
        ctx.lineWidth = 2
        for (let sy = y + 12; sy < y + h; sy += 22) {
          ctx.beginPath()
          ctx.moveTo(x, sy)
          ctx.lineTo(x + w, sy)
          ctx.stroke()
        }
      }

      // Irregular dry patches inside green plots break up the alternation.
      if (family === 'green' && random() < 0.7) {
        const px = x + w * (0.15 + random() * 0.4)
        const py = y + h * (0.15 + random() * 0.4)
        const pr = 18 + random() * 42
        const patch = ctx.createRadialGradient(px, py, pr * 0.2, px, py, pr)
        patch.addColorStop(0, 'rgba(178,146,90,0.5)')
        patch.addColorStop(1, 'rgba(178,146,90,0)')
        ctx.fillStyle = patch
        ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2)
      }

      // Soft bund line between plots — a darker tone, not a hard black stroke.
      ctx.strokeStyle = 'rgba(52,36,20,0.28)'
      ctx.lineWidth = 5
      ctx.strokeRect(x + 2, y + 2, Math.max(2, w - 4), Math.max(2, h - 4))

      cursorX += plotW - 30
    }
    cursorY += bandH
  }

  // A few canopy clusters — sparse and settled, never a forest.
  for (let i = 0; i < 14; i++) {
    const x = random() * width
    const y = random() * height
    const radius = 8 + random() * 16
    const canopy = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.2, x, y, radius)
    canopy.addColorStop(0, 'rgba(96,134,66,0.85)')
    canopy.addColorStop(1, 'rgba(46,74,32,0.8)')
    ctx.fillStyle = canopy
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Gentle overall vignette so the terrain reads as one lit object.
  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.25, width / 2, height / 2, height * 0.72)
  vignette.addColorStop(0, 'rgba(255,244,214,0.10)')
  vignette.addColorStop(1, 'rgba(20,26,16,0.22)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  return canvas
}

/** Stylized soil-strata side material, layered like the reference terrains. */
export function createSoilSideTexture(width = 512, height = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const random = seededRandom(20260101)

  const strata = [
    { from: 0.0, to: 0.16, color: '#5C4128' },
    { from: 0.16, to: 0.42, color: '#4A3421' },
    { from: 0.42, to: 0.72, color: '#3E2C1D' },
    { from: 0.72, to: 1.0, color: '#33241A' },
  ]
  for (const stratum of strata) {
    const y0 = stratum.from * height
    const y1 = stratum.to * height
    const gradient = ctx.createLinearGradient(0, y0, 0, y1)
    gradient.addColorStop(0, shade(stratum.color, 1.15))
    gradient.addColorStop(1, stratum.color)
    ctx.fillStyle = gradient
    ctx.fillRect(0, y0, width, y1 - y0)
  }

  // Thin lighter humus seam near the top.
  ctx.fillStyle = 'rgba(122,92,52,0.9)'
  ctx.fillRect(0, height * 0.05, width, height * 0.045)

  // Embedded stone speckles.
  for (let i = 0; i < 130; i++) {
    const x = random() * width
    const y = random() * height
    const r = 1 + random() * 3.5
    ctx.fillStyle = `rgba(${150 + random() * 40},${130 + random() * 30},${100 + random() * 30},${0.25 + random() * 0.3})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Horizontal strata seams.
  ctx.strokeStyle = 'rgba(24,16,10,0.4)'
  ctx.lineWidth = 2
  for (const stratum of strata.slice(1)) {
    const y = stratum.from * height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  return canvas
}
