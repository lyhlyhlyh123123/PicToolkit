// pages/tools/calc/workday/index.js
//
// 日期推算工具
// 模式1：推算日期 - 从起始日期加减N天（可选排除周末）
// 模式2：计算间隔 - 计算两个日期之间的天数差（可选只算工作日）

// 法定节假日（2024-2026，近三年的主要节日，本地化存储）
// 格式：'YYYY-MM-DD'
const HOLIDAYS = new Set([
  // 2024
  '2024-01-01','2024-02-10','2024-02-11','2024-02-12','2024-02-13','2024-02-14','2024-02-15','2024-02-16','2024-02-17',
  '2024-04-04','2024-04-05','2024-04-06',
  '2024-05-01','2024-05-02','2024-05-03','2024-05-04','2024-05-05',
  '2024-06-10',
  '2024-09-15','2024-09-16','2024-09-17',
  '2024-10-01','2024-10-02','2024-10-03','2024-10-04','2024-10-05','2024-10-06','2024-10-07',
  // 2025
  '2025-01-01',
  '2025-01-28','2025-01-29','2025-01-30','2025-01-31','2025-02-01','2025-02-02','2025-02-03','2025-02-04',
  '2025-04-04','2025-04-05','2025-04-06',
  '2025-05-01','2025-05-02','2025-05-03','2025-05-04','2025-05-05',
  '2025-05-31','2025-06-01','2025-06-02',
  '2025-10-01','2025-10-02','2025-10-03','2025-10-04','2025-10-05','2025-10-06','2025-10-07','2025-10-08',
  // 2026
  '2026-01-01',
  '2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-21','2026-02-22','2026-02-23','2026-02-24',
  '2026-04-05','2026-04-06','2026-04-07',
  '2026-05-01','2026-05-02','2026-05-03','2026-05-04','2026-05-05',
  '2026-06-19','2026-06-20','2026-06-21',
  '2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06','2026-10-07',
])

// 调休工作日（节假日前后补班，视为工作日）
const WORKDAY_OVERRIDES = new Set([
  '2024-02-04','2024-02-18','2024-04-07','2024-04-28','2024-05-11','2024-09-14','2024-09-29','2024-10-12',
  '2025-01-26','2025-02-08','2025-04-27','2025-09-28','2025-10-11',
])

function dateToStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function strToDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isWeekend(d) {
  const day = d.getDay()
  return day === 0 || day === 6
}

function isWorkday(d) {
  const s = dateToStr(d)
  if (WORKDAY_OVERRIDES.has(s)) return true   // 调休工作日
  if (HOLIDAYS.has(s)) return false            // 法定节假日
  return !isWeekend(d)                         // 普通工作日
}

function isRestday(d) {
  return !isWorkday(d)
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDate(d) {
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`
}

function formatWeekday(d) {
  return '星期' + WEEKDAYS[d.getDay()]
}

// 推算日期：从 startDate 起，正/负 n 个有效日期（工作日或自然日）
function calcForwardDate(startStr, days, workdayOnly) {
  let d = strToDate(startStr)
  const dir = days >= 0 ? 1 : -1
  let remaining = Math.abs(days)

  if (workdayOnly) {
    while (remaining > 0) {
      d = new Date(d.getTime() + dir * 86400000)
      if (isWorkday(d)) remaining--
    }
  } else {
    d = new Date(d.getTime() + dir * remaining * 86400000)
  }
  return d
}

// 计算间隔：两个日期之间的天数（工作日或自然日）
function calcInterval(startStr, endStr, workdayOnly) {
  let s = strToDate(startStr)
  let e = strToDate(endStr)
  if (s > e) { const tmp = s; s = e; e = tmp }

  if (!workdayOnly) {
    return Math.round((e - s) / 86400000)
  }

  let count = 0
  const cur = new Date(s.getTime())
  while (cur < e) {
    cur.setDate(cur.getDate() + 1)
    if (isWorkday(cur)) count++
  }
  return count
}

Component({
  data: {
    mode: 'forward',    // 'forward' | 'interval'
    startDate: '',
    endDate: '',
    days: '30',
    workdayOnly: false,
    // 结果
    resultDate: '',
    resultWeekday: '',
    resultDays: null,
    hasResult: false,
    history: [],
  },

  lifetimes: {
    ready() {
      const today = dateToStr(new Date())
      this.setData({ startDate: today, endDate: today })
    },
  },

  methods: {
    onBack() { wx.navigateBack() },

    onModeForward() { this.setData({ mode: 'forward', hasResult: false }) },
    onModeInterval() { this.setData({ mode: 'interval', hasResult: false }) },

    onStartDateChange(e) {
      this.setData({ startDate: e.detail.value, hasResult: false })
    },

    onEndDateChange(e) {
      this.setData({ endDate: e.detail.value, hasResult: false })
    },

    onDaysInput(e) {
      const val = e.detail.value.replace(/[^\d-]/g, '')
      this.setData({ days: val, hasResult: false })
    },

    onToggleWorkday() {
      this.setData({ workdayOnly: !this.data.workdayOnly, hasResult: false })
    },

    onCalc() {
      const { mode, startDate, endDate, days, workdayOnly } = this.data
      if (!startDate) { wx.showToast({ title: '请选择起始日期', icon: 'none' }); return }

      if (mode === 'forward') {
        const n = parseInt(days, 10)
        if (isNaN(n)) { wx.showToast({ title: '请输入有效天数', icon: 'none' }); return }
        const result = calcForwardDate(startDate, n, workdayOnly)
        const resultStr = formatDate(result)
        const weekStr = formatWeekday(result)
        const histEntry = `${startDate} ${workdayOnly ? '工作日' : '自然日'} +${n}天 → ${resultStr}`
        this.setData({
          hasResult: true,
          resultDate: resultStr,
          resultWeekday: weekStr,
          resultDays: null,
          history: [histEntry, ...this.data.history].slice(0, 5),
        })
      } else {
        if (!endDate) { wx.showToast({ title: '请选择结束日期', icon: 'none' }); return }
        const count = calcInterval(startDate, endDate, workdayOnly)
        const histEntry = `${startDate} 至 ${endDate} = ${count}${workdayOnly ? '个工作日' : '天'}`
        this.setData({
          hasResult: true,
          resultDate: '',
          resultWeekday: '',
          resultDays: count,
          history: [histEntry, ...this.data.history].slice(0, 5),
        })
      }
    },

    onShowHistory() {
      const { history } = this.data
      if (!history.length) { wx.showToast({ title: '暂无历史', icon: 'none' }); return }
      wx.showActionSheet({ itemList: history, success: () => {}, fail: () => {} })
    },
  },
})
