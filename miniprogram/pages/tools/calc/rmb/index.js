// pages/tools/calc/rmb/index.js

/**
 * 人民币大写转换（双向）
 * 遵循中国财务规范（GB/T 15834）
 */

/* ───── 数字 → 大写 ───── */
const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const UNITS  = ['', '拾', '佰', '仟']

function sectionToChinese(section) {
  let result = ''
  let zero = false
  for (let i = 3; i >= 0; i--) {
    const d = Math.floor(section / Math.pow(10, i)) % 10
    if (d === 0) {
      zero = true
    } else {
      if (zero && result !== '') result += '零'
      result += DIGITS[d] + UNITS[i]
      zero = false
    }
  }
  return result
}

function numberToRMB(numStr) {
  if (!numStr || numStr === '' || isNaN(Number(numStr))) return ''
  const num = Math.round(Number(numStr) * 100)

  if (num === 0) return '零元整'
  if (num < 0) return '负' + numberToRMB(String(-Number(numStr)))

  const jiao = Math.floor(num / 10) % 10
  const fen  = num % 10
  const yuan = Math.floor(num / 100)

  let intStr = ''
  if (yuan > 0) {
    const yi  = Math.floor(yuan / 100000000)
    const wan = Math.floor(yuan / 10000) % 10000
    const ge  = yuan % 10000

    if (yi > 0) {
      intStr += sectionToChinese(yi) + '亿'
      if (wan < 1000 && wan > 0) intStr += '零'
    }
    if (wan > 0) {
      intStr += sectionToChinese(wan) + '万'
      if (ge < 1000 && ge > 0) intStr += '零'
    }
    if (ge > 0) intStr += sectionToChinese(ge)
    intStr += '元'
  }

  let decStr = ''
  if (jiao === 0 && fen === 0) {
    decStr = '整'
  } else if (jiao === 0) {
    decStr = (yuan > 0 ? '零' : '') + DIGITS[fen] + '分'
  } else if (fen === 0) {
    decStr = DIGITS[jiao] + '角整'
  } else {
    decStr = DIGITS[jiao] + '角' + DIGITS[fen] + '分'
  }

  return intStr + decStr
}

/* ───── 大写 → 数字 ───── */
const DIGIT_MAP = { '零':0,'壹':1,'贰':2,'叁':3,'肆':4,'伍':5,'陆':6,'柒':7,'捌':8,'玖':9,
                    '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9 }

function rmbToNumber(str) {
  if (!str) return ''
  let s = str.trim()
  // 去掉末尾"整"
  s = s.replace(/整$/, '')

  let negative = false
  if (s.startsWith('负')) { negative = true; s = s.slice(1) }

  // 分离元前（整数）和角、分
  let intPart = 0
  let decPart = 0

  // 提取角、分
  const fenMatch = s.match(/([壹贰叁肆伍陆柒捌玖一二三四五六七八九])分$/)
  if (fenMatch) {
    decPart += DIGIT_MAP[fenMatch[1]] * 0.01
    s = s.slice(0, s.length - 2)
  }
  const jiaoMatch = s.match(/([壹贰叁肆伍陆柒捌玖一二三四五六七八九零])角$/)
  if (jiaoMatch && jiaoMatch[1] !== '零') {
    decPart += DIGIT_MAP[jiaoMatch[1]] * 0.1
    s = s.slice(0, s.length - 2)
  } else if (jiaoMatch && jiaoMatch[1] === '零') {
    s = s.slice(0, s.length - 2)
  }

  // 去掉"元"
  s = s.replace(/元$/, '')
  if (!s) return negative ? String(-decPart) : String(decPart || '')

  // 解析整数大写部分
  // 按亿、万分段
  let yiPart = 0, wanPart = 0, gePart = 0

  const yiIdx = s.indexOf('亿')
  if (yiIdx !== -1) {
    yiPart = parseSection(s.slice(0, yiIdx))
    s = s.slice(yiIdx + 1)
  }
  const wanIdx = s.indexOf('万')
  if (wanIdx !== -1) {
    wanPart = parseSection(s.slice(0, wanIdx))
    s = s.slice(wanIdx + 1)
  }
  // 去掉多余的"零"前缀
  s = s.replace(/^零+/, '')
  if (s) gePart = parseSection(s)

  intPart = yiPart * 100000000 + wanPart * 10000 + gePart

  const total = intPart + decPart
  if (isNaN(total)) return ''

  // 格式化：有小数时保留两位
  let result
  if (decPart > 0) {
    result = total.toFixed(2).replace(/\.?0+$/, '')
    // 确保至多两位小数
    const dotIdx = result.indexOf('.')
    if (dotIdx !== -1 && result.length - dotIdx - 1 > 2) {
      result = result.slice(0, dotIdx + 3)
    }
  } else {
    result = String(intPart)
  }

  return negative ? '-' + result : result
}

// 解析四位段中文数字（0~9999）
function parseSection(s) {
  if (!s) return 0
  let val = 0
  const unitVal = { '仟': 1000, '佰': 100, '拾': 10, '十': 10 }
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (DIGIT_MAP[ch] !== undefined) {
      const dv = DIGIT_MAP[ch]
      // 看下一个字符是否是单位
      const next = s[i + 1]
      if (next && unitVal[next] !== undefined) {
        val += dv * unitVal[next]
        i += 2
      } else {
        // 末位个位数字
        val += dv
        i++
      }
    } else if (unitVal[ch] !== undefined) {
      // 拾 出现在开头（如"拾伍"= 15）
      val += unitVal[ch]
      i++
    } else {
      // 零等忽略
      i++
    }
  }
  return val
}

Component({
  data: {
    mode: 'toRMB',      // 'toRMB' | 'toNum'
    inputValue: '',
    result: '',
    hasResult: false,
  },

  methods: {
    onBack() { wx.navigateBack() },

    onSwitchMode() {
      // 切换时将当前结果填入输入框
      const { mode, result, inputValue } = this.data
      const newMode = mode === 'toRMB' ? 'toNum' : 'toRMB'
      const newInput = this.data.hasResult ? result : ''
      this.setData({ mode: newMode, inputValue: newInput, result: '', hasResult: false }, () => {
        if (newInput) this._convert(newInput)
      })
    },

    onInput(e) {
      const val = e.detail.value
      this._convert(val)
    },

    _convert(val) {
      if (this.data.mode === 'toRMB') {
        // 只允许数字和一个小数点，最多两位小数
        let clean = val.replace(/[^\d.]/g, '')
        const parts = clean.split('.')
        if (parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('')
        if (parts[1] && parts[1].length > 2) clean = parts[0] + '.' + parts[1].slice(0, 2)
        const result = numberToRMB(clean)
        this.setData({ inputValue: clean, result, hasResult: result !== '' })
      } else {
        const result = rmbToNumber(val)
        this.setData({ inputValue: val, result, hasResult: result !== '' })
      }
    },

    onClear() {
      this.setData({ inputValue: '', result: '', hasResult: false })
    },

    onCopy() {
      if (!this.data.result) return
      wx.setClipboardData({
        data: this.data.result,
        success: () => wx.showToast({ title: '已复制', icon: 'success' }),
      })
    },
  },
})
