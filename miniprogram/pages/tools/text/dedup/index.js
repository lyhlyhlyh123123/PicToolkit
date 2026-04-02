// pages/tools/text/dedup/index.js

/**
 * 执行去重
 * opts:
 *   caseSensitive  - 区分大小写（默认 false）
 *   trimWhitespace - 忽略首尾空格后再比较（默认 true）；不修改原始行内容
 *   keepEmpty      - 保留空行，空行不参与去重直接保留（默认 true）
 */
function applyDedup(text, opts) {
  const lines = text.split('\n')

  // 生成用于比较的 key，不修改原始行
  const getKey = (line) => {
    let s = opts.trimWhitespace ? line.trim() : line
    if (!opts.caseSensitive) s = s.toLowerCase()
    return s
  }

  const seen = new Set()
  const result = []
  let removedCount = 0

  for (const line of lines) {
    const isBlank = line.trim() === ''

    // 保留空行：空行不参与去重，直接保留原样
    if (opts.keepEmpty && isBlank) {
      result.push(line)
      continue
    }

    const key = getKey(line)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(line)
    } else {
      removedCount++
    }
  }

  return { text: result.join('\n'), removedCount }
}

Component({
  data: {
    sourceText: '',
    caseSensitive: false,
    trimWhitespace: true,
    keepEmpty: true,
    charCount: 0,
    lineCount: 0,
    removedCount: 0,
    hasResult: false,
  },

  methods: {
    onBack() { wx.navigateBack() },

    onInput(e) {
      const text = e.detail.value
      this.setData({
        sourceText: text,
        charCount: text.length,
        lineCount: text ? text.split('\n').length : 0,
        hasResult: false,
        removedCount: 0,
      })
    },

    onPaste() {
      wx.getClipboardData({
        success: (res) => {
          if (!res.data) { wx.showToast({ title: '剪贴板为空', icon: 'none' }); return }
          const text = res.data
          this.setData({
            sourceText: text,
            charCount: text.length,
            lineCount: text.split('\n').length,
            hasResult: false,
            removedCount: 0,
          })
        },
        fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' }),
      })
    },

    onClear() {
      this.setData({
        sourceText: '',
        charCount: 0,
        lineCount: 0,
        hasResult: false,
        removedCount: 0,
      })
    },

    onToggleCaseSensitive() {
      this.setData({ caseSensitive: !this.data.caseSensitive })
    },
    onToggleTrimWhitespace() {
      this.setData({ trimWhitespace: !this.data.trimWhitespace })
    },
    onToggleKeepEmpty() {
      this.setData({ keepEmpty: !this.data.keepEmpty })
    },

    onRun() {
      if (!this.data.sourceText) {
        wx.showToast({ title: '请先输入文本', icon: 'none' }); return
      }
      const { sourceText, caseSensitive, trimWhitespace, keepEmpty } = this.data
      const { text: result, removedCount } = applyDedup(sourceText, { caseSensitive, trimWhitespace, keepEmpty })
      this.setData({
        sourceText: result,
        charCount: result.length,
        lineCount: result ? result.split('\n').length : 0,
        removedCount,
        hasResult: true,
      })
      wx.setClipboardData({
        data: result,
        success: () => {
          const msg = removedCount > 0 ? `去重完成，已删除 ${removedCount} 行` : '没有重复行'
          wx.showToast({ title: msg, icon: removedCount > 0 ? 'success' : 'none' })
        },
      })
    },
  },
})
