// pages/tools/calc/color/index.js
//
// 颜色/进制转换工具
// 输入 HEX 颜色，实时输出 RGB、HSL、Decimal、Binary 及色彩和声变体

// ─── 颜色转换 ───

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null
  return { r, g, b }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0').toUpperCase()).join('')
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  }
}

// 色彩和声变体（互补色、类比色、三等分色）
function getVariants(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return []
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)

  const make = (dh, ds, dl) => {
    const nh = ((h + dh) % 360 + 360) % 360
    const ns = Math.max(0, Math.min(100, s + ds))
    const nl = Math.max(0, Math.min(100, l + dl))
    const c = hslToRgb(nh, ns, nl)
    return rgbToHex(c.r, c.g, c.b)
  }

  return [
    make(0,  -30, 20),   // 浅色
    make(0,  -10, 10),   // 次浅
    make(180, 0,  -10),  // 互补（深）
    make(0,   0,  20),   // 亮变
  ]
}

// 进制转换
function rgbToBinary(r, g, b) {
  return [r, g, b].map(v => v.toString(2).padStart(8, '0')).join(' ')
}

function rgbToDecimal(r, g, b) {
  return (r << 16 | g << 8 | b).toString(10)
}

// 解析输入（支持 HEX / RGB）
function parseInput(raw, mode) {
  const s = raw.trim()
  if (mode === 'hex') {
    let h = s.startsWith('#') ? s : '#' + s
    if (h.length === 4) {
      h = '#' + h[1]+h[1]+h[2]+h[2]+h[3]+h[3]
    }
    return hexToRgb(h) ? { hex: h.toUpperCase(), ...hexToRgb(h) } : null
  } else {
    // RGB 模式，格式 "r, g, b" 或 "r g b"
    const parts = s.split(/[,\s]+/).map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return null
    const [r, g, b] = parts
    if ([r,g,b].some(v => v < 0 || v > 255)) return null
    return { r, g, b, hex: rgbToHex(r, g, b) }
  }
}

Component({
  data: {
    mode: 'hex',        // 'hex' | 'rgb'
    inputValue: '#4955B3',
    previewColor: '#4955B3',
    hexVal: '#4955B3',
    rgb: '73, 85, 179',
    hsl: '233°, 42%, 49%',
    decimal: '4806067',
    binary: '01001001 01010101 10110011',
    variants: [],
    valid: true,
  },

  lifetimes: {
    ready() {
      this._process('#4955B3')
    },
  },

  methods: {
    onBack() { wx.navigateBack() },

    onToggleMode() {
      const mode = this.data.mode === 'hex' ? 'rgb' : 'hex'
      // 切换时把当前值转换为新格式
      let newInput = ''
      if (mode === 'rgb') {
        newInput = this.data.rgb  // 已经是 "r, g, b" 格式
      } else {
        newInput = this.data.hexVal
      }
      this.setData({ mode, inputValue: newInput })
    },

    onInput(e) {
      const val = e.detail.value
      this.setData({ inputValue: val })
      this._process(val)
    },

    _process(raw) {
      const result = parseInput(raw, this.data.mode)
      if (!result) {
        this.setData({ valid: false })
        return
      }
      const { r, g, b, hex } = result
      const hsl = rgbToHsl(r, g, b)
      const variants = getVariants(hex)
      this.setData({
        valid: true,
        previewColor: hex,
        hexVal: hex,
        rgb: `${r}, ${g}, ${b}`,
        hsl: `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`,
        decimal: rgbToDecimal(r, g, b),
        binary: rgbToBinary(r, g, b),
        variants,
      })
    },

    onCopyHex() { this._copy(this.data.hexVal) },
    onCopyRgb() { this._copy(this.data.rgb) },
    onCopyHsl() { this._copy(this.data.hsl) },
    onCopyBinary() { this._copy(this.data.binary) },
    onCopyDecimal() { this._copy(this.data.decimal) },

    _copy(val) {
      wx.setClipboardData({ data: val, success: () => wx.showToast({ title: '已复制', icon: 'success' }) })
    },

    onVariantTap(e) {
      const hex = e.currentTarget.dataset.hex
      this.setData({ inputValue: hex, mode: 'hex' }, () => this._process(hex))
    },
  },
})
