// pages/tools/text/diff/index.js

/**
 * 最长公共子序列（LCS）用于行级 diff
 */
function lcs(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  // Backtrack
  const result = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'equal', text: a[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', text: b[j - 1] })
      j--
    } else {
      result.unshift({ type: 'del', text: a[i - 1] })
      i--
    }
  }
  return result
}

/**
 * 字符级 diff，返回 segments 数组
 */
function charDiff(lineA, lineB) {
  const charsA = lineA.split('')
  const charsB = lineB.split('')
  const ops = lcs(charsA, charsB)
  // Merge consecutive same-type segments
  const segments = []
  for (const op of ops) {
    if (segments.length && segments[segments.length - 1].type === op.type) {
      segments[segments.length - 1].text += op.text
    } else {
      segments.push({ type: op.type, text: op.text })
    }
  }
  return segments
}

/**
 * 主 diff 函数：行级 + 字符级
 * 返回 { lines: [{segments}], count }
 */
function computeDiff(textA, textB) {
  if (!textA && !textB) return { lines: [], count: 0 }

  const linesA = textA.split('\n')
  const linesB = textB.split('\n')
  const lineOps = lcs(linesA, linesB)

  const resultLines = []
  let diffCount = 0

  // Group consecutive del+add for inline diff
  let i = 0
  while (i < lineOps.length) {
    const op = lineOps[i]
    if (op.type === 'equal') {
      resultLines.push({ segments: [{ type: 'equal', text: op.text }] })
      i++
    } else if (op.type === 'del' && i + 1 < lineOps.length && lineOps[i + 1].type === 'add') {
      // Paired del+add: inline char diff
      const segs = charDiff(op.text, lineOps[i + 1].text)
      const hasDiff = segs.some(s => s.type !== 'equal')
      if (hasDiff) diffCount++
      resultLines.push({ segments: segs })
      i += 2
    } else if (op.type === 'del') {
      resultLines.push({ segments: [{ type: 'del', text: op.text }] })
      diffCount++
      i++
    } else {
      resultLines.push({ segments: [{ type: 'add', text: op.text }] })
      diffCount++
      i++
    }
  }

  return { lines: resultLines, count: diffCount }
}

Component({
  data: {
    textA: '',
    textB: '',
    diffLines: [],
    diffCount: 0,
    hasDiff: false,
  },

  lifetimes: {
    attached() {
      // 恢复草稿
      const draft = wx.getStorageSync('diff_draft') || {}
      if (draft.textA || draft.textB) {
        this.setData({ textA: draft.textA || '', textB: draft.textB || '' })
      }
    }
  },

  methods: {
    onBack() {
      wx.navigateBack()
    },

    onInputA(e) {
      const textA = e.detail.value
      this.setData({ textA })
      this._saveDraft()
    },

    onInputB(e) {
      const textB = e.detail.value
      this.setData({ textB })
      this._saveDraft()
    },

    onClearA() {
      this.setData({ textA: '', diffLines: [], diffCount: 0 })
      this._saveDraft()
    },

    onPasteB() {
      wx.getClipboardData({
        success: (res) => {
          this.setData({ textB: res.data || '' })
          this._saveDraft()
        },
        fail: () => {
          wx.showToast({ title: '读取剪贴板失败', icon: 'none' })
        }
      })
    },

    onDiff() {
      const { textA, textB } = this.data
      if (!textA && !textB) {
        wx.showToast({ title: '请输入两段文本', icon: 'none' })
        return
      }
      wx.showLoading({ title: '对比中...' })
      // 放入 setTimeout 避免阻塞渲染
      setTimeout(() => {
        const { lines, count } = computeDiff(textA, textB)
        wx.hideLoading()
        this.setData({ diffLines: lines, diffCount: count })
        if (count === 0) {
          wx.showToast({ title: '两段文本完全相同', icon: 'success' })
        }
      }, 50)
    },

    _saveDraft() {
      wx.setStorageSync('diff_draft', { textA: this.data.textA, textB: this.data.textB })
    },
  },
})
