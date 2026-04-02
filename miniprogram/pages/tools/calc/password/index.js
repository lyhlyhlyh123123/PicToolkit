// pages/tools/calc/password/index.js

const CHARS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  digits:  '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

/**
 * 生成密码
 * 确保每种选中的字符集至少出现一次，剩余位随机填充
 */
function generatePassword(length, opts) {
  const pools = []
  if (opts.upper)   pools.push(CHARS.upper)
  if (opts.lower)   pools.push(CHARS.lower)
  if (opts.digits)  pools.push(CHARS.digits)
  if (opts.special) pools.push(CHARS.special)

  if (pools.length === 0) return ''

  const allChars = pools.join('')
  const arr = []

  // 每个字符集至少取一个
  for (const pool of pools) {
    arr.push(pool[Math.floor(Math.random() * pool.length)])
  }

  // 剩余位从全集随机取
  for (let i = arr.length; i < length; i++) {
    arr.push(allChars[Math.floor(Math.random() * allChars.length)])
  }

  // Fisher-Yates 洗牌
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }

  return arr.join('')
}

Component({
  data: {
    password: '',
    upper: true,
    lower: true,
    digits: true,
    special: true,
    length: 12,
  },

  lifetimes: {
    ready() {
      this._generate()
    },
  },

  methods: {
    onBack() { wx.navigateBack() },

    _generate() {
      const { upper, lower, digits, special, length } = this.data
      const pwd = generatePassword(length, { upper, lower, digits, special })
      this.setData({ password: pwd })
    },

    onRefresh() {
      this._generate()
    },

    onCopy() {
      if (!this.data.password) return
      wx.setClipboardData({
        data: this.data.password,
        success: () => wx.showToast({ title: '已复制', icon: 'success' }),
      })
    },

    onToggleUpper()   { this.setData({ upper:   !this.data.upper },   () => this._safeGenerate()) },
    onToggleLower()   { this.setData({ lower:   !this.data.lower },   () => this._safeGenerate()) },
    onToggleDigits()  { this.setData({ digits:  !this.data.digits },  () => this._safeGenerate()) },
    onToggleSpecial() { this.setData({ special: !this.data.special }, () => this._safeGenerate()) },

    // 至少保留一种字符集才生成
    _safeGenerate() {
      const { upper, lower, digits, special } = this.data
      if (!upper && !lower && !digits && !special) {
        wx.showToast({ title: '至少选择一种字符', icon: 'none' })
        return
      }
      this._generate()
    },

    onLengthChange(e) {
      const length = Number(e.detail.value)
      this.setData({ length }, () => this._generate())
    },
  },
})
