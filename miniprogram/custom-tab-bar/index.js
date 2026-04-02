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
      const { path, index } = e.currentTarget.dataset
      wx.switchTab({ url: path })
      this.setData({ selected: index })
    },
  },
})
