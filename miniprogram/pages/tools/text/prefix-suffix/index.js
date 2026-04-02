// pages/tools/text/prefix-suffix/index.js

/**
 * 批量添加前缀/后缀
 * - 每行独立处理
 * - 支持忽略空行（不对空行添加）
 * - 实时预览前3行
 */
function applyPrefixSuffix(text, prefix, suffix, skipEmpty) {
  const lines = text.split('\n')
  const result = lines.map(line => {
    if (skipEmpty && line.trim() === '') return line
    return prefix + line + suffix
  })
  return result.join('\n')
}

Component({
  data: {
    sourceText: '',
    prefix: '',
    suffix: '',
    skipEmpty: true,
    charCount: 0,
    lineCount: 0,
  },

  methods: {
    onBack() { wx.navigateBack() },

    onInput(e) {
      const text = e.detail.value
      this.setData({
        sourceText: text,
        charCount: text.length,
        lineCount: text ? text.split('\n').length : 0,
      }, () => this._updatePreview())
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
          }, () => this._updatePreview())
        },
        fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' }),
      })
    },

    onClearText() {
      this.setData({
        sourceText: '',
        charCount: 0,
        lineCount: 0,
        previewLines: [],
        hasPreview: false,
      })
    },

    onPrefixInput(e) {
      this.setData({ prefix: e.detail.value }, () => this._updatePreview())
    },

    onSuffixInput(e) {
      this.setData({ suffix: e.detail.value }, () => this._updatePreview())
    },

    onToggleSkipEmpty() {
      this.setData({ skipEmpty: !this.data.skipEmpty }, () => this._updatePreview())
    },

    _updatePreview() {
      const { sourceText, prefix, suffix, skipEmpty } = this.data
      if (!sourceText) {
        this.setData({ previewLines: [], hasPreview: false })
        return
      }
      // 只预览前3行
      const lines = sourceText.split('\n').slice(0, 3)
      const previewLines = lines.map((line, i) => {
        const processed = (skipEmpty && line.trim() === '') ? line : prefix + line + suffix
        return { index: i + 1, text: processed }
      })
      this.setData({ previewLines, hasPreview: true })
    },

    onRun() {
      const { sourceText, prefix, suffix, skipEmpty } = this.data
      if (!sourceText) {
        wx.showToast({ title: '请先输入文本', icon: 'none' }); return
      }
      if (!prefix && !suffix) {
        wx.showToast({ title: '请设置前缀或后缀', icon: 'none' }); return
      }
      const result = applyPrefixSuffix(sourceText, prefix, suffix, skipEmpty)
      this.setData({
        sourceText: result,
        charCount: result.length,
        lineCount: result.split('\n').length,
      }, () => this._updatePreview())
      wx.setClipboardData({
        data: result,
        success: () => wx.showToast({ title: '已完成并复制', icon: 'success' }),
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
  },
})
