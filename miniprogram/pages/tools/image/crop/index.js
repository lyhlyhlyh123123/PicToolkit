// pages/tools/image/crop/index.js

const RATIO_OPTIONS = [
  { id: '1:1',   name: '1:1',  desc: '方形',     ratio: 1,         iconW: 28, iconH: 28, outW: 0,    outH: 0    },
  { id: '4:3',   name: '4:3',  desc: '标准',     ratio: 4/3,       iconW: 32, iconH: 24, outW: 0,    outH: 0    },
  { id: '16:9',  name: '16:9', desc: '宽屏',     ratio: 16/9,      iconW: 36, iconH: 20, outW: 0,    outH: 0    },
  { id: 'free',  name: '自由', desc: '自定义',   ratio: 0,         iconW: 28, iconH: 28, outW: 0,    outH: 0    },
  { id: '1cun',  name: '一寸', desc: '295×413px', ratio: 295/413,  iconW: 20, iconH: 28, outW: 295,  outH: 413  },
  { id: '2cun',  name: '二寸', desc: '413×579px', ratio: 413/579,  iconW: 22, iconH: 28, outW: 413,  outH: 579  },
  { id: 'cv',    name: '简历照', desc: '4:5比例', ratio: 4/5,      iconW: 24, iconH: 28, outW: 0,    outH: 0    },
]

// 裁剪框最小尺寸（显示 px）
const MIN_BOX = 30

