// pages/tools/text/cleanup/index.js

/**
 * 执行文本清理
 */
function applyCleanup(text, opts) {
  let result = text

  // 去除行首缩进：删除每行开头的空格/制表符
  if (opts.trimIndent) {
    result = result.split('\n').map(l => l.trimStart()).join('\n')
  }

  // 删除空行：过滤掉全为空白的行
  if (opts.removeEmptyLines) {
    result = result.split('\n').filter(l => l.trim() !== '').join('\n')
  }

  // 合并多余空格：将行内连续空格（含全角空格）压缩为单个半角空格
  // 注意：仅处理行内部，不影响行首（行首由 trimIndent 控制）
  if (opts.removeSpaces) {
    result = result.split('\n').map(l => l.replace(/[ \t　]{2,}/g, ' ')).join('\n')
  }

  // 中英文加空格：在中文与英文/数字之间自动插入空格
  if (opts.addCjkSpaces) {
    const CJK = '[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u2E80-\u2EFF\u3000-\u303F]'
    const cjkRe1 = new RegExp(`(${CJK})([A-Za-z0-9])`, 'g')
    const cjkRe2 = new RegExp(`([A-Za-z0-9])(${CJK})`, 'g')
    result = result.replace(cjkRe1, '$1 $2')
    result = result.replace(cjkRe2, '$1 $2')
  }

  return result
}

Component({
  data: {
    sourceText: '',
    trimIndent: true,
    removeEmptyLines: true,
    removeSpaces: false,
    addCjkSpaces: true,
    charCount: 0,
    lineCount: 0,
    processing: false,
  },

  methods: {
    onBack() { wx.navigateBack() },

    onInput(e) {
      const text = e.detail.value
      this.setData({
        sourceText: text,
        charCount: text.length,
        lineCount: text ? text.split('\n').length : 0,
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
          })
        },
        fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' }),
      })
    },

    onClear() {
      this.setData({ sourceText: '', charCount: 0, lineCount: 0 })
    },

    onToggleTrimIndent() {
      this.setData({ trimIndent: !this.data.trimIndent })
    },
    onToggleRemoveEmptyLines() {
      this.setData({ removeEmptyLines: !this.data.removeEmptyLines })
    },
    onToggleRemoveSpaces() {
      this.setData({ removeSpaces: !this.data.removeSpaces })
    },
    onToggleAddCjkSpaces() {
      this.setData({ addCjkSpaces: !this.data.addCjkSpaces })
    },

    onRun() {
      if (!this.data.sourceText) {
        wx.showToast({ title: '请先输入文本', icon: 'none' }); return
      }
      const { sourceText, trimIndent, removeEmptyLines, removeSpaces, addCjkSpaces } = this.data
      const result = applyCleanup(sourceText, { trimIndent, removeEmptyLines, removeSpaces, addCjkSpaces })
      this.setData({
        sourceText: result,
        charCount: result.length,
        lineCount: result ? result.split('\n').length : 0,
      })
      wx.setClipboardData({
        data: result,
        success: () => wx.showToast({ title: '排版完成', icon: 'success' }),
      })
    },
  },
})
