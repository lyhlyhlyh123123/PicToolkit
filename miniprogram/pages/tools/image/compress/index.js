// pages/tools/image/compress/index.js

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return '- MB'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

Component({
  data: {
    srcPath: '',
    srcBytes: 0,
    srcSize: '',
    resultPath: '',
    resultBytes: 0,
    resultSize: '',
    ratio: '',
    quality: 80,
    toWebp: false,
    compressing: false,
  },

  methods: {
    onBack() {
      wx.navigateBack()
    },

    onChooseImage() {
      if (this.data.compressing) return
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        // sizeType: ['original'] 确保拿到原图（不让微信预先压缩）
        sizeType: ['original'],
        success: (res) => {
          const file = res.tempFiles[0]
          const path = file.tempFilePath
          // file.size 有时为 0，用文件系统接口读取真实大小
          const fs = wx.getFileSystemManager()
          fs.getFileInfo({
            filePath: path,
            success: (fi) => {
              const size = fi.size
              this.setData({
                srcPath: path,
                srcBytes: size,
                srcSize: formatSize(size),
                resultPath: '',
                resultBytes: 0,
                resultSize: '',
                ratio: '',
              })
              this._estimateResult(size)
            },
            fail: () => {
              // getFileInfo 失败时降级用 file.size
              const size = file.size || 0
              this.setData({
                srcPath: path,
                srcBytes: size,
                srcSize: formatSize(size),
                resultPath: '',
                resultBytes: 0,
                resultSize: '',
                ratio: '',
              })
              if (size) this._estimateResult(size)
            }
          })
        }
      })
    },

    onReChoose() {
      this.setData({
        srcPath: '',
        srcBytes: 0,
        srcSize: '',
        resultPath: '',
        resultBytes: 0,
        resultSize: '',
        ratio: '',
      })
    },

    onQualityChanging(e) {
      this.setData({ quality: e.detail.value })
    },
    onQualityChange(e) {
      this.setData({ quality: e.detail.value }, () => {
        if (this.data.srcBytes) this._estimateResult(this.data.srcBytes)
      })
    },
    onToWebpChange(e) {
      this.setData({ toWebp: e.detail.value }, () => {
        if (this.data.srcBytes) this._estimateResult(this.data.srcBytes)
      })
    },

    _estimateResult(srcBytes) {
      const { quality, toWebp } = this.data
      // quality/100 的幂函数更接近 JPEG 编码器实际曲线
      let factor = Math.pow(quality / 100, 1.4)
      if (toWebp) factor *= 0.72
      const estimated = Math.max(srcBytes * factor, 1024)
      const saved = Math.max(0, Math.round((1 - estimated / srcBytes) * 100))
      this.setData({
        resultSize: formatSize(estimated),
        ratio: saved > 0 ? String(saved) : '',
      })
    },

    onCompress() {
      if (!this.data.srcPath || this.data.compressing) return
      this.setData({ compressing: true })
      wx.showLoading({ title: '压缩中...' })

      const { srcPath, quality, toWebp } = this.data

      wx.getImageInfo({
        src: srcPath,
        success: (info) => {
          this._compressViaCanvas(srcPath, info.width, info.height, quality, toWebp)
        },
        fail: () => {
          wx.hideLoading()
          this.setData({ compressing: false })
          wx.showToast({ title: '读取图片失败', icon: 'error' })
        }
      })
    },

    _compressViaCanvas(srcPath, naturalW, naturalH, quality, toWebp) {
      // 超过 4096px 等比缩小，防内存溢出
      // 同时这也是压缩体积的核心手段之一：降低分辨率
      const MAX = 4096
      let w = naturalW, h = naturalH
      if (w > MAX || h > MAX) {
        const r = Math.min(MAX / w, MAX / h)
        w = Math.round(w * r)
        h = Math.round(h * r)
      }

      // 根据 quality 额外降低分辨率：低质量时也等比缩小尺寸，进一步压缩体积
      // quality 80 → 保持原分辨率；quality 40 → 缩到 70%；quality 10 → 缩到 50%
      if (quality < 80) {
        const sizeScale = 0.5 + (quality / 80) * 0.5
        w = Math.round(w * sizeScale)
        h = Math.round(h * sizeScale)
      }

      this.createSelectorQuery()
        .select('#compressCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            wx.hideLoading()
            this.setData({ compressing: false })
            wx.showToast({ title: '初始化失败', icon: 'error' })
            return
          }
          const canvas = res[0].node
          canvas.width  = w
          canvas.height = h
          const ctx = canvas.getContext('2d')

          const img = canvas.createImage()
          img.onload = () => {
            ctx.clearRect(0, 0, w, h)
            ctx.drawImage(img, 0, 0, w, h)

            wx.canvasToTempFilePath({
              canvas,
              fileType: toWebp ? 'webp' : 'jpg',
              quality: quality / 100,
              success: (r) => {
                const fs = wx.getFileSystemManager()
                fs.getFileInfo({
                  filePath: r.tempFilePath,
                  success: (fi) => {
                    const resultBytes = fi.size
                    const srcBytes = this.data.srcBytes
                    // 若压缩后反而更大（罕见场景），节省比例显示 0
                    const saved = srcBytes > 0
                      ? Math.max(0, Math.round((1 - resultBytes / srcBytes) * 100))
                      : 0
                    this.setData({
                      compressing: false,
                      resultPath: r.tempFilePath,
                      resultBytes,
                      resultSize: formatSize(resultBytes),
                      ratio: String(saved),
                    })
                    wx.hideLoading()
                    wx.saveImageToPhotosAlbum({
                      filePath: r.tempFilePath,
                      success: () => wx.showToast({ title: `压缩完成，节省 ${saved}%`, icon: 'success' }),
                      fail: () => wx.showModal({
                        title: '需要相册权限',
                        content: '请在设置中允许访问相册后重试',
                        showCancel: false,
                      }),
                    })
                  },
                  fail: () => {
                    wx.hideLoading()
                    this.setData({ compressing: false, resultPath: r.tempFilePath })
                    wx.saveImageToPhotosAlbum({
                      filePath: r.tempFilePath,
                      success: () => wx.showToast({ title: '压缩完成', icon: 'success' }),
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
                this.setData({ compressing: false })
                wx.showToast({ title: '压缩失败', icon: 'error' })
              }
            })
          }
          img.onerror = () => {
            wx.hideLoading()
            this.setData({ compressing: false })
            wx.showToast({ title: '图片加载失败', icon: 'error' })
          }
          img.src = srcPath
        })
    },
  },
})