Component({
  data: {
    srcPath: '',
    // canvas 显示尺寸
    canvasW: 0,
    canvasH: 0,
    // 裁剪框（显示坐标）
    boxX: 0, boxY: 0, boxW: 0, boxH: 0,
    // 输出像素
    cropW: 1080,
    cropH: 1080,
    lockRatio: true,
    activeRatio: '1:1',
    ratioOptions: RATIO_OPTIONS,
  },

  _canvas: null,
  _ctx: null,
  _bgImage: null,
  // 图片在 canvas 上的绘制区域（contain 后）
  _imgX: 0, _imgY: 0, _imgW: 0, _imgH: 0,
  // 原图像素尺寸
  _naturalW: 0, _naturalH: 0,
  // 触摸拖拽
  _dragging: false,
  _dragMode: '', // 'move' | corner id
  _touchStartX: 0, _touchStartY: 0,
  _boxSnapshot: null,

  lifetimes: {
    ready() {
      // 页面加载时测量容器（此时占位符分支已渲染，#cropWrap 存在）
      this._measureWrap()
    }
  },

  methods: {
    onBack() { wx.navigateBack() },

    _measureWrap(cb) {
      this.createSelectorQuery()
        .select('#cropWrap')
        .boundingClientRect(rect => {
          if (rect && rect.width > 0) {
            this._wrapW = rect.width
            this._wrapH = rect.height
          }
          if (cb) cb()
        }).exec()
    },

    onChooseImage() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const path = res.tempFiles[0].tempFilePath
          // 每次选图前重新测量，确保拿到真实容器尺寸
          this._measureWrap(() => {
            wx.getImageInfo({
              src: path,
              success: (info) => {
                this._naturalW = info.width
                this._naturalH = info.height
                const wrapW = this._wrapW || 320
                const wrapH = this._wrapH || 400
                // contain 缩放
                const imgRatio = info.width / info.height
                const wrapRatio = wrapW / wrapH
                let imgDispW, imgDispH
                if (imgRatio >= wrapRatio) {
                  imgDispW = wrapW; imgDispH = wrapW / imgRatio
                } else {
                  imgDispH = wrapH; imgDispW = wrapH * imgRatio
                }
                const imgX = (wrapW - imgDispW) / 2
                const imgY = (wrapH - imgDispH) / 2
                this._imgX = imgX; this._imgY = imgY
                this._imgW = imgDispW; this._imgH = imgDispH

                this.setData({
                  srcPath: path,
                  canvasW: wrapW,
                  canvasH: wrapH,
                }, () => {
                  this._initCanvas(path, wrapW, wrapH, imgX, imgY, imgDispW, imgDispH)
                })
              }
            })
          })
        }
      })
    },

    _initCanvas(imgPath, cw, ch, imgX, imgY, imgW, imgH) {
      this.createSelectorQuery()
        .select('#cropCanvas')
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

          const img = canvas.createImage()
          img.onload = () => {
            this._bgImage = img
            // 初始裁剪框 = 图片区域
            const { activeRatio } = this.data
            const ropt = RATIO_OPTIONS.find(r => r.id === activeRatio)
            this._resetBox(ropt ? ropt.ratio : 1, imgX, imgY, imgW, imgH)
          }
          img.src = imgPath
        })
    },

    // 根据比例重置裁剪框
    _resetBox(ratio, imgX, imgY, imgW, imgH) {
      imgX  = imgX  !== undefined ? imgX  : this._imgX
      imgY  = imgY  !== undefined ? imgY  : this._imgY
      imgW  = imgW  !== undefined ? imgW  : this._imgW
      imgH  = imgH  !== undefined ? imgH  : this._imgH
      let bw, bh
      if (!ratio) {
        // 自由：默认方形
        bw = bh = Math.min(imgW, imgH)
      } else {
        const imgAspect = imgW / imgH
        if (ratio >= imgAspect) {
          bw = imgW; bh = bw / ratio
        } else {
          bh = imgH; bw = bh * ratio
        }
      }
      bw = Math.min(bw, imgW); bh = Math.min(bh, imgH)
      const bx = imgX + (imgW - bw) / 2
      const by = imgY + (imgH - bh) / 2
      // 有固定输出尺寸（一寸/二寸）时保留，否则按自然像素计算
      const ropt = RATIO_OPTIONS.find(r => r.id === this.data.activeRatio)
      let outW, outH
      if (ropt && ropt.outW) {
        outW = ropt.outW; outH = ropt.outH
      } else {
        const scaleX = this._naturalW / this._imgW
        const scaleY = this._naturalH / this._imgH
        outW = Math.round(bw * scaleX)
        outH = Math.round(bh * scaleY)
      }
      this.setData({ boxX: bx, boxY: by, boxW: bw, boxH: bh, cropW: outW, cropH: outH }, () => {
        this._redraw()
      })
    },

    _redraw() {
      if (!this._ctx || !this._bgImage) return
      const { canvasW, canvasH, boxX, boxY, boxW, boxH } = this.data
      const ctx = this._ctx

      ctx.clearRect(0, 0, canvasW, canvasH)

      // 绘制底图（稍暗）
      ctx.globalAlpha = 0.5
      ctx.drawImage(this._bgImage, this._imgX, this._imgY, this._imgW, this._imgH)
      ctx.globalAlpha = 1

      // 裁剪区域：亮度正常
      ctx.save()
      ctx.beginPath()
      ctx.rect(boxX, boxY, boxW, boxH)
      ctx.clip()
      ctx.drawImage(this._bgImage, this._imgX, this._imgY, this._imgW, this._imgH)
      ctx.restore()

      // 网格线（三等分）
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 0.5
      for (let i = 1; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(boxX + (boxW / 3) * i, boxY)
        ctx.lineTo(boxX + (boxW / 3) * i, boxY + boxH)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(boxX, boxY + (boxH / 3) * i)
        ctx.lineTo(boxX + boxW, boxY + (boxH / 3) * i)
        ctx.stroke()
      }

      // 裁剪框边框
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.strokeRect(boxX, boxY, boxW, boxH)

      // 四角手柄
      const hs = 10
      const corners = [
        [boxX, boxY], [boxX + boxW, boxY],
        [boxX, boxY + boxH], [boxX + boxW, boxY + boxH]
      ]
      ctx.fillStyle = '#FFFFFF'
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs)
      })
    },

    // ---- 触摸交互 ----
    onTouchStart(e) {
      if (!this._canvas) return
      const touch = e.touches[0]
      const { boxX, boxY, boxW, boxH } = this.data
      const hs = 20  // 命中区域
      const tx = touch.x, ty = touch.y

      // 判断命中角点
      const corners = [
        { id: 'tl', x: boxX, y: boxY },
        { id: 'tr', x: boxX + boxW, y: boxY },
        { id: 'bl', x: boxX, y: boxY + boxH },
        { id: 'br', x: boxX + boxW, y: boxY + boxH },
      ]
      let mode = ''
      for (const c of corners) {
        if (Math.abs(tx - c.x) < hs && Math.abs(ty - c.y) < hs) {
          mode = c.id; break
        }
      }
      if (!mode && tx > boxX && tx < boxX + boxW && ty > boxY && ty < boxY + boxH) {
        mode = 'move'
      }
      if (!mode) return
      this._dragging = true
      this._dragMode = mode
      this._touchStartX = tx
      this._touchStartY = ty
      this._boxSnapshot = { boxX, boxY, boxW, boxH }
    },

    onTouchMove(e) {
      if (!this._dragging) return
      const touch = e.touches[0]
      const dx = touch.x - this._touchStartX
      const dy = touch.y - this._touchStartY
      const snap = this._boxSnapshot
      const { activeRatio } = this.data
      const ropt = RATIO_OPTIONS.find(r => r.id === activeRatio)
      const ratio = ropt ? ropt.ratio : 0
      const imgX = this._imgX, imgY = this._imgY, imgW = this._imgW, imgH = this._imgH

      let { boxX, boxY, boxW, boxH } = snap
      const mode = this._dragMode

      if (mode === 'move') {
        boxX = Math.max(imgX, Math.min(imgX + imgW - boxW, snap.boxX + dx))
        boxY = Math.max(imgY, Math.min(imgY + imgH - boxH, snap.boxY + dy))
      } else {
        // 拖拽角点 resize
        if (mode === 'br') {
          boxW = Math.max(MIN_BOX, Math.min(imgX + imgW - boxX, snap.boxW + dx))
          if (ratio) boxH = boxW / ratio
          else boxH = Math.max(MIN_BOX, Math.min(imgY + imgH - boxY, snap.boxH + dy))
        } else if (mode === 'bl') {
          const newW = Math.max(MIN_BOX, Math.min(snap.boxW - dx, snap.boxX + snap.boxW - imgX))
          boxX = snap.boxX + snap.boxW - newW
          boxW = newW
          if (ratio) boxH = boxW / ratio
          else boxH = Math.max(MIN_BOX, Math.min(imgY + imgH - boxY, snap.boxH + dy))
        } else if (mode === 'tr') {
          boxW = Math.max(MIN_BOX, Math.min(imgX + imgW - boxX, snap.boxW + dx))
          if (ratio) { const newH = boxW / ratio; boxY = snap.boxY + snap.boxH - newH; boxH = newH }
          else { const newH = Math.max(MIN_BOX, snap.boxH - dy); boxY = snap.boxY + snap.boxH - newH; boxH = newH }
        } else if (mode === 'tl') {
          const newW = Math.max(MIN_BOX, Math.min(snap.boxW - dx, snap.boxX + snap.boxW - imgX))
          boxX = snap.boxX + snap.boxW - newW; boxW = newW
          if (ratio) { const newH = boxW / ratio; boxY = snap.boxY + snap.boxH - newH; boxH = newH }
          else { const newH = Math.max(MIN_BOX, snap.boxH - dy); boxY = snap.boxY + snap.boxH - newH; boxH = newH }
        }
        // 边界约束
        if (boxX < imgX) { boxW -= imgX - boxX; boxX = imgX }
        if (boxY < imgY) { boxH -= imgY - boxY; boxY = imgY }
        if (boxX + boxW > imgX + imgW) boxW = imgX + imgW - boxX
        if (boxY + boxH > imgY + imgH) boxH = imgY + imgH - boxY
      }

      // 更新输出像素
      const scaleX = this._naturalW / this._imgW
      const scaleY = this._naturalH / this._imgH
      const outW = Math.round(boxW * scaleX)
      const outH = Math.round(boxH * scaleY)

      this.setData({ boxX, boxY, boxW, boxH, cropW: outW, cropH: outH }, () => {
        this._redraw()
      })
    },

    onTouchEnd() {
      this._dragging = false
    },

    onRatioTap(e) {
      const id = e.currentTarget.dataset.id
      const ropt = RATIO_OPTIONS.find(r => r.id === id)
      const update = { activeRatio: id }
      // 一寸/二寸有固定输出尺寸，直接设置
      if (ropt && ropt.outW) {
        update.cropW = ropt.outW
        update.cropH = ropt.outH
      }
      this.setData(update, () => {
        this._resetBox(ropt ? ropt.ratio : 0)
      })
    },

    onToggleLock() {
      this.setData({ lockRatio: !this.data.lockRatio })
    },

    onCropWInput(e) {
      const val = parseInt(e.detail.value) || 1
      const update = { cropW: val }
      if (this.data.lockRatio && this._naturalW) {
        const aspect = this.data.cropH / this.data.cropW
        update.cropH = Math.round(val * aspect)
      }
      this.setData(update)
    },

    onCropHInput(e) {
      const val = parseInt(e.detail.value) || 1
      const update = { cropH: val }
      if (this.data.lockRatio && this._naturalH) {
        const aspect = this.data.cropW / this.data.cropH
        update.cropW = Math.round(val * aspect)
      }
      this.setData(update)
    },

    onReset() {
      const ropt = RATIO_OPTIONS.find(r => r.id === this.data.activeRatio)
      this._resetBox(ropt ? ropt.ratio : 0)
    },

    onZoom() {
      if (!this.data.srcPath) return
      wx.previewImage({ urls: [this.data.srcPath] })
    },

    onCrop() {
      if (!this.data.srcPath) return
      const { boxX, boxY, boxW, boxH, cropW, cropH } = this.data
      const scaleX = this._naturalW / this._imgW
      const scaleY = this._naturalH / this._imgH

      // 图片上的实际裁剪区域（像素）
      const srcX = Math.round((boxX - this._imgX) * scaleX)
      const srcY = Math.round((boxY - this._imgY) * scaleY)
      const srcW = Math.round(boxW * scaleX)
      const srcH = Math.round(boxH * scaleY)

      wx.showLoading({ title: '裁剪中...' })

      this.createSelectorQuery()
        .select('#cropCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) { wx.hideLoading(); return }
          const canvas = res[0].node
          // 切换到输出尺寸
          canvas.width  = cropW
          canvas.height = cropH
          const ctx = canvas.getContext('2d')

          const img = canvas.createImage()
          img.onload = () => {
            ctx.clearRect(0, 0, cropW, cropH)
            ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, cropW, cropH)

            wx.canvasToTempFilePath({
              canvas,
              fileType: 'jpg',
              quality: 0.95,
              success: (r) => {
                // 恢复预览 canvas
                const dpr = this._dpr || 2
                const { canvasW, canvasH } = this.data
                canvas.width  = Math.round(canvasW * dpr)
                canvas.height = Math.round(canvasH * dpr)
                const pctx = canvas.getContext('2d')
                pctx.scale(dpr, dpr)
                this._ctx = pctx
                this._redraw()

                wx.hideLoading()
                wx.saveImageToPhotosAlbum({
                  filePath: r.tempFilePath,
                  success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
                  fail:    () => wx.showToast({ title: '请授权相册权限', icon: 'none' }),
                })
              },
              fail: () => { wx.hideLoading(); wx.showToast({ title: '裁剪失败', icon: 'error' }) }
            })
          }
          img.src = this.data.srcPath
        })
    },
  },
})
