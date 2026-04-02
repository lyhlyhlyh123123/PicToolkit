// pages/tools/image/convert/index.js

// 微信小程序 canvas 支持输出的格式
// AVIF 不在 canvasToTempFilePath 支持列表中，用 webp 替代提示
const FORMAT_OPTIONS = [
  { id: 'jpg',  name: 'JPG',  desc: '体积小，通用性强',   fileType: 'jpg'  },
  { id: 'png',  name: 'PNG',  desc: '无损，支持透明通道', fileType: 'png'  },
  { id: 'webp', name: 'WebP', desc: '新一代格式，更小体积', fileType: 'webp' },
]

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

Component({
  data: {
    srcPath: '',
    srcSize: '',
    srcFormat: '',
    targetFormat: 'jpg',
    targetFormatDesc: '体积小，通用性强',
    quality: 85,
    formatOptions: FORMAT_OPTIONS,
    converting: false,
    resultSize: '',
  },

  methods: {
    onBack() { wx.navigateBack() },

    onChooseImage() {
      if (this.data.converting) return
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['original'],
        success: (res) => {
          const file = res.tempFiles[0]
          const path = file.tempFilePath
          // 从路径猜测原始格式
          const ext = path.split('.').pop().toLowerCase()
          const srcFormat = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic'].includes(ext) ? ext.toUpperCase() : '未知'

          const fs = wx.getFileSystemManager()
          fs.getFileInfo({
            filePath: path,
            success: (fi) => {
              this.setData({
                srcPath: path,
                srcSize: formatSize(fi.size),
                srcFormat,
                resultSize: '',
              })
            },
            fail: () => {
              this.setData({
                srcPath: path,
                srcSize: formatSize(file.size || 0),
                srcFormat,
                resultSize: '',
              })
            }
          })
        }
      })
    },

    onReChoose() {
      this.setData({ srcPath: '', srcSize: '', srcFormat: '', resultSize: '' })
    },

    onFormatTap(e) {
      const id = e.currentTarget.dataset.id
      const opt = FORMAT_OPTIONS.find(f => f.id === id)
      this.setData({ targetFormat: id, targetFormatDesc: opt ? opt.desc : '' })
    },

    onQualityChanging(e) {
      this.setData({ quality: e.detail.value })
    },
    onQualityChange(e) {
      this.setData({ quality: e.detail.value })
    },

    onConvert() {
      if (!this.data.srcPath || this.data.converting) return
      const { srcPath, targetFormat, quality } = this.data

      // 如果源格式和目标格式相同，提示用户
      const srcExt = srcPath.split('.').pop().toLowerCase()
      const targetExt = targetFormat === 'jpg' ? 'jpg' : targetFormat
      if (srcExt === targetExt || (srcExt === 'jpeg' && targetExt === 'jpg')) {
        wx.showModal({
          title: '格式相同',
          content: '当前图片已是该格式，是否仍然重新编码（可调整质量）？',
          confirmText: '继续',
          success: (r) => { if (r.confirm) this._doConvert() }
        })
        return
      }
      this._doConvert()
    },

    _doConvert() {
      const { srcPath, targetFormat, quality } = this.data
      this.setData({ converting: true })
      wx.showLoading({ title: '转换中...' })

      wx.getImageInfo({
        src: srcPath,
        success: (info) => {
          this.createSelectorQuery()
            .select('#convertCanvas')
            .fields({ node: true, size: true })
            .exec((res) => {
              if (!res[0] || !res[0].node) {
                wx.hideLoading()
                this.setData({ converting: false })
                wx.showToast({ title: '初始化失败', icon: 'error' })
                return
              }
              const canvas = res[0].node

              // 超过 4096 等比缩小
              const MAX = 4096
              let w = info.width, h = info.height
              if (w > MAX || h > MAX) {
                const r = Math.min(MAX / w, MAX / h)
                w = Math.round(w * r)
                h = Math.round(h * r)
              }

              canvas.width  = w
              canvas.height = h
              const ctx = canvas.getContext('2d')

              // PNG 透明背景；JPG/WebP 白底
              if (targetFormat === 'png') {
                ctx.clearRect(0, 0, w, h)
              } else {
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, w, h)
              }

              const img = canvas.createImage()
              img.onload = () => {
                ctx.drawImage(img, 0, 0, w, h)

                wx.canvasToTempFilePath({
                  canvas,
                  fileType: targetFormat,
                  quality: quality / 100,
                  success: (r) => {
                    const fs = wx.getFileSystemManager()
                    fs.getFileInfo({
                      filePath: r.tempFilePath,
                      success: (fi) => {
                        this.setData({ converting: false, resultSize: formatSize(fi.size) })
                        wx.hideLoading()
                        wx.saveImageToPhotosAlbum({
                          filePath: r.tempFilePath,
                          success: () => wx.showToast({ title: '转换完成，已保存', icon: 'success' }),
                          fail: () => wx.showModal({
                            title: '需要相册权限',
                            content: '请在设置中允许访问相册后重试',
                            showCancel: false,
                          }),
                        })
                      },
                      fail: () => {
                        this.setData({ converting: false })
                        wx.hideLoading()
                        wx.saveImageToPhotosAlbum({
                          filePath: r.tempFilePath,
                          success: () => wx.showToast({ title: '转换完成，已保存', icon: 'success' }),
                          fail: () => wx.showModal({
                            title: '需要相册权限',
                            content: '请在设置中允许访问相册后重试',
                            showCancel: false,
                          }),
                        })
                      }
                    })
                  },
                  fail: () => {
                    wx.hideLoading()
                    this.setData({ converting: false })
                    wx.showToast({ title: '转换失败', icon: 'error' })
                  }
                })
              }
              img.onerror = () => {
                wx.hideLoading()
                this.setData({ converting: false })
                wx.showToast({ title: '图片加载失败', icon: 'error' })
              }
              img.src = srcPath
            })
        },
        fail: () => {
          wx.hideLoading()
          this.setData({ converting: false })
          wx.showToast({ title: '读取图片失败', icon: 'error' })
        }
      })
    },
  },
})
