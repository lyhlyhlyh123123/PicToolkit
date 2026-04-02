// pages/tools/calc/unit/index.js

/**
 * 多维单位换算
 * 类别：长度、重量、面积、温度
 */
const CATEGORIES = [
  { id: 'length', label: '长度' },
  { id: 'weight', label: '重量' },
  { id: 'area',   label: '面积' },
  { id: 'temp',   label: '温度' },
]

// 每个单位的 toBase 函数将该单位转为基准单位，fromBase 从基准单位转出
// 长度基准：米(m)；重量基准：千克(kg)；面积基准：平方米(m²)；温度基准：摄氏度(°C)
const UNITS = {
  length: [
    { id: 'mm',   label: '毫米 (mm)',   short: 'MM',   toBase: v => v / 1000,        fromBase: v => v * 1000        },
    { id: 'cm',   label: '厘米 (cm)',   short: 'CM',   toBase: v => v / 100,         fromBase: v => v * 100         },
    { id: 'm',    label: '米 (m)',      short: 'M',    toBase: v => v,               fromBase: v => v               },
    { id: 'km',   label: '千米 (km)',   short: 'KM',   toBase: v => v * 1000,        fromBase: v => v / 1000        },
    { id: 'in',   label: '英寸 (in)',   short: 'IN',   toBase: v => v * 0.0254,      fromBase: v => v / 0.0254      },
    { id: 'ft',   label: '英尺 (ft)',   short: 'FT',   toBase: v => v * 0.3048,      fromBase: v => v / 0.3048      },
    { id: 'yd',   label: '码 (yd)',     short: 'YD',   toBase: v => v * 0.9144,      fromBase: v => v / 0.9144      },
    { id: 'mile', label: '英里 (mi)',   short: 'MILE', toBase: v => v * 1609.344,    fromBase: v => v / 1609.344    },
  ],
  weight: [
    { id: 'mg',  label: '毫克 (mg)',  short: 'MG',  toBase: v => v / 1e6,    fromBase: v => v * 1e6    },
    { id: 'g',   label: '克 (g)',     short: 'G',   toBase: v => v / 1000,   fromBase: v => v * 1000   },
    { id: 'kg',  label: '千克 (kg)',  short: 'KG',  toBase: v => v,          fromBase: v => v          },
    { id: 't',   label: '吨 (t)',     short: 'T',   toBase: v => v * 1000,   fromBase: v => v / 1000   },
    { id: 'jin', label: '斤',         short: '斤',  toBase: v => v * 0.5,    fromBase: v => v / 0.5    },
    { id: 'oz',  label: '盎司 (oz)',  short: 'OZ',  toBase: v => v * 0.02835,fromBase: v => v / 0.02835},
    { id: 'lb',  label: '磅 (lb)',    short: 'LB',  toBase: v => v * 0.4536, fromBase: v => v / 0.4536 },
  ],
  area: [
    { id: 'mm2', label: '平方毫米',   short: 'MM²',  toBase: v => v / 1e6,       fromBase: v => v * 1e6       },
    { id: 'cm2', label: '平方厘米',   short: 'CM²',  toBase: v => v / 1e4,       fromBase: v => v * 1e4       },
    { id: 'm2',  label: '平方米',     short: 'M²',   toBase: v => v,             fromBase: v => v             },
    { id: 'km2', label: '平方千米',   short: 'KM²',  toBase: v => v * 1e6,       fromBase: v => v / 1e6       },
    { id: 'mu',  label: '亩',         short: '亩',   toBase: v => v * 666.667,   fromBase: v => v / 666.667   },
    { id: 'ha',  label: '公顷 (ha)',  short: 'HA',   toBase: v => v * 10000,     fromBase: v => v / 10000     },
    { id: 'ft2', label: '平方英尺',   short: 'FT²',  toBase: v => v * 0.092903,  fromBase: v => v / 0.092903  },
    { id: 'ac',  label: '英亩 (ac)',  short: 'AC',   toBase: v => v * 4046.856,  fromBase: v => v / 4046.856  },
  ],
  temp: [
    { id: 'c',  label: '摄氏度 (°C)', short: '°C',  toBase: v => v,                fromBase: v => v                },
    { id: 'f',  label: '华氏度 (°F)', short: '°F',  toBase: v => (v - 32) * 5/9,  fromBase: v => v * 9/5 + 32    },
    { id: 'k',  label: '开尔文 (K)',  short: 'K',   toBase: v => v - 273.15,       fromBase: v => v + 273.15       },
  ],
}

