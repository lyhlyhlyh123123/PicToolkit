// pages/tools/image/watermark/index.js

const DENSITY_MAP = {
  dense:  { gapX: 150, gapY: 90  },
  medium: { gapX: 210, gapY: 130 },
  sparse: { gapX: 290, gapY: 190 },
}

Component({
  data: {
    previewUrl: '',
    originalPath: '',
    // canvas 逻辑尺寸（CSS px），由 JS 的 contain 计算填入
    canvasW: 0,
    canvasH: 0,
    // 容器实际可用宽度（CSS px），onReady 时读取
    containerW: 0,
    containerH: 0,
    // 原图实际像素尺寸（用于高清导出）
    imgNaturalW: 0,
    imgNaturalH: 0,
    watermarkText: '仅供办理业务使用',
    opacity: 40,
    fontSize: 14,
    density: 'medium',
    densityLabel: '中等',
    color: '#888888',
    presets: ['仅供办理业务使用', '禁止非法使用', '复印无效'],
    densityOptions: [
      { label: '密集', value: 'dense' },
      { label: '适中', value: 'medium' },
      { label: '稀疏', value: 'sparse' },
    ],
    colorOptions: [
      { value: '#888888' },
      { value: '#FFFFFF' },
      { value: '#000000' },
      { value: '#E53935' },
      { value: '#4A6CF7' },
    ],
  },

  _canvas: null,
  _ctx: null,
  _bgImage: null,
  _dpr: 2,
  _rafPending: false,

  lifetimes: {
    ready() {
      // 读取容器实际尺寸（单位 px）
      this.createSelectorQuery()
        .select('#canvasContainer')
        .boundingClientRect((rect) => {
          if (rect) {
            this._containerW = rect.width
            this._containerH = rect.height
          }
        }).exec()
    },
  },

  methods: {
    onBack() {
      wx.navigateBack()
    },

    onChooseImage() {
      if (this.data.previewUrl) return
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const path = res.tempFiles[0].tempFilePath
          wx.getImageInfo({
            src: path,
            success: (info) => {
              // 用容器实际尺寸做 contain 缩放
              const cw = this._containerW || 300
              const ch = this._containerH || 200
              const imgRatio = info.width / info.height
              const boxRatio = cw / ch
              let w, h
              if (imgRatio >= boxRatio) {
                // 图片更宽：以容器宽为准
                w = cw
                h = Math.round(cw / imgRatio)
              } else {
                // 图片更高：以容器高为准
                h = ch
                w = Math.round(ch * imgRatio)
              }
              this.setData({
                previewUrl: path,
                originalPath: path,
                canvasW: w,
                canvasH: h,
                imgNaturalW: info.width,
                imgNaturalH: info.height,
              }, () => {
                this._initCanvas(path)
              })
            }
          })
        }
      })
    },

    onReChoose() {
      this._canvas = null
      this._ctx = null
      this._bgImage = null
      this.setData({ previewUrl: '', originalPath: '', canvasW: 0, canvasH: 0 })
    },

    // 放大预览：导出当前 canvas（含水印）再预览
    onZoomPreview() {
      if (!this._canvas) return
      wx.canvasToTempFilePath({
        canvas: this._canvas,
        fileType: 'jpg',
        quality: 0.95,
        success: (r) => {
          wx.previewImage({ urls: [r.tempFilePath] })
        },
        fail: () => {
          // fallback：预览原图
          wx.previewImage({ urls: [this.data.originalPath] })
        }
      })
    },

    // ---- 参数变更 ----
    onTextInput(e) {
      this.setData({ watermarkText: e.detail.value }, () => this._scheduleRedraw())
    },
    onPresetTap(e) {
      this.setData({ watermarkText: e.currentTarget.dataset.text }, () => this._scheduleRedraw())
    },
    onOpacityChanging(e) {
      this.setData({ opacity: e.detail.value })
    },
    onOpacityChange(e) {
      this.setData({ opacity: e.detail.value }, () => this._scheduleRedraw())
    },
    onFontSizeChanging(e) {
      this.setData({ fontSize: e.detail.value })
    },
    onFontSizeChange(e) {
      this.setData({ fontSize: e.detail.value }, () => this._scheduleRedraw())
    },
    onDensityTap(e) {
      const value = e.currentTarget.dataset.value
      const labels = { dense: '密集', medium: '中等', sparse: '稀疏' }
      this.setData({ density: value, densityLabel: labels[value] }, () => this._scheduleRedraw())
    },
    onColorTap(e) {
      this.setData({ color: e.currentTarget.dataset.value }, () => this._scheduleRedraw())
    },

    // ---- Canvas 初始化 ----
    _initCanvas(imgPath) {
      this.createSelectorQuery()
        .select('#watermarkCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) return
          const canvas = res[0].node
          const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2
          const { canvasW, canvasH } = this.data
          canvas.width  = Math.round(canvasW * dpr)
          canvas.height = Math.round(canvasH * dpr)
          const ctx = canvas.getContext('2d')
          ctx.scale(dpr, dpr)
          this._canvas = canvas
          this._ctx    = ctx
          this._dpr    = dpr

          const img = canvas.createImage()
          img.onload = () => {
            this._bgImage = img
            this._redraw()
          }
          img.src = imgPath
        })
    },

    _scheduleRedraw() {
      if (!this._canvas || !this._bgImage) return
      if (this._rafPending) return
      this._rafPending = true
      setTimeout(() => {
        this._rafPending = false
        this._redraw()
      }, 16)
    },

    _redraw() {
      if (!this._canvas || !this._bgImage || !this._ctx) return
      const { canvasW, canvasH, watermarkText, opacity, fontSize, density, color } = this.data
      const ctx = this._ctx

      ctx.clearRect(0, 0, canvasW, canvasH)
      ctx.globalAlpha = 1
      ctx.drawImage(this._bgImage, 0, 0, canvasW, canvasH)

      this._drawWatermarkLayer(ctx, canvasW, canvasH, { watermarkText, opacity, fontSize, density, color })
    },

    // 纯函数：在给定 ctx/尺寸 上绘制水印层（预览和导出复用）
    _drawWatermarkLayer(ctx, w, h, opts) {
      const { watermarkText, opacity, fontSize, density, color } = opts
      ctx.globalAlpha = opacity / 100
      ctx.fillStyle   = color
      ctx.font        = `${fontSize}px sans-serif`

      const { gapX, gapY } = DENSITY_MAP[density]
      const scaleF = Math.min(w / 300, h / 200)
      const gx = gapX * scaleF
      const gy = gapY * scaleF

      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(-Math.PI / 6)

      const diag = Math.sqrt(w * w + h * h)
      const cols = Math.ceil(diag / gx) + 4
      const rows = Math.ceil(diag / gy) + 4
      const startX = -Math.ceil(cols / 2) * gx
      const startY = -Math.ceil(rows / 2) * gy

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillText(watermarkText, startX + c * gx, startY + r * gy)
        }
      }
      ctx.restore()
      ctx.globalAlpha = 1
    },

    // ---- 保存高清图 ----
    // 思路：先把预览 canvas 导出为临时文件，再用原图尺寸重绘，导出高清，再恢复预览
    onSave() {
      if (!this.data.previewUrl) {
        wx.showToast({ title: '请先上传图片', icon: 'none' })
        return
      }
      wx.showLoading({ title: '生成中...' })
      const {
        imgNaturalW, imgNaturalH, canvasW, canvasH,
        watermarkText, opacity, fontSize, density, color, originalPath,
      } = this.data
      const dpr = this._dpr

      // 1. 切换 canvas 到原图尺寸
      const canvas = this._canvas
      canvas.width  = imgNaturalW
      canvas.height = imgNaturalH
      const ctx = canvas.getContext('2d')

      // 2. 画原图
      const img = canvas.createImage()
      img.onload = () => {
        ctx.clearRect(0, 0, imgNaturalW, imgNaturalH)
        ctx.globalAlpha = 1
        ctx.drawImage(img, 0, 0, imgNaturalW, imgNaturalH)

        // 3. 字号等比放大到原图尺寸
        const scaleUp = Math.min(imgNaturalW / canvasW, imgNaturalH / canvasH)
        this._drawWatermarkLayer(ctx, imgNaturalW, imgNaturalH, {
          watermarkText, opacity, density, color,
          fontSize: fontSize * scaleUp,
        })

        // 4. 导出
        wx.canvasToTempFilePath({
          canvas,
          fileType: 'jpg',
          quality: 0.95,
          success: (r) => {
            // 5. 恢复预览尺寸
            canvas.width  = Math.round(canvasW * dpr)
            canvas.height = Math.round(canvasH * dpr)
            const pctx = canvas.getContext('2d')
            pctx.scale(dpr, dpr)
            this._ctx = pctx
            this._redraw()

            wx.saveImageToPhotosAlbum({
              filePath: r.tempFilePath,
              success: () => { wx.hideLoading(); wx.showToast({ title: '已保存到相册', icon: 'success' }) },
              fail:    () => { wx.hideLoading(); wx.showToast({ title: '请授权相册权限', icon: 'none' }) },
            })
          },
          fail: () => { wx.hideLoading(); wx.showToast({ title: '导出失败', icon: 'error' }) },
        })
      }
      img.src = originalPath
    },
  },
})
