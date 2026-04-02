// pages/tools/text/markdown/index.js

/**
 * 轻量 Markdown → 富文本节点转换器
 * 返回 richText nodes 数组，供 <rich-text> 渲染
 *
 * 支持：h1-h6、**bold**、*italic*、~~del~~、`code`、
 *       > blockquote、--- 分割线、- / * 无序列表、有序列表、段落
 */
function mdToNodes(md) {
  if (!md) return []
  const lines = md.split('\n')
  const nodes = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 空行
    if (!line.trim()) {
      nodes.push({ name: 'br', attrs: {} })
      i++; continue
    }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      nodes.push({ name: 'hr', attrs: { style: 'border:none;border-top:1px solid #E0E0F0;margin:12px 0;' } })
      i++; continue
    }

    // 标题
    const hMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (hMatch) {
      const level = hMatch[1].length
      const sizes = ['28px','24px','20px','18px','16px','14px']
      const size = sizes[level - 1] || '14px'
      const weight = level <= 3 ? '700' : '600'
      nodes.push({
        name: `h${level}`,
        attrs: { style: `font-size:${size};font-weight:${weight};color:#1A1A2E;margin:12px 0 6px;display:block;` },
        children: inlineNodes(hMatch[2])
      })
      i++; continue
    }

    // blockquote
    if (line.startsWith('> ')) {
      const text = line.slice(2)
      nodes.push({
        name: 'view',
        attrs: { style: 'border-left:3px solid #4A6CF7;padding:8px 12px;margin:8px 0;background:rgba(74,108,247,0.06);border-radius:0 8px 8px 0;' },
        children: [{ name: 'span', attrs: { style: 'font-size:14px;color:#555566;font-style:italic;' }, children: inlineNodes(text) }]
      })
      i++; continue
    }

    // 无序列表
    if (/^[-*+]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push({
          name: 'view',
          attrs: { style: 'display:flex;align-items:flex-start;gap:8px;margin:4px 0;' },
          children: [
            { name: 'span', attrs: { style: 'color:#4A6CF7;font-size:14px;margin-top:2px;flex-shrink:0;' }, children: [{ type: 'text', text: '•' }] },
            { name: 'span', attrs: { style: 'font-size:14px;color:#1A1A2E;line-height:1.6;flex:1;' }, children: inlineNodes(lines[i].replace(/^[-*+]\s/, '')) }
          ]
        })
        i++
      }
      nodes.push({ name: 'view', attrs: { style: 'margin:8px 0;' }, children: items })
      continue
    }

    // 有序列表
    if (/^\d+\.\s/.test(line)) {
      const items = []
      let num = 1
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push({
          name: 'view',
          attrs: { style: 'display:flex;align-items:flex-start;gap:8px;margin:4px 0;' },
          children: [
            { name: 'span', attrs: { style: 'color:#4A6CF7;font-size:14px;font-weight:600;margin-top:2px;flex-shrink:0;min-width:18px;' }, children: [{ type: 'text', text: `${num}.` }] },
            { name: 'span', attrs: { style: 'font-size:14px;color:#1A1A2E;line-height:1.6;flex:1;' }, children: inlineNodes(lines[i].replace(/^\d+\.\s/, '')) }
          ]
        })
        i++; num++
      }
      nodes.push({ name: 'view', attrs: { style: 'margin:8px 0;' }, children: items })
      continue
    }

    // 代码块 ```
    if (line.startsWith('```')) {
      i++
      const codeLines = []
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      nodes.push({
        name: 'view',
        attrs: { style: 'background:#F5F6FA;border-radius:8px;padding:12px;margin:8px 0;overflow:hidden;' },
        children: [{ name: 'span', attrs: { style: 'font-size:13px;color:#333344;font-family:monospace;white-space:pre-wrap;display:block;' }, children: [{ type: 'text', text: codeLines.join('\n') }] }]
      })
      continue
    }

    // 普通段落
    nodes.push({
      name: 'p',
      attrs: { style: 'font-size:14px;color:#1A1A2E;line-height:1.8;margin:6px 0;' },
      children: inlineNodes(line)
    })
    i++
  }

  return nodes
}

