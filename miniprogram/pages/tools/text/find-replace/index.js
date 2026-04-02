// pages/tools/text/find/index.js

/**
 * 在文本中查找所有匹配，返回高亮分段
 * segments: [{text, highlight}]
 */
function findMatches(text, keyword, caseSensitive, wholeWord, useRegex) {
  if (!text || !keyword) return { segments: [{ text, highlight: false }], count: 0 }

  let pattern
  try {
    let src = useRegex ? keyword : keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (wholeWord) src = `\\b${src}\\b`
    const flags = caseSensitive ? 'g' : 'gi'
    pattern = new RegExp(src, flags)
  } catch (e) {
    return { segments: [{ text, highlight: false }], count: 0, error: '正则表达式无效' }
  }

  const segments = []
  let count = 0
  let lastIdx = 0
  let m

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) {
      segments.push({ text: text.slice(lastIdx, m.index), highlight: false })
    }
    segments.push({ text: m[0], highlight: true })
    count++
    lastIdx = pattern.lastIndex
    if (m[0].length === 0) pattern.lastIndex++
  }
  if (lastIdx < text.length) {
    segments.push({ text: text.slice(lastIdx), highlight: false })
  }
  if (segments.length === 0) segments.push({ text, highlight: false })

  return { segments, count }
}

/**
 * 执行替换，返回新文本
 */
function doReplace(text, keyword, replacement, caseSensitive, wholeWord, useRegex) {
  if (!text || !keyword) return text
  let pattern
  try {
    let src = useRegex ? keyword : keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (wholeWord) src = `\\b${src}\\b`
    const flags = caseSensitive ? 'g' : 'gi'
    pattern = new RegExp(src, flags)
  } catch (e) {
    return text
  }
  return text.replace(pattern, replacement)
}

Component({
  data: {
    sourceText: '',
    keyword: '',
    replacement: '',
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    // 预览高亮分段
    previewSegments: [],
    matchCount: 0,
    regexError: '',
    charCount: 0,
    lineCount: 0,
    // history
    history: [],
  },

  lifetimes: {
    attached() {
      const draft = wx.getStorageSync('find_draft') || {}
      if (draft.sourceText) {
        const charCount = draft.sourceText.length
        const lineCount = draft.sourceText.split('\n').length
        this.setData({
          sourceText: draft.sourceText,
          charCount,
          lineCount,
        })
      }
    }
  },

  methods: {
    onBack() { wx.navigateBack() },

    onSourceInput(e) {
      const text = e.detail.value
      const charCount = text.length
      const lineCount = text ? text.split('\n').length : 0
      this.setData({ sourceText: text, charCount, lineCount })
      this._saveDraft()
      this._updatePreview(text, this.data.keyword)
    },

    onKeywordInput(e) {
      const keyword = e.detail.value
      this.setData({ keyword })
      this._updatePreview(this.data.sourceText, keyword)
    },

    onReplacementInput(e) {
      this.setData({ replacement: e.detail.value })
    },

    onToggleCaseSensitive() {
      const val = !this.data.caseSensitive
      this.setData({ caseSensitive: val }, () => {
        this._updatePreview(this.data.sourceText, this.data.keyword)
      })
    },

    onToggleWholeWord() {
      const val = !this.data.wholeWord
      this.setData({ wholeWord: val }, () => {
        this._updatePreview(this.data.sourceText, this.data.keyword)
      })
    },

    onToggleRegex() {
      const val = !this.data.useRegex
      this.setData({ useRegex: val }, () => {
        this._updatePreview(this.data.sourceText, this.data.keyword)
      })
    },

    _updatePreview(text, keyword) {
      const { caseSensitive, wholeWord, useRegex } = this.data
      const { segments, count, error } = findMatches(text, keyword, caseSensitive, wholeWord, useRegex)
      this.setData({
        previewSegments: segments,
        matchCount: count,
        regexError: error || '',
      })
    },

    onReplaceAll() {
      const { sourceText, keyword, replacement, caseSensitive, wholeWord, useRegex, matchCount } = this.data
      if (!sourceText) {
        wx.showToast({ title: '请先输入源文本', icon: 'none' }); return
      }
      if (!keyword) {
        wx.showToast({ title: '请输入查找内容', icon: 'none' }); return
      }
      if (matchCount === 0) {
        wx.showToast({ title: '未找到匹配项', icon: 'none' }); return
      }

      // 保存到历史
      const history = [{ text: sourceText, time: Date.now() }, ...this.data.history].slice(0, 5)

      const newText = doReplace(sourceText, keyword, replacement, caseSensitive, wholeWord, useRegex)
      const charCount = newText.length
      const lineCount = newText ? newText.split('\n').length : 0
      this.setData({ sourceText: newText, charCount, lineCount, history }, () => {
        this._updatePreview(newText, keyword)
        this._saveDraft()
        wx.showToast({ title: `已替换 ${matchCount} 处`, icon: 'success' })
      })
    },

    onPaste() {
      wx.getClipboardData({
        success: (res) => {
          if (!res.data) { wx.showToast({ title: '剪贴板为空', icon: 'none' }); return }
          const text = res.data
          const charCount = text.length
          const lineCount = text.split('\n').length
          this.setData({ sourceText: text, charCount, lineCount })
          this._updatePreview(text, this.data.keyword)
          this._saveDraft()
        },
        fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' }),
      })
    },

    onCopyResult() {
      const { sourceText } = this.data
      if (!sourceText) return
      wx.setClipboardData({
        data: sourceText,
        success: () => wx.showToast({ title: '已复制', icon: 'success' }),
      })
    },

    onShowHistory() {
      const { history } = this.data
      if (!history.length) { wx.showToast({ title: '暂无历史', icon: 'none' }); return }
      const items = history.map((h, i) => {
        const d = new Date(h.time)
        const timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
        return `${i + 1}. [${timeStr}] ${h.text.slice(0, 20)}${h.text.length > 20 ? '...' : ''}`
      })
      wx.showActionSheet({
        itemList: items,
        success: (r) => {
          const h = history[r.tapIndex]
          const charCount = h.text.length
          const lineCount = h.text.split('\n').length
          this.setData({ sourceText: h.text, charCount, lineCount }, () => {
            this._updatePreview(h.text, this.data.keyword)
          })
        }
      })
    },

    _saveDraft() {
      wx.setStorageSync('find_draft', { sourceText: this.data.sourceText })
    },
  },
})
