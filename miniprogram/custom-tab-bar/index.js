// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '图片', iconClass: 'icon-image' },
      { pagePath: '/pages/text/index', text: '文字', iconClass: 'icon-text' },
      { pagePath: '/pages/calc/index', text: '计算', iconClass: 'icon-calc' },
    ],
  },
  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path
      const index = Number(e.currentTarget.dataset.index)
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    },
  },
})
