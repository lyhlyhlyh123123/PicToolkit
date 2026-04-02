// pages/index/index.js
Component({
  data: {
    tools: [
      {
        id: 'compress',
        name: '智能图片压缩',
        desc: '高画质压缩减小体积',
        icon: '/assets/icons/compress.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'stitch',
        name: '图片无缝拼接',
        desc: '纵向横向自由组合',
        icon: '/assets/icons/stitch.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'convert',
        name: '图片格式转换',
        desc: 'PNG/JPG/WebP/AVIF',
        icon: '/assets/icons/convert.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'watermark',
        name: '证件快捷加水印',
        desc: '保护敏感隐私安全',
        icon: '/assets/icons/watermark.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'crop',
        name: '精准尺寸裁剪',
        desc: '预设比例与像素值',
        icon: '/assets/icons/crop.svg',
        iconBg: '#EEF0FD',
      },
      {
        id: 'mosaic',
        name: '手动隐私打码',
        desc: '高精框框涂抹区域',
        icon: '/assets/icons/mosaic.svg',
        iconBg: '#EEF0FD',
      },
    ],
  },
  methods: {
    onToolTap(e) {
      const { id } = e.currentTarget.dataset
      wx.navigateTo({ url: `/pages/tools/image/${id}/index` })
    },
  },
})