/**
 * 内联元素解析：**bold** *italic* ~~del~~ `code`
 */
function inlineNodes(text) {
  if (!text) return [{ type: 'text', text: '' }]
  const result = []
  // 按顺序匹配内联标记
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`)/g
  let lastIdx = 0
  let m
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) {
      result.push({ type: 'text', text: text.slice(lastIdx, m.index) })
    }
    if (m[2] !== undefined) { // **bold**
      result.push({ name: 'strong', attrs: { style: 'font-weight:700;color:#1A1A2E;' }, children: [{ type: 'text', text: m[2] }] })
    } else if (m[3] !== undefined) { // *italic*
      result.push({ name: 'em', attrs: { style: 'font-style:italic;color:#555566;' }, children: [{ type: 'text', text: m[3] }] })
    } else if (m[4] !== undefined) { // ~~del~~
      result.push({ name: 'span', attrs: { style: 'text-decoration:line-through;color:#888899;' }, children: [{ type: 'text', text: m[4] }] })
    } else if (m[5] !== undefined) { // `code`
      result.push({ name: 'span', attrs: { style: 'background:#F0F1F8;border-radius:4px;padding:0 4px;font-size:13px;color:#4A6CF7;font-family:monospace;' }, children: [{ type: 'text', text: m[5] }] })
    }
    lastIdx = pattern.lastIndex
  }
  if (lastIdx < text.length) {
    result.push({ type: 'text', text: text.slice(lastIdx) })
  }
  if (result.length === 0) result.push({ type: 'text', text: text })
  return result
}

const DEFAULT_MD = `# 欢迎使用 Precision Markdown

这是一款为您精心打造的编辑器。

### 核心特性
- **实时渲染**：即刻查看转换效果。
- **极简风格**：专注创作，拒绝干扰。
- **多端导出**：一键转换为 PDF 或 HTML。

---

> 每一个字符，都值得被优雅地呈现。`

Component({
  data: {
    mdText: DEFAULT_MD,
    previewNodes: [],
    byteSize: '0 B',
    encoding: 'UTF-8',
  },

  lifetimes: {
    attached() {
      const draft = wx.getStorageSync('md_draft') || ''
      const text = draft || DEFAULT_MD
      this.setData({ mdText: text })
      this._updateStats(text)
      this._renderPreview(text)
    }
  },

  methods: {
    onBack() { wx.navigateBack() },

    onInput(e) {
      const text = e.detail.value
      this.setData({ mdText: text })
      this._updateStats(text)
      this._renderPreview(text)
      this._saveDraft(text)
    },

    onClear() {
      wx.showModal({
        title: '清空内容',
        content: '确定要清空所有内容吗？',
        success: (r) => {
          if (r.confirm) {
            this.setData({ mdText: '', previewNodes: [] })
            this._updateStats('')
            this._saveDraft('')
          }
        }
      })
    },

    onCopy() {
      wx.setClipboardData({
        data: this.data.mdText,
        success: () => wx.showToast({ title: '已复制', icon: 'success' })
      })
    },

    _updateStats(text) {
      const bytes = this._getByteLength(text)
      this.setData({ byteSize: this._formatBytes(bytes) })
    },

    _getByteLength(str) {
      let len = 0
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i)
        if (code <= 0x7F) len += 1
        else if (code <= 0x7FF) len += 2
        else len += 3
      }
      return len
    },

    _formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B'
      return (bytes / 1024).toFixed(1) + ' KB'
    },

    _renderPreview(text) {
      const nodes = mdToNodes(text)
      this.setData({ previewNodes: nodes })
    },

    _saveDraft(text) {
      wx.setStorageSync('md_draft', text)
    },
  },
})
