// pages/tools/text/counter/index.js

/**
 * 统计函数：返回所有维度数据
 */
function countText(text) {
  if (!text) return {
    total: 0, chinese: 0, english: 0, punctuation: 0,
    spaces: 0, paragraphs: 0, readMin: 0, speakMin: 0,
  }

  const total = text.length

  // 中文字符（CJK统一汉字）
  const chineseMatch = text.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g)
  const chinese = chineseMatch ? chineseMatch.length : 0

  // 英文单词数
  const englishMatch = text.match(/\b[a-zA-Z]+\b/g)
  const english = englishMatch ? englishMatch.length : 0

  // 标点符号（中英文标点）
  const punctMatch = text.match(/[，。！？；：""''（）【】《》、,.!?;:'"()\[\]{}<>]/g)
  const punctuation = punctMatch ? punctMatch.length : 0

  // 空格
  const spaceMatch = text.match(/\s/g)
  const spaces = spaceMatch ? spaceMatch.length : 0

  // 段落数（非空行）
  const paragraphs = text.split('\n').filter(l => l.trim().length > 0).length

  // 预估阅读时间（中文 300字/分 + 英文 200词/分）
  const readMin = Math.max(1, Math.round((chinese / 300) + (english / 200)))

  // 预估演讲时间（中文 150字/分 + 英文 130词/分）
  const speakMin = Math.max(1, Math.round((chinese / 150) + (english / 130)))

  return { total, chinese, english, punctuation, spaces, paragraphs, readMin, speakMin }
}

Component({
  data: {
    sourceText: '',
    total: 0,
    chinese: 0,
    english: 0,
    punctuation: 0,
    spaces: 0,
    paragraphs: 0,
    readMin: 0,
    speakMin: 0,
    hasText: false,
    // 格式化总字符（加千分位）
    totalFormatted: '0',
  },

  methods: {
    onBack() { wx.navigateBack() },

    onInput(e) {
      const text = e.detail.value
      this._updateStats(text)
    },

    _updateStats(text) {
      const stats = countText(text)
      const totalFormatted = stats.total.toLocaleString()
      this.setData({
        sourceText: text,
        ...stats,
        totalFormatted,
        hasText: text.length > 0,
      })
    },

    onClear() {
      this.setData({
        sourceText: '',
        total: 0, chinese: 0, english: 0, punctuation: 0,
        spaces: 0, paragraphs: 0, readMin: 0, speakMin: 0,
        hasText: false, totalFormatted: '0',
      })
    },

    onPaste() {
      wx.getClipboardData({
        success: (res) => {
          if (!res.data) { wx.showToast({ title: '剪贴板为空', icon: 'none' }); return }
          this._updateStats(res.data)
        },
        fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' }),
      })
    },

    onCopyAll() {
      if (!this.data.sourceText) return
      wx.setClipboardData({
        data: this.data.sourceText,
        success: () => wx.showToast({ title: '已复制', icon: 'success' }),
      })
    },

    onShare() {
      const { total, chinese, english, punctuation, paragraphs, readMin, speakMin } = this.data
      const result = `字数统计结果：\n总字符：${total}\n中文字数：${chinese}\n英文字词：${english}\n标点符号：${punctuation}\n段落数：${paragraphs}\n预估阅读：约${readMin}分钟\n预估演讲：约${speakMin}分钟`
      wx.setClipboardData({
        data: result,
        success: () => wx.showToast({ title: '统计结果已复制', icon: 'success' }),
      })
    },
  },
})
