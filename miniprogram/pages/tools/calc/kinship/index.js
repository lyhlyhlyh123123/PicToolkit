// pages/tools/calc/kinship/index.js
//
// 亲戚关系计算器
// 用"关系链"方式：从"我"出发，每按一个亲戚按钮就往链上追加一步，
// 最后查表输出称呼。
//
// 数据结构：每个节点是一个关系字符串，如 'father'/'mother'/'husband' 等，
// 通过 KINSHIP_MAP[gender][style][chain] 查找称呼。

// ─── 关系链定义 ───
// 每个按钮对应一个关系 key
const REL_LABELS = {
  father:   { zh: '父', en: 'FATHER'   },
  mother:   { zh: '母', en: 'MOTHER'   },
  husband:  { zh: '夫', en: 'HUSBAND'  },
  wife:     { zh: '妻', en: 'WIFE'     },
  elder_brother:   { zh: '兄', en: 'BROTHER'  },
  younger_brother: { zh: '弟', en: 'YOUNGER'  },
  elder_sister:    { zh: '姐', en: 'SISTER'   },
  younger_sister:  { zh: '妹', en: 'YOUNGER'  },
  son:      { zh: '子', en: 'SON'      },
  daughter: { zh: '女', en: 'DAUGHTER' },
}

// ─── 称呼查找表（从"我"角度，链 = 关系数组 join('/')）───
// 规则：以"我是男性"为主，女性部分关系有调整
// style: 'formal'=正式, 'casual'=口语
// 仅列举常见组合，其他返回描述性文本

