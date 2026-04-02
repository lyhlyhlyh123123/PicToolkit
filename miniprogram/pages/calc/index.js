// pages/calc/index.js
Component({
  pageLifetimes: {
    show() {
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ selected: 2 })
      }
    },
  },
  data: {
    tools: [
      {
        id: 'rmb',
        name: '人民币大写转换',
        desc: '财务报表必备金额转换',
        icon: '/assets/icons/calc-rmb.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'color',
        name: '颜色/进制转换',
        desc: 'RGB、HEX 及多种进制',
        icon: '/assets/icons/calc-color.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'workday',
        name: '日期工作日推算',
        desc: '精准管理项目日进度',
        icon: '/assets/icons/calc-workday.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'password',
        name: '强密码生成器',
        desc: '加密级随机安全密码',
        icon: '/assets/icons/calc-password.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'unit',
        name: '多维单位换算',
        desc: '长度、重量、面积全覆盖',
        icon: '/assets/icons/calc-unit.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'kinship',
        name: '亲戚关系计算器',
        desc: '理清复杂的过年称呼',
        icon: '/assets/icons/calc-kinship.svg',
        iconBg: '#EEF0FD',
      },
    ],
  },
  methods: {
    onToolTap(e) {
      const { id } = e.currentTarget.dataset
      wx.navigateTo({ url: `/pages/tools/calc/${id}/index` })
    },
  },
})
