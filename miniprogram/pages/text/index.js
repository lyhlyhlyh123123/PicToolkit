// pages/text/index.js
Component({
  data: {
    tools: [
      {
        id: 'cleanup',
        name: '文本一键清理/排版',
        desc: '去除空格、展宽间距',
        icon: '/assets/icons/text-cleanup.svg',
      },
      {
        id: 'find-replace',
        name: '文本内容全查找/替换',
        desc: '支持正则表达式',
        icon: '/assets/icons/text-find.svg',
      },
      {
        id: 'prefix-suffix',
        name: '批量添加前缀/后缀',
        desc: '每行快速叠添内容',
        icon: '/assets/icons/text-prefix.svg',
      },
      {
        id: 'dedup',
        name: '文本列表一键去重',
        desc: '删除大批量重复行',
        icon: '/assets/icons/text-dedup.svg',
      },
      {
        id: 'diff',
        name: '文本差异对比',
        desc: '高亮显示增减内容',
        icon: '/assets/icons/text-diff.svg',
      },
      {
        id: 'markdown',
        name: 'Markdown 本地预览',
        desc: '即时渲染并导出 PDF',
        icon: '/assets/icons/text-markdown.svg',
      },
      {
        id: 'counter',
        name: '文本字数/字符数统计',
        desc: '精确字符、中文、标点分布',
        icon: '/assets/icons/text-counter.svg',
      },
    ],
  },
  methods: {
    onToolTap(e) {
      const { id } = e.currentTarget.dataset
      wx.navigateTo({ url: `/pages/tools/text/${id}/index` })
    },
  },
})