function formatNum(n) {
  if (!isFinite(n)) return '—'
  // 有效数字6位
  const s = parseFloat(n.toPrecision(6))
  return String(s)
}

Component({
  data: {
    categories: CATEGORIES,
    catIndex: 0,       // 当前类别下标
    fromIndex: 0,      // 源单位下标（在当前类别中）
    toIndex: 1,        // 目标单位下标
    inputValue: '1',
    outputValue: '',
    units: [],         // 当前类别的单位列表（用于 picker）
    fromLabel: '',
    toLabel: '',
    gridResults: [],   // 常用单位实时输出
    fromPickerShow: false,
    toPickerShow: false,
  },

  lifetimes: {
    ready() {
      this._initCategory(0)
    },
  },

  methods: {
    onBack() { wx.navigateBack() },

    _initCategory(catIndex) {
      const catId = CATEGORIES[catIndex].id
      const units = UNITS[catId]
      // 温度默认 °C → °F，其他默认 0→1
      const fromIndex = 0
      const toIndex = catId === 'temp' ? 1 : 1
      this.setData({
        catIndex,
        units: units.map(u => u.label),
        fromIndex,
        toIndex,
        fromLabel: units[fromIndex].label,
        toLabel: units[toIndex].label,
      }, () => this._calculate())
    },

    onCatTap(e) {
      const idx = e.currentTarget.dataset.index
      if (idx === this.data.catIndex) return
      this.setData({ inputValue: '1' }, () => this._initCategory(idx))
    },

    onFromPickerChange(e) {
      const fromIndex = Number(e.detail.value)
      const catId = CATEGORIES[this.data.catIndex].id
      this.setData({
        fromIndex,
        fromLabel: UNITS[catId][fromIndex].label,
      }, () => this._calculate())
    },

    onToPickerChange(e) {
      const toIndex = Number(e.detail.value)
      const catId = CATEGORIES[this.data.catIndex].id
      this.setData({
        toIndex,
        toLabel: UNITS[catId][toIndex].label,
      }, () => this._calculate())
    },

    onSwap() {
      const { fromIndex, toIndex } = this.data
      const catId = CATEGORIES[this.data.catIndex].id
      // 把当前输出值变为新的输入值
      const newInput = this.data.outputValue || '1'
      this.setData({
        fromIndex: toIndex,
        toIndex: fromIndex,
        fromLabel: UNITS[catId][toIndex].label,
        toLabel: UNITS[catId][fromIndex].label,
        inputValue: newInput,
      }, () => this._calculate())
    },

    onInput(e) {
      const val = e.detail.value.replace(/[^\d.\-]/g, '')
      this.setData({ inputValue: val }, () => this._calculate())
    },

    _calculate() {
      const { catIndex, fromIndex, toIndex, inputValue } = this.data
      const catId = CATEGORIES[catIndex].id
      const units = UNITS[catId]
      const num = parseFloat(inputValue)

      if (isNaN(num)) {
        this.setData({ outputValue: '', gridResults: [] })
        return
      }

      const baseVal = units[fromIndex].toBase(num)
      const result = units[toIndex].fromBase(baseVal)
      const outputValue = formatNum(result)

      // 常用单位网格（最多6个，排除当前 fromIndex）
      const gridResults = units
        .filter((_, i) => i !== fromIndex)
        .slice(0, 6)
        .map(u => ({
          short: u.short,
          label: u.label.split(' ')[0],
          value: formatNum(u.fromBase(baseVal)),
        }))

      this.setData({ outputValue, gridResults })
    },
  },
})