const TABLE = {
  // ── 一级 ──
  'father':           { m: { f: '父亲',   c: '爸爸'   }, f: { f: '父亲',   c: '爸爸'   } },
  'mother':           { m: { f: '母亲',   c: '妈妈'   }, f: { f: '母亲',   c: '妈妈'   } },
  'husband':          { m: { f: '—',      c: '—'      }, f: { f: '丈夫',   c: '老公'   } },
  'wife':             { m: { f: '妻子',   c: '老婆'   }, f: { f: '—',      c: '—'      } },
  'elder_brother':    { m: { f: '兄长',   c: '哥哥'   }, f: { f: '兄长',   c: '哥哥'   } },
  'younger_brother':  { m: { f: '弟弟',   c: '弟弟'   }, f: { f: '弟弟',   c: '弟弟'   } },
  'elder_sister':     { m: { f: '姐姐',   c: '姐姐'   }, f: { f: '姐姐',   c: '姐姐'   } },
  'younger_sister':   { m: { f: '妹妹',   c: '妹妹'   }, f: { f: '妹妹',   c: '妹妹'   } },
  'son':              { m: { f: '儿子',   c: '儿子'   }, f: { f: '儿子',   c: '儿子'   } },
  'daughter':         { m: { f: '女儿',   c: '女儿'   }, f: { f: '女儿',   c: '女儿'   } },

  // ── 二级：父/母的... ──
  'father/father':         { m: { f: '祖父', c: '爷爷' }, f: { f: '祖父', c: '爷爷' } },
  'father/mother':         { m: { f: '祖母', c: '奶奶' }, f: { f: '祖母', c: '奶奶' } },
  'mother/father':         { m: { f: '外祖父', c: '姥爷' }, f: { f: '外祖父', c: '姥爷' } },
  'mother/mother':         { m: { f: '外祖母', c: '姥姥' }, f: { f: '外祖母', c: '姥姥' } },
  'father/elder_brother':  { m: { f: '伯父', c: '大爷' }, f: { f: '伯父', c: '大爷' } },
  'father/younger_brother':{ m: { f: '叔父', c: '叔叔' }, f: { f: '叔父', c: '叔叔' } },
  'father/elder_sister':   { m: { f: '姑母', c: '姑姑' }, f: { f: '姑母', c: '姑姑' } },
  'father/younger_sister': { m: { f: '姑母', c: '姑姑' }, f: { f: '姑母', c: '姑姑' } },
  'mother/elder_brother':  { m: { f: '舅父', c: '舅舅' }, f: { f: '舅父', c: '舅舅' } },
  'mother/younger_brother':{ m: { f: '舅父', c: '舅舅' }, f: { f: '舅父', c: '舅舅' } },
  'mother/elder_sister':   { m: { f: '姨母', c: '阿姨' }, f: { f: '姨母', c: '阿姨' } },
  'mother/younger_sister': { m: { f: '姨母', c: '阿姨' }, f: { f: '姨母', c: '阿姨' } },

  // 父的配偶
  'father/elder_brother/wife':   { m: { f: '伯母', c: '大娘' }, f: { f: '伯母', c: '大娘' } },
  'father/younger_brother/wife': { m: { f: '婶母', c: '婶婶' }, f: { f: '婶母', c: '婶婶' } },
  'father/elder_sister/husband': { m: { f: '姑父', c: '姑父' }, f: { f: '姑父', c: '姑父' } },
  'father/younger_sister/husband':{ m: { f: '姑父', c: '姑父' }, f: { f: '姑父', c: '姑父' } },
  'mother/elder_brother/wife':   { m: { f: '舅母', c: '舅妈' }, f: { f: '舅母', c: '舅妈' } },
  'mother/younger_brother/wife': { m: { f: '舅母', c: '舅妈' }, f: { f: '舅母', c: '舅妈' } },
  'mother/elder_sister/husband': { m: { f: '姨父', c: '姨父' }, f: { f: '姨父', c: '姨父' } },
  'mother/younger_sister/husband':{ m: { f: '姨父', c: '姨父' }, f: { f: '姨父', c: '姨父' } },

  // ── 兄弟姐妹的子女 ──
  'elder_brother/son':      { m: { f: '侄子', c: '侄子' }, f: { f: '侄子', c: '侄子' } },
  'elder_brother/daughter': { m: { f: '侄女', c: '侄女' }, f: { f: '侄女', c: '侄女' } },
  'younger_brother/son':    { m: { f: '侄子', c: '侄子' }, f: { f: '侄子', c: '侄子' } },
  'younger_brother/daughter':{ m: { f: '侄女', c: '侄女' }, f: { f: '侄女', c: '侄女' } },
  'elder_sister/son':       { m: { f: '外甥', c: '外甥' }, f: { f: '外甥', c: '外甥' } },
  'elder_sister/daughter':  { m: { f: '外甥女', c: '外甥女' }, f: { f: '外甥女', c: '外甥女' } },
  'younger_sister/son':     { m: { f: '外甥', c: '外甥' }, f: { f: '外甥', c: '外甥' } },
  'younger_sister/daughter':{ m: { f: '外甥女', c: '外甥女' }, f: { f: '外甥女', c: '外甥女' } },

  // ── 子女的配偶 ──
  'son/wife':      { m: { f: '儿媳', c: '儿媳妇' }, f: { f: '儿媳', c: '儿媳妇' } },
  'daughter/husband': { m: { f: '女婿', c: '女婿' }, f: { f: '女婿', c: '女婿' } },

  // ── 子女的子女 ──
  'son/son':        { m: { f: '孙子', c: '孙子' }, f: { f: '孙子', c: '孙子' } },
  'son/daughter':   { m: { f: '孙女', c: '孙女' }, f: { f: '孙女', c: '孙女' } },
  'daughter/son':   { m: { f: '外孙', c: '外孙' }, f: { f: '外孙', c: '外孙' } },
  'daughter/daughter':{ m: { f: '外孙女', c: '外孙女' }, f: { f: '外孙女', c: '外孙女' } },

  // ── 配偶的父母（男性自称）──
  'wife/father':  { m: { f: '岳父', c: '岳父' }, f: { f: '—', c: '—' } },
  'wife/mother':  { m: { f: '岳母', c: '岳母' }, f: { f: '—', c: '—' } },
  'husband/father': { m: { f: '—', c: '—' }, f: { f: '公公', c: '公公' } },
  'husband/mother': { m: { f: '—', c: '—' }, f: { f: '婆婆', c: '婆婆' } },

  // ── 配偶的兄弟姐妹（男性）──
  'wife/elder_brother':   { m: { f: '大舅子', c: '大舅子' }, f: { f: '—', c: '—' } },
  'wife/younger_brother': { m: { f: '小舅子', c: '小舅子' }, f: { f: '—', c: '—' } },
  'wife/elder_sister':    { m: { f: '大姨子', c: '大姨子' }, f: { f: '—', c: '—' } },
  'wife/younger_sister':  { m: { f: '小姨子', c: '小姨子' }, f: { f: '—', c: '—' } },
  // 女性
  'husband/elder_brother':   { m: { f: '—', c: '—' }, f: { f: '大伯子', c: '大伯哥' } },
  'husband/younger_brother': { m: { f: '—', c: '—' }, f: { f: '小叔子', c: '小叔子' } },
  'husband/elder_sister':    { m: { f: '—', c: '—' }, f: { f: '大姑子', c: '大姑姐' } },
  'husband/younger_sister':  { m: { f: '—', c: '—' }, f: { f: '小姑子', c: '小姑子' } },

  // ── 祖父母的子女（叔伯姑的父亲那边）──
  'father/father/father': { m: { f: '曾祖父', c: '太爷爷' }, f: { f: '曾祖父', c: '太爷爷' } },
  'father/father/mother': { m: { f: '曾祖母', c: '太奶奶' }, f: { f: '曾祖母', c: '太奶奶' } },
}

