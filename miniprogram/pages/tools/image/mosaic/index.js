// pages/tools/image/mosaic/index.js

// 打码模式
const MODES = [
  { id: 'blur',   name: '柔和模糊',  icon: '⠿' },
  { id: 'pixel',  name: '像素马赛克', icon: '▪▪\n▪▪' },
  { id: 'fill',   name: '纯色填充',  icon: '■' },
  { id: 'brush',  name: '自由画笔',  icon: '✏' },
]

const BRUSH_SIZES = [8, 16, 24, 40]

Component({
  data: {
    srcPath: '',
    // canvas 显示尺寸（CSS px）
    canvasW: 0,
    canvasH: 0,
    mode: 'blur',
    modes: MODES,
    brushSize: 24,
    brushSizes: BRUSH_SIZES,
    intensity: 70,  // 遮盖强度 %
    drawing: false,
    exporting: false,
  },

  // 实例属性
  _canvas: null,
  _ctx: null,
  _bgImage: null,
  _dpr: 2,
  _naturalW: 0,
  _naturalH: 0,
  _imgX: 0, _imgY: 0, _imgW: 0, _imgH: 0,
  _wrapW: 0, _wrapH: 0,
  // 撤销栈：保存 ImageData 快照（最多 10 步）
  _undoStack: [],
  _redoStack: [],

  lifetimes: {
    ready() {
      this.createSelectorQuery()
        .select('#mosaicWrap')
        .boundingClientRect(rect => {
          if (rect && rect.width > 0) {
            this._wrapW = rect.width
            this._wrapH = rect.height
          }
        }).exec()
    }
  },

  methods: {
    onBack() { wx.navigateBack() },

    // ---- 选图 ----
    onChooseImage() {
      if (this.data.exporting) return
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['original'],
        success: (res) => {
          const path = res.tempFiles[0].tempFilePath
          this._measureAndInit(path)
        }
      })
    },

    _measureAndInit(path) {
      this.createSelectorQuery()
        .select('#mosaicWrap')
        .boundingClientRect(rect => {
          if (rect && rect.width > 0) {
            this._wrapW = rect.width
            this._wrapH = rect.height
          }
          wx.getImageInfo({
            src: path,
            success: (info) => {
              this._naturalW = info.width
              this._naturalH = info.height
              const wrapW = this._wrapW || 320
              const wrapH = this._wrapH || 300
              const imgRatio = info.width / info.height
              const wrapRatio = wrapW / wrapH
              let imgDispW, imgDispH
              if (imgRatio >= wrapRatio) {
                imgDispW = wrapW; imgDispH = wrapW / imgRatio
              } else {
                imgDispH = wrapH; imgDispW = wrapH * imgRatio
              }
              this._imgX = (wrapW - imgDispW) / 2
              this._imgY = (wrapH - imgDispH) / 2
              this._imgW = imgDispW
              this._imgH = imgDispH

              this.setData({
                srcPath: path,
                canvasW: wrapW,
                canvasH: wrapH,
              }, () => {
                this._initCanvas(path, wrapW, wrapH)
              })
            }
          })
        }).exec()
    },

    _initCanvas(imgPath, cw, ch) {
      this.createSelectorQuery()
        .select('#mosaicCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) return
          const canvas = res[0].node
          const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2
          canvas.width  = Math.round(cw * dpr)
          canvas.height = Math.round(ch * dpr)
          const ctx = canvas.getContext('2d')
          ctx.scale(dpr, dpr)
          this._canvas = canvas
          this._ctx = ctx
          this._dpr = dpr
          this._undoStack = []
          this._redoStack = []

          const img = canvas.createImage()
          img.onload = () => {
            this._bgImage = img
            ctx.clearRect(0, 0, cw, ch)
            ctx.drawImage(img, this._imgX, this._imgY, this._imgW, this._imgH)
          }
          img.src = imgPath
        })
    },

    // ---- 撤销 / 重做 ----
    _saveSnapshot() {
      if (!this._ctx) return
      const cw = this.data.canvasW, ch = this.data.canvasH
      const dpr = this._dpr
      try {
        const imageData = this._ctx.getImageData(0, 0, Math.round(cw * dpr), Math.round(ch * dpr))
        this._undoStack.push(imageData)
        if (this._undoStack.length > 10) this._undoStack.shift()
        this._redoStack = []
      } catch(e) {}
    },

    onUndo() {
      if (!this._ctx || this._undoStack.length === 0) return
      const cw = this.data.canvasW, ch = this.data.canvasH
      const dpr = this._dpr
      try {
        const current = this._ctx.getImageData(0, 0, Math.round(cw * dpr), Math.round(ch * dpr))
        this._redoStack.push(current)
        const prev = this._undoStack.pop()
        this._ctx.putImageData(prev, 0, 0)
      } catch(e) {}
    },

    onRedo() {
      if (!this._ctx || this._redoStack.length === 0) return
      const cw = this.data.canvasW, ch = this.data.canvasH
      const dpr = this._dpr
      try {
        const current = this._ctx.getImageData(0, 0, Math.round(cw * dpr), Math.round(ch * dpr))
        this._undoStack.push(current)
        const next = this._redoStack.pop()
        this._ctx.putImageData(next, 0, 0)
      } catch(e) {}
    },

    onClearAll() {
      wx.showModal({
        title: '全部清除',
        content: '将恢复到原始图片，确定吗？',
        success: (r) => {
          if (!r.confirm) return
          if (!this._ctx || !this._bgImage) return
          this._saveSnapshot()
          const { canvasW: cw, canvasH: ch } = this.data
          this._ctx.clearRect(0, 0, cw, ch)
          this._ctx.drawImage(this._bgImage, this._imgX, this._imgY, this._imgW, this._imgH)
        }
      })
    },

    // ---- 模式 / 参数 ----
    onModeChange(e) {
      this.setData({ mode: e.currentTarget.dataset.id })
    },

    onBrushSizeTap(e) {
      this.setData({ brushSize: e.currentTarget.dataset.size })
    },

    onBrushSizeTap2(e) {
      this.setData({ brushSize: e.detail.value })
    },

    onIntensityChanging(e) {
      this.setData({ intensity: e.detail.value })
    },
    onIntensityChange(e) {
      this.setData({ intensity: e.detail.value })
    },

    // ---- 触摸绘制 ----
    onTouchStart(e) {
      if (!this._canvas || !this.data.srcPath) return
      this._saveSnapshot()
      this._applyMosaic(e.touches[0])
    },

    onTouchMove(e) {
      if (!this._canvas) return
      this._applyMosaic(e.touches[0])
    },

    onTouchEnd() {},

    _applyMosaic(touch) {
      const ctx = this._ctx
      if (!ctx) return
      const { mode, brushSize, intensity } = this.data
      const x = touch.x, y = touch.y
      const radius = brushSize / 2
      const alpha = intensity / 100

      if (mode === 'fill') {
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

      } else if (mode === 'brush') {
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

      } else if (mode === 'pixel') {
        const blockSize = Math.max(4, Math.round(brushSize / 4))
        const x0 = Math.max(0, Math.round(x - radius))
        const y0 = Math.max(0, Math.round(y - radius))
        const x1 = Math.min(this.data.canvasW, Math.round(x + radius))
        const y1 = Math.min(this.data.canvasH, Math.round(y + radius))
        const dpr = this._dpr
        const pw = Math.round((x1 - x0) * dpr)
        const ph = Math.round((y1 - y0) * dpr)
        if (pw <= 0 || ph <= 0) return
        try {
          const imageData = ctx.getImageData(Math.round(x0 * dpr), Math.round(y0 * dpr), pw, ph)
          const d = imageData.data
          const bw = Math.round(blockSize * dpr)
          const bh = Math.round(blockSize * dpr)
          for (let by = 0; by < ph; by += bh) {
            for (let bx = 0; bx < pw; bx += bw) {
              let cr = 0, cg = 0, cb = 0, cnt = 0
              for (let dy = 0; dy < bh && by + dy < ph; dy++) {
                for (let dx = 0; dx < bw && bx + dx < pw; dx++) {
                  const idx = ((by + dy) * pw + (bx + dx)) * 4
                  cr += d[idx]; cg += d[idx + 1]; cb += d[idx + 2]
                  cnt++
                }
              }
              if (!cnt) continue
              cr = Math.round(cr / cnt); cg = Math.round(cg / cnt); cb = Math.round(cb / cnt)
              for (let dy = 0; dy < bh && by + dy < ph; dy++) {
                for (let dx = 0; dx < bw && bx + dx < pw; dx++) {
                  const idx = ((by + dy) * pw + (bx + dx)) * 4
                  const px = (bx + dx) / dpr + x0 - x
                  const py = (by + dy) / dpr + y0 - y
                  if (px * px + py * py <= radius * radius) {
                    d[idx] = cr; d[idx + 1] = cg; d[idx + 2] = cb
                  }
                }
              }
            }
          }
          ctx.putImageData(imageData, Math.round(x0 * dpr), Math.round(y0 * dpr))
        } catch(e) {}

      } else if (mode === 'blur') {
        const steps = Math.max(3, Math.round(intensity / 15))
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.clip()
        for (let i = 0; i < steps; i++) {
          const px = x + (Math.random() - 0.5) * radius
          const py = y + (Math.random() - 0.5) * radius
          const sr = radius * (0.5 + Math.random() * 0.5)
          const grad = ctx.createRadialGradient(px, py, 0, px, py, sr)
          grad.addColorStop(0, `rgba(128,128,128,${alpha * 0.3})`)
          grad.addColorStop(1, 'rgba(128,128,128,0)')
          ctx.fillStyle = grad
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
        }
        ctx.restore()
      }
    },

    // ---- 导出 ----
    onSave() {
      if (!this.data.srcPath || this.data.exporting) return
      this.setData({ exporting: true })
      wx.showLoading({ title: '导出中...' })

      // 高清导出：在原图尺寸上重绘所有涂抹
      // 简单方案：直接把当前预览 canvas 内容 canvasToTempFilePath
      // 但要先在原图分辨率的 canvas 上重绘
      this._exportAtFullRes()
    },

    _exportAtFullRes() {
      // 步骤：
      // 1. 把预览 canvas 导出为临时图（含涂抹层，含四周黑边）
      // 2. 在 exportCanvas 上：先画原图全尺寸，再把预览图中图片区域裁剪出来叠加
      this.createSelectorQuery()
        .select('#mosaicCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            wx.hideLoading(); this.setData({ exporting: false })
            return
          }
          const canvas = res[0].node
          wx.canvasToTempFilePath({
            canvas,
            fileType: 'png',   // png 保留透明度，避免黑边混入
            quality: 1,
            success: (r) => {
              this._renderExportCanvas(r.tempFilePath)
            },
            fail: () => {
              wx.hideLoading(); this.setData({ exporting: false })
              wx.showToast({ title: '导出失败', icon: 'error' })
            }
          })
        })
    },

    _renderExportCanvas(previewPath) {
      const nw = this._naturalW
      const nh = this._naturalH
      const MAX = 4096
      let ow = nw, oh = nh
      if (ow > MAX || oh > MAX) {
        const r = Math.min(MAX / ow, MAX / oh)
        ow = Math.round(ow * r); oh = Math.round(oh * r)
      }

      // 预览 canvas 中，图片的显示区域（CSS px，不含 dpr）
      const prevImgX = this._imgX
      const prevImgY = this._imgY
      const prevImgW = this._imgW
      const prevImgH = this._imgH
      const dpr = this._dpr

      this.createSelectorQuery()
        .select('#mosaicExportCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            wx.hideLoading(); this.setData({ exporting: false })
            return
          }
          const canvas = res[0].node
          canvas.width  = ow
          canvas.height = oh
          const ctx = canvas.getContext('2d')

          // 先画原图
          const bgImg = canvas.createImage()
          bgImg.onload = () => {
            ctx.drawImage(bgImg, 0, 0, ow, oh)

            // 再把预览截图中图片对应区域叠加（精准裁切涂抹层）
            // 预览截图尺寸 = canvasW * dpr × canvasH * dpr
            // 图片区域在截图中的像素坐标：
            const srcX = Math.round(prevImgX * dpr)
            const srcY = Math.round(prevImgY * dpr)
            const srcW = Math.round(prevImgW * dpr)
            const srcH = Math.round(prevImgH * dpr)

            const overlayImg = canvas.createImage()
            overlayImg.onload = () => {
              // 从预览截图中只取图片区域，映射到导出画布全尺寸
              ctx.drawImage(overlayImg, srcX, srcY, srcW, srcH, 0, 0, ow, oh)

              wx.canvasToTempFilePath({
                canvas,
                fileType: 'jpg',
                quality: 0.95,
                success: (r) => {
                  wx.hideLoading()
                  this.setData({ exporting: false })
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
                  wx.hideLoading(); this.setData({ exporting: false })
                  wx.showToast({ title: '导出失败', icon: 'error' })
                }
              })
            }
            overlayImg.onerror = () => {
              wx.hideLoading(); this.setData({ exporting: false })
              wx.showToast({ title: '合成失败', icon: 'error' })
            }
            overlayImg.src = previewPath
          }
          bgImg.onerror = () => {
            wx.hideLoading(); this.setData({ exporting: false })
            wx.showToast({ title: '读取原图失败', icon: 'error' })
          }
          bgImg.src = this.data.srcPath
        })
    },
  },
})
