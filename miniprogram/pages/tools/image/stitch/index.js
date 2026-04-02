// pages/tools/image/stitch/index.js

const MAX_COUNT = 9

Component({
  data: {
    images: [],          // { path, w, h }
    direction: 'v',      // 'v' 纵向 | 'h' 横向
    gap: 12,             // 内间距 px
    radius: 24,          // 圆角大小 px（canvas 绘制用）
    generating: false,
    previewPath: '',
    // 长按排序
    draggingIndex: -1,
  },

  _rafPending: false,

  methods: {
    onBack() { wx.navigateBack() },

    // ---- 图片管理 ----
    onAddImage() {
      if (this.data.generating) return
      const remain = MAX_COUNT - this.data.images.length
      if (remain <= 0) return
      wx.chooseMedia({
        count: remain,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['original'],
        success: (res) => {
          const tasks = res.tempFiles.map(f => new Promise((resolve) => {
            wx.getImageInfo({
              src: f.tempFilePath,
              success: (info) => resolve({ path: f.tempFilePath, w: info.width, h: info.height }),
              fail: () => resolve({ path: f.tempFilePath, w: 0, h: 0 }),
            })
          }))
          Promise.all(tasks).then(newImgs => {
            const images = [...this.data.images, ...newImgs]
            this.setData({ images, previewPath: '' }, () => {
              this._schedulePreview()
            })
          })
        }
      })
    },

    onRemoveImage(e) {
      const idx = e.currentTarget.dataset.index
      const images = this.data.images.filter((_, i) => i !== idx)
      this.setData({ images, previewPath: '' }, () => {
        if (images.length > 0) this._schedulePreview()
      })
    },

    // ---- 参数 ----
    onDirectionChange(e) {
      this.setData({ direction: e.currentTarget.dataset.dir, previewPath: '' }, () => {
        this._schedulePreview()
      })
    },

    onGapChanging(e) {
      this.setData({ gap: e.detail.value })
    },
    onGapChange(e) {
      this.setData({ gap: e.detail.value, previewPath: '' }, () => {
        this._schedulePreview()
      })
    },

    onRadiusChanging(e) {
      this.setData({ radius: e.detail.value })
    },
    onRadiusChange(e) {
      this.setData({ radius: e.detail.value, previewPath: '' }, () => {
        this._schedulePreview()
      })
    },

    // ---- 排序（长按拖拽简化为点击上移） ----
    onMoveLeft(e) {
      const idx = e.currentTarget.dataset.index
      if (idx <= 0) return
      const images = [...this.data.images]
      ;[images[idx - 1], images[idx]] = [images[idx], images[idx - 1]]
      this.setData({ images, previewPath: '' }, () => this._schedulePreview())
    },
    onMoveRight(e) {
      const idx = e.currentTarget.dataset.index
      const images = this.data.images
      if (idx >= images.length - 1) return
      const arr = [...images]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      this.setData({ images: arr, previewPath: '' }, () => this._schedulePreview())
    },

    // ---- 实时预览（低分辨率） ----
    _schedulePreview() {
      if (this._rafPending) return
      this._rafPending = true
      setTimeout(() => {
        this._rafPending = false
        this._renderCanvas(false)
      }, 60)
    },

    _renderCanvas(isExport, exportCb) {
      const { images, direction, gap, radius } = this.data
      if (images.length === 0) return

      // 计算拼接画布尺寸
      // 统一宽（纵向）或统一高（横向）
      const PREVIEW_MAX = 750  // 预览最大宽/高（rpx → 实际 px 由 DPR 决定，这里用逻辑 px）

      let canvasW, canvasH
      let positions = []  // { x, y, dw, dh, srcW, srcH }

      if (direction === 'v') {
        // 纵向：统一宽度为最小原图宽（防失真），高度累加
        const baseW = isExport
          ? Math.min(...images.map(img => img.w || 1080))
          : Math.min(PREVIEW_MAX, Math.min(...images.map(img => img.w || 750)))
        canvasW = baseW
        let y = 0
        for (const img of images) {
          const scale = baseW / (img.w || baseW)
          const dh = Math.round((img.h || baseW) * scale)
          positions.push({ x: 0, y, dw: baseW, dh, srcW: img.w, srcH: img.h })
          y += dh + gap
        }
        canvasH = y - gap
      } else {
        // 横向：统一高度
        const baseH = isExport
          ? Math.min(...images.map(img => img.h || 1080))
          : Math.min(PREVIEW_MAX, Math.min(...images.map(img => img.h || 750)))
        canvasH = baseH
        let x = 0
        for (const img of images) {
          const scale = baseH / (img.h || baseH)
          const dw = Math.round((img.w || baseH) * scale)
          positions.push({ x, y: 0, dw, dh: baseH, srcW: img.w, srcH: img.h })
          x += dw + gap
        }
        canvasW = x - gap
      }

      const canvasId = isExport ? '#stitchCanvasExport' : '#stitchCanvas'

      this.createSelectorQuery()
        .select(canvasId)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            if (exportCb) exportCb(null)
            return
          }
          const canvas = res[0].node
          const dpr = isExport ? 1 : ((wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2)
          canvas.width  = Math.round(canvasW * dpr)
          canvas.height = Math.round(canvasH * dpr)

          const ctx = canvas.getContext('2d')
          if (dpr !== 1) ctx.scale(dpr, dpr)

          // 白色背景
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvasW, canvasH)

          // 逐张绘制
          let drawn = 0
          const total = images.length
          const drawNext = (i) => {
            if (i >= total) {
              if (!isExport) {
                wx.canvasToTempFilePath({
                  canvas,
                  fileType: 'jpg',
                  quality: 0.9,
                  success: (r) => this.setData({ previewPath: r.tempFilePath }),
                  fail: () => {}
                })
              } else {
                if (exportCb) exportCb(canvas)
              }
              return
            }
            const p = positions[i]
            const img = canvas.createImage()
            img.onload = () => {
              if (radius > 0) {
                ctx.save()
                this._roundRect(ctx, p.x, p.y, p.dw, p.dh, radius)
                ctx.clip()
              }
              ctx.drawImage(img, p.x, p.y, p.dw, p.dh)
              if (radius > 0) ctx.restore()
              drawNext(i + 1)
            }
            img.onerror = () => drawNext(i + 1)
            img.src = images[i].path
          }
          drawNext(0)
        })
    },

    _roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r)
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h)
      ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
      ctx.closePath()
    },

    // ---- 生成并保存 ----
    onGenerate() {
      if (!this.data.images.length || this.data.generating) return
      this.setData({ generating: true })
      wx.showLoading({ title: '生成中...' })

      this._renderCanvas(true, (canvas) => {
        if (!canvas) {
          wx.hideLoading()
          this.setData({ generating: false })
          wx.showToast({ title: '生成失败', icon: 'error' })
          return
        }
        wx.canvasToTempFilePath({
          canvas,
          fileType: 'jpg',
          quality: 0.95,
          success: (r) => {
            wx.hideLoading()
            this.setData({ generating: false })
            wx.saveImageToPhotosAlbum({
              filePath: r.tempFilePath,
              success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
              fail: () => wx.showModal({
                title: '需要相册权限',
                content: '请在设置中允许访问相册后重试',
                showCancel: false,
              }),
            })
          },
          fail: () => {
            wx.hideLoading()
            this.setData({ generating: false })
            wx.showToast({ title: '导出失败', icon: 'error' })
          }
        })
      })
    },

    onZoomPreview() {
      if (this.data.previewPath) {
        wx.previewImage({ urls: [this.data.previewPath] })
      }
    },

    onRefreshPreview() {
      this.setData({ previewPath: '' })
      this._schedulePreview()
    },
  },
})