// 生成描述性关系链文本
function chainToDesc(chain) {
  if (!chain.length) return ''
  return '我的' + chain.map(k => REL_LABELS[k] ? REL_LABELS[k].zh : k).join('的')
}

// 查表
function lookup(chain, gender, style) {
  const key = chain.join('/')
  const g = gender === 'male' ? 'm' : 'f'
  const s = style === 'formal' ? 'f' : 'c'
  const entry = TABLE[key]
  if (entry) return entry[g][s] || entry[g]['f'] || ''
  return ''
}

Component({
  data: {
    gender: 'male',    // 'male' | 'female'
    style: 'formal',   // 'formal' | 'casual'
    chain: [],         // 关系链数组
    chainDesc: '',
    result: '',
    history: [],       // [{desc, result}]
  },

  methods: {
    onBack() { wx.navigateBack() },

    onToggleGender() {
      const gender = this.data.gender === 'male' ? 'female' : 'male'
      this.setData({ gender }, () => this._update())
    },

    onToggleStyle() {
      const style = this.data.style === 'formal' ? 'casual' : 'formal'
      this.setData({ style }, () => this._update())
    },

    onAC() {
      this.setData({ chain: [], chainDesc: '', result: '' })
    },

    onDel() {
      const chain = this.data.chain.slice(0, -1)
      this.setData({ chain }, () => this._update())
    },

    onRelTap(e) {
      const rel = e.currentTarget.dataset.rel
      const chain = [...this.data.chain, rel]
      // 最多6步，防止过长
      if (chain.length > 6) {
        wx.showToast({ title: '关系链最长6步', icon: 'none' }); return
      }
      this.setData({ chain }, () => this._update())
    },

    _update() {
      const { chain, gender, style } = this.data
      const chainDesc = chainToDesc(chain)
      const result = chain.length ? (lookup(chain, gender, style) || '') : ''
      this.setData({ chainDesc, result })
    },

    onEqual() {
      const { chain, result, chainDesc } = this.data
      if (!chain.length) return
      if (!result) {
        wx.showToast({ title: '暂未收录此关系', icon: 'none' }); return
      }
      // 加入历史
      const history = [{ desc: chainDesc, result }, ...this.data.history].slice(0, 10)
      this.setData({ history })
    },

    onShowHistory() {
      const { history } = this.data
      if (!history.length) { wx.showToast({ title: '暂无历史记录', icon: 'none' }); return }
      const items = history.map(h => `${h.desc} → ${h.result}`)
      wx.showActionSheet({
        itemList: items,
        success: () => {},
        fail: () => {},
      })
    },

    onClearHistory() {
      this.setData({ history: [] })
      wx.showToast({ title: '已清除', icon: 'success' })
    },
  },
})
