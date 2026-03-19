import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import useWindowSize from '../hooks/useWindowSize'
import PageLayout from '../components/PageLayout'
import API from '../api/axios'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const DEFAULT_SECTIONS = [
  { key: '180ml',  label: '180ml',  type: 'IMFL', visible: true },
  { key: '375ml',  label: '375ml',  type: 'IMFL', visible: true },
  { key: '750ml',  label: '750ml',  type: 'IMFL', visible: true },
  { key: '1000ml', label: '1000ml', type: 'IMFL', visible: true },
  { key: 'beer',   label: 'Beer',   type: 'BEER', visible: true },
]

const PRICE_ORDER = ['Low', 'Medium', 'Premium']

const Report = () => {
  const { colors } = useTheme()
  const { isMobile } = useWindowSize()

  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [reportData, setReportData]     = useState(null)
  const [loading, setLoading]           = useState(false)
  const [sections, setSections]         = useState(DEFAULT_SECTIONS)
  const [editableStock, setEditableStock] = useState({})
  const [posAmount, setPosAmount]       = useState('')
  const [cashAmount, setCashAmount]     = useState('')
  const [shopDetails, setShopDetails]   = useState({
    name: 'TAMIL NADU STATE MARKETING LIMITED',
    area: 'KANCHEEPURAM NORTH',
    shopNo: '4359'
  })
  const [editingShop, setEditingShop]   = useState(false)
  const [shopForm, setShopForm]         = useState(shopDetails)

  // Load shop details
  useEffect(() => {
    API.get('/config/shop')
      .then(res => {
        setShopDetails(res.data)
        setShopForm(res.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { 
    if (date) fetchReport() 
  }, [date])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const res = await API.get(`/report?date=${date}`)
      setReportData(res.data)

      const editable = {}
      res.data.stock.forEach(entry => {
        editable[entry._id] = {
          openingStock:   entry.openingStock   || 0,
          totalReceived:  entry.totalReceived  || 0,
          totalAvailable: entry.totalAvailable || 0,
          salesBottles:   entry.salesBottles   || 0,
          salesValue:     entry.salesValue     || 0,
          cbbo:           entry.cbbo           || 0,
          closingCases:   entry.closingCases   || 0,
          closingBottles: entry.closingBottles || 0,
          closingValue:   entry.closingValue   || 0,
        }
      })
      setEditableStock(editable)
      setPosAmount('')
      setCashAmount('')
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'No data found for this date'
      )
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCellEdit = (entryId, field, value) => {
    const num = Number(value) || 0
    setEditableStock(prev => {
      const entry = { ...prev[entryId], [field]: num }
      const stockEntry = reportData.stock.find(s => s._id === entryId)
      const bpc   = stockEntry?.product?.bottlesPerCase || 1
      const price = stockEntry?.product?.price || 0

      if (field === 'salesBottles' || field === 'totalAvailable') {
        entry.cbbo           = entry.totalAvailable - entry.salesBottles
        entry.closingCases   = Math.floor(entry.cbbo / bpc)
        entry.closingBottles = entry.cbbo % bpc
        entry.closingValue   = entry.cbbo * price
        entry.salesValue     = entry.salesBottles * price
      }
      if (field === 'openingStock' || field === 'totalReceived') {
        entry.totalAvailable = entry.openingStock + entry.totalReceived
        entry.cbbo           = entry.totalAvailable - entry.salesBottles
        entry.closingCases   = Math.floor(entry.cbbo / bpc)
        entry.closingBottles = entry.cbbo % bpc
        entry.closingValue   = entry.cbbo * price
        entry.salesValue     = entry.salesBottles * price
      }
      return { ...prev, [entryId]: entry }
    })
  }

  const moveSection = (index, dir) => {
    const s = [...sections]
    const target = index + dir
    if (target < 0 || target >= s.length) return
    ;[s[index], s[target]] = [s[target], s[index]]
    setSections(s)
  }

  const toggleSection = (key) => {
    setSections(prev => prev.map(s =>
      s.key === key ? { ...s, visible: !s.visible } : s
    ))
  }

  const getSectionEntries = (section) => {
    if (!reportData) return []
    if (section.type === 'BEER') {
      // Beer: group by size in order
      const beerSizeOrder = ['650ml', '375ml', '500ml']
      return beerSizeOrder.flatMap(size =>
        reportData.beer[size] || []
      )
    }
    const sizeData = reportData.imfl[section.key]
    if (!sizeData) return []
    return PRICE_ORDER.flatMap(cat => sizeData[cat] || [])
  }

  const getSectionTotals = (entries) => {
    return entries.reduce((acc, entry) => {
      const e = editableStock[entry._id] || {}
      return {
        ob:     acc.ob     + (e.openingStock   || 0),
        rec:    acc.rec    + (e.totalReceived  || 0),
        total:  acc.total  + (e.totalAvailable || 0),
        sales:  acc.sales  + (e.salesBottles   || 0),
        salVal: acc.salVal + (e.salesValue     || 0),
        cbbo:   acc.cbbo   + (e.cbbo           || 0),
        cbVal:  acc.cbVal  + (e.closingValue   || 0),
      }
    }, { ob:0, rec:0, total:0, sales:0, salVal:0, cbbo:0, cbVal:0 })
  }

  const getGrandTotals = () => {
    const allEntries = sections
      .filter(s => s.visible)
      .flatMap(s => getSectionEntries(s))
    return getSectionTotals(allEntries)
  }

  const getCategorySummary = () => {
    if (!reportData) return null
    const result = {
      low:     { cases: 0, bottles: 0, value: 0 },
      medium:  { cases: 0, bottles: 0, value: 0 },
      premium: { cases: 0, bottles: 0, value: 0 },
      beer:    { cases: 0, bottles: 0, value: 0 },
    }
    Object.values(reportData.imfl).forEach(sizeData => {
      PRICE_ORDER.forEach(cat => {
        const entries = sizeData[cat] || []
        const key = cat.toLowerCase()
        entries.forEach(entry => {
          const e = editableStock[entry._id] || {}
          result[key].cases   += e.closingCases   || 0
          result[key].bottles += e.closingBottles || 0
          result[key].value   += e.closingValue   || 0
        })
      })
    })
    Object.values(reportData.beer).flat().forEach(entry => {
      const e = editableStock[entry._id] || {}
      result.beer.cases   += e.closingCases   || 0
      result.beer.bottles += e.closingBottles || 0
      result.beer.value   += e.closingValue   || 0
    })
    return result
  }

  const saveShopDetails = async () => {
    try {
      await API.put('/config/shop', shopForm)
      setShopDetails(shopForm)
      setEditingShop(false)
      toast.success('Shop details updated!')
    } catch (error) {
      toast.error('Failed to update shop details')
    }
  }

  const grandTotals     = getGrandTotals()
  const categorySummary = getCategorySummary()
  const totalCash       = (Number(posAmount) || 0) + (Number(cashAmount) || 0)
  const salesMatch      = Math.abs(totalCash - (grandTotals?.salVal || 0)) < 1

  // ── Build table rows for PDF/Excel ──
  const buildAllRows = () => {
    const allRows = []
    sections
      .filter(s => s.visible)
      .forEach(section => {
        const entries = getSectionEntries(section)
        if (!entries.length) return
        entries.forEach(entry => {
          const e = editableStock[entry._id] || {}
          const p = entry.product || {}
          allRows.push({
            code:   p.govtCode    || '',
            name:   p.name        || '',
            ml:     p.size        || '',
            ob:     e.openingStock   || 0,
            rec:    e.totalReceived  || 0,
            total:  e.totalAvailable || 0,
            sbot:   e.salesBottles   || 0,
            rate:   p.price          || 0,
            salval: e.salesValue     || 0,
            c:      e.closingCases   || 0,
            b:      e.closingBottles || 0,
            cbbo:   e.cbbo           || 0,
            cbval:  e.closingValue   || 0,
            _isTotal: false,
            _section: section.key,
          })
        })
        // Section total row
        const t = getSectionTotals(entries)
        allRows.push({
          code: '', name: 'TOTAL', ml: '',
          ob: t.ob, rec: t.rec, total: t.total,
          sbot: t.sales, rate: '',
          salval: t.salVal, c: '', b: '',
          cbbo: t.cbbo, cbval: t.cbVal,
          _isTotal: true,
          _section: section.key,
        })
      })
    return allRows
  }
// ── Calculate Round CB Case ──
const getRoundCbCase = () => {
  if (!reportData) return 0
  const sizeConfig = {
    '180ml':  48,
    '375ml':  24,
    '750ml':  12,
    '1000ml': 9,
    '650ml':  12,
    '375ml beer': 24,
    '500ml':  24,
  }
  let total = 0
  // IMFL sizes
  Object.entries(reportData.imfl).forEach(([size, categories]) => {
    const bpc = sizeConfig[size] || 12
    const entries = PRICE_ORDER.flatMap(cat => categories[cat] || [])
    const totalCbbo = entries.reduce((s, e) => 
      s + (editableStock[e._id]?.cbbo || 0), 0)
    total += Math.round(totalCbbo / bpc)
  })
  // Beer sizes
  Object.entries(reportData.beer).forEach(([size, entries]) => {
    const bpc = sizeConfig[size] || 12
    const totalCbbo = entries.reduce((s, e) =>
      s + (editableStock[e._id]?.cbbo || 0), 0)
    total += Math.round(totalCbbo / bpc)
  })
  return total
}

// ── Get Particulars Table Data ──
const getParticularsData = () => {
  if (!reportData) return null
  const result = {
    low:     { obCases: 0, revdCases: 0, salesCases: 0, cbCases: 0 },
    medium:  { obCases: 0, revdCases: 0, salesCases: 0, cbCases: 0 },
    premium: { obCases: 0, revdCases: 0, salesCases: 0, cbCases: 0 },
    beer:    { obCases: 0, revdCases: 0, salesCases: 0, cbCases: 0 },
    total:   { obCases: 0, revdCases: 0, salesCases: 0, cbCases: 0 },
  }

  const sizeConfig = {
    '180ml': 48, '375ml': 24, '750ml': 12,
    '1000ml': 9, '650ml': 12, '500ml': 24,
  }

  Object.entries(reportData.imfl).forEach(([size, categories]) => {
    const bpc = sizeConfig[size] || 12
    PRICE_ORDER.forEach(cat => {
      const entries = categories[cat] || []
      const key = cat.toLowerCase()
      entries.forEach(entry => {
        const e = editableStock[entry._id] || {}
        result[key].obCases    += Math.floor((e.openingStock  || 0) / bpc)
        result[key].revdCases  += e.casesReceived || 0
        result[key].salesCases += Math.floor((e.salesBottles  || 0) / bpc)
        result[key].cbCases    += e.closingCases  || 0
      })
    })
  })

  Object.entries(reportData.beer).forEach(([size, entries]) => {
    const bpc = sizeConfig[size] || 12
    entries.forEach(entry => {
      const e = editableStock[entry._id] || {}
      result.beer.obCases    += Math.floor((e.openingStock  || 0) / bpc)
      result.beer.revdCases  += e.casesReceived || 0
      result.beer.salesCases += Math.floor((e.salesBottles  || 0) / bpc)
      result.beer.cbCases    += e.closingCases  || 0
    })
  })

  // Calculate totals
  ;['low', 'medium', 'premium', 'beer'].forEach(key => {
    result.total.obCases    += result[key].obCases
    result.total.revdCases  += result[key].revdCases
    result.total.salesCases += result[key].salesCases
    result.total.cbCases    += result[key].cbCases
  })

  return result
}

// ── Get Value Per Case by Category ──
const getValuePerCase = () => {
  if (!categorySummary) return null
  return {
    low:     categorySummary.low.value,
    medium:  categorySummary.medium.value,
    premium: categorySummary.premium.value,
    beer:    categorySummary.beer.value,
    total:   Object.values(categorySummary)
      .reduce((s, v) => s + v.value, 0),
  }
}
  // ── PDF Export — Exact Format ──
 const downloadPDF = () => {
  const doc = new jsPDF({
    orientation: 'poprtrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const dateStr = new Date(date + 'T00:00:00')
    .toLocaleDateString('en-IN', {
      day: '2-digit', month: 'numeric', year: 'numeric'
    })

  // ════════════════════════════════════
  // PAGE 1 — Main Stock Sheet
  // ════════════════════════════════════

  // Header
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `${shopDetails.name}, ${shopDetails.area}, SHOP ${shopDetails.shopNo}`,
    pageW / 2, 8, { align: 'center' }
  )
  doc.setFontSize(8)
  doc.text(`DATE: ${dateStr}`, pageW - 10, 8, { align: 'right' })
  doc.setLineWidth(0.5)
  doc.line(5, 10, pageW - 5, 10)

  let yPos = 13

  const columns = [
    { header: 'CODE',      dataKey: 'code'   },
    { header: 'BRANDS',    dataKey: 'name'   },
    { header: 'ML',        dataKey: 'ml'     },
    { header: 'OB',        dataKey: 'ob'     },
    { header: 'REC',       dataKey: 'rec'    },
    { header: 'TOTAL',     dataKey: 'total'  },
    { header: 'S BOT',     dataKey: 'sbot'   },
    { header: 'RATE',      dataKey: 'rate'   },
    { header: 'SAL VALUE', dataKey: 'salval' },
    { header: 'C',         dataKey: 'c'      },
    { header: 'B',         dataKey: 'b'      },
    { header: 'CBBO',      dataKey: 'cbbo'   },
    { header: 'CB VALUE',  dataKey: 'cbval'  },
  ]

  const colStyles = {
  code:   { halign: 'center', cellWidth: 10 },
  name:   { halign: 'left',   cellWidth: 35 },
  ml:     { halign: 'center', cellWidth: 12  },
  ob:     { halign: 'center', cellWidth: 12 },
  rec:    { halign: 'center', cellWidth: 12  },
  total:  { halign: 'center', cellWidth: 12 },
  sbot:   { halign: 'center', cellWidth: 10 },
  rate:   { halign: 'center', cellWidth: 10 },
  salval: { halign: 'center', cellWidth: 16 },
  c:      { halign: 'center', cellWidth: 12 },
  b:      { halign: 'center', cellWidth: 12  },
  cbbo:   { halign: 'center', cellWidth: 12 },
  cbval:  { halign: 'right', cellWidth: 17 },
}
  const allRows = buildAllRows()

  // Group rows by section
  let currentSection = null
  let sectionRows    = []
  const sectionGroups = []

  allRows.forEach(row => {
    if (currentSection !== row._section) {
      if (sectionRows.length) {
        sectionGroups.push({ section: currentSection, rows: sectionRows })
      }
      currentSection = row._section
      sectionRows    = [row]
    } else {
      sectionRows.push(row)
    }
  })
  if (sectionRows.length) {
    sectionGroups.push({ section: currentSection, rows: sectionRows })
  }

  // Print each section
  sectionGroups.forEach((group, groupIdx) => {
    autoTable(doc, {
      startY: yPos,
      columns,
      body: group.rows,
      styles: {
        fontSize: 8,
        cellPadding: 0.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: colStyles,
      showHead: groupIdx === 0 ? 'firstPage' : 'never',
      didParseCell: (data) => {
        if (data.row.raw._isTotal) {
          data.cell.styles.fontStyle  = 'bold'
          data.cell.styles.fillColor  = [220, 220, 220]
          data.cell.styles.lineWidth  = 0.3
        }
      },
      didDrawTable: (data) => {
        const finalY = data.cursor.y
        doc.setLineWidth(0.8)
        doc.setDrawColor(0, 0, 0)
        doc.line(5, finalY, pageW - 5, finalY)
        doc.setLineWidth(0.1)
      },
      margin: { left: 5, right: 5 },
    })
    yPos = doc.lastAutoTable.finalY + 1
  })

  // Grand Total
  autoTable(doc, {
    startY: yPos,
    columns,
    body: [{
      code: '', name: 'TOTAL', ml: '',
      ob:     grandTotals.ob,
      rec:    grandTotals.rec,
      total:  grandTotals.total,
      sbot:   grandTotals.sales,
      rate:   '',
      salval: grandTotals.salVal,
      c: '', b: '',
      cbbo:   grandTotals.cbbo,
      cbval:  grandTotals.cbVal,
      _isTotal: true,
    }],
    showHead: 'never',
    styles: {
      fontSize: 7,
      fontStyle: 'bold',
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      lineWidth: 0.3,
      halign: 'center',
    },
    columnStyles: colStyles,
    margin: { left: 5, right: 5 },
  })

  // ════════════════════════════════════
  // PAGE 2 — Summary Sheet
  // ════════════════════════════════════
  doc.addPage()
  yPos = 10

  // Header
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `${shopDetails.name}, ${shopDetails.area}, SHOP ${shopDetails.shopNo}`,
    pageW / 2, yPos, { align: 'center' }
  )
  yPos += 5
  doc.setFontSize(8)
  doc.text(`DATE: ${dateStr}`, pageW / 2, yPos, { align: 'center' })
  yPos += 4
  doc.setLineWidth(0.5)
  doc.line(5, yPos, pageW - 5, yPos)
  yPos += 4

  const particulars  = getParticularsData()
  const valuePerCase = getValuePerCase()
  const roundCbCase  = getRoundCbCase()

  // ── Section 1: Particulars Table (left half) ──
  autoTable(doc, {
    startY: yPos,
    head: [[
      'PARTICULARS', 'OB CASES', 'REVD CASES',
      'SALES CASES', 'CB CASE'
    ]],
    body: particulars ? [
      ['LOW',
        particulars.low.obCases,
        particulars.low.revdCases,
        particulars.low.salesCases,
        particulars.low.cbCases,
      ],
      ['MEDIUM',
        particulars.medium.obCases,
        particulars.medium.revdCases,
        particulars.medium.salesCases,
        particulars.medium.cbCases,
      ],
      ['PREMIUM',
        particulars.premium.obCases,
        particulars.premium.revdCases,
        particulars.premium.salesCases,
        particulars.premium.cbCases,
      ],
      ['BEER',
        particulars.beer.obCases,
        particulars.beer.revdCases,
        particulars.beer.salesCases,
        particulars.beer.cbCases,
      ],
      ['TOTAL',
        particulars.total.obCases,
        particulars.total.revdCases,
        particulars.total.salesCases,
        particulars.total.cbCases,
      ],
      ['SALES IMFL', '', '', grandTotals.sales - 
        Object.values(reportData?.beer || {})
          .flat()
          .reduce((s, e) => s + (editableStock[e._id]?.salesBottles || 0), 0),
        ''
      ],
      ['SALES BEER', '', '',
        Object.values(reportData?.beer || {})
          .flat()
          .reduce((s, e) => s + (editableStock[e._id]?.salesBottles || 0), 0),
        ''
      ],
      ['SALES VALUE', '', '', grandTotals.salVal.toLocaleString('en-IN'), ''],
    ] : [],
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      halign: 'center',
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 30 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
    },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [220, 220, 220]
      }
    },
    margin: { left: 5, right: pageW / 2 + 5 },
  })

  // ── Section 2: Stock Values (right half, same y) ──
  const rightX = pageW / 2 + 5
  let rightY   = yPos

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('STOCK VALUES', rightX, rightY)
  rightY += 5

  autoTable(doc, {
    startY: rightY,
    head: [['PARTICULARS', 'VALUE']],
    body: [
      ['OPENING STOCK VALUE',
        grandTotals.ob > 0
          ? (reportData?.stock || [])
              .reduce((s, e) =>
                s + (e.openingStock || 0) * (e.product?.price || 0), 0)
              .toLocaleString('en-IN')
          : '0'
      ],
      ['SALES VALUE',        grandTotals.salVal.toLocaleString('en-IN')],
      ['CLOSING STOCK VALUE', grandTotals.cbVal.toLocaleString('en-IN')],
    ],
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left',   cellWidth: 50 },
      1: { halign: 'center', cellWidth: 30 },
    },
    margin: { left: rightX, right: 5 },
  })

  rightY = doc.lastAutoTable.finalY + 4

  // ── IMFL vs Beer Sales ──
  const beerSales = Object.values(reportData?.beer || {})
    .flat()
    .reduce((s, e) => s + (editableStock[e._id]?.salesBottles || 0), 0)
  const beerSalesVal = Object.values(reportData?.beer || {})
    .flat()
    .reduce((s, e) => s + (editableStock[e._id]?.salesValue || 0), 0)
  const imflSales    = grandTotals.sales - beerSales
  const imflSalesVal = grandTotals.salVal - beerSalesVal

  autoTable(doc, {
    startY: rightY,
    head: [['', 'IMFL', 'BEER', 'TOTAL']],
    body: [
      ['SALES BOTTLES',
        imflSales, beerSales, grandTotals.sales],
      ['SALES VALUE',
        imflSalesVal.toLocaleString('en-IN'),
        beerSalesVal.toLocaleString('en-IN'),
        grandTotals.salVal.toLocaleString('en-IN')
      ],
    ],
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      halign: 'center',
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 30 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 10 },
    },
    margin: { left: rightX, right: 5 },
  })

  // Move yPos below both columns
  yPos = Math.max(
    doc.lastAutoTable.finalY,
    yPos + (particulars ? 8 * 7 : 0)
  ) + 6

  // ── Section 3: Particular Range + Value/Case ──
  autoTable(doc, {
    startY: yPos,
    head: [[
      'PARTICULAR RANGE', 'CLOSING CASES',
      'CLOSING BOTTLES', 'CLOSING VALUE', 'TOTAL SALES VALUE'
    ]],
    body: categorySummary ? [
      ['LOW',
        categorySummary.low.cases,
        categorySummary.low.bottles,
        categorySummary.low.value.toLocaleString('en-IN'),
        valuePerCase?.low.toLocaleString('en-IN') || 0,
      ],
      ['MEDIUM',
        categorySummary.medium.cases,
        categorySummary.medium.bottles,
        categorySummary.medium.value.toLocaleString('en-IN'),
        valuePerCase?.medium.toLocaleString('en-IN') || 0,
      ],
      ['PREMIUM',
        categorySummary.premium.cases,
        categorySummary.premium.bottles,
        categorySummary.premium.value.toLocaleString('en-IN'),
        valuePerCase?.premium.toLocaleString('en-IN') || 0,
      ],
      ['BEER',
        categorySummary.beer.cases,
        categorySummary.beer.bottles,
        categorySummary.beer.value.toLocaleString('en-IN'),
        valuePerCase?.beer.toLocaleString('en-IN') || 0,
      ],
      ['TOTAL',
        Object.values(categorySummary).reduce((s, v) => s + v.cases, 0),
        Object.values(categorySummary).reduce((s, v) => s + v.bottles, 0),
        Object.values(categorySummary)
          .reduce((s, v) => s + v.value, 0)
          .toLocaleString('en-IN'),
        valuePerCase?.total.toLocaleString('en-IN') || 0,
      ],
    ] : [],
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      halign: 'center',
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 35 },
      1: { cellWidth: 30  },
      2: { cellWidth: 30  },
      3: { cellWidth: 35  },
      4: { cellWidth: 35  },
    },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [220, 220, 220]
      }
    },
    margin: { left: 5, right: 5 },
  })

  yPos = doc.lastAutoTable.finalY + 6

  // ── Section 4: Cash Summary ──
  autoTable(doc, {
    startY: yPos,
    head: [['CASH SUMMARY', 'AMOUNT']],
    body: [
      ['POS / PAYTM',          Number(posAmount  || 0).toLocaleString('en-IN')],
      ['CASH IN HAND',         Number(cashAmount || 0).toLocaleString('en-IN')],
      ['TOTAL CASH REMITTANCE', totalCash.toLocaleString('en-IN')],
      ['SALES VALUE',          grandTotals.salVal.toLocaleString('en-IN')],
      [salesMatch
        ? 'STATUS: MATCH ✓'
        : `STATUS: DIFFERENCE ₹${Math.abs(
            totalCash - grandTotals.salVal
          ).toLocaleString('en-IN')}`,
        ''
      ],
      ['ROUND CB CASE', roundCbCase],
    ],
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left',   cellWidth: 60 },
      1: { halign: 'center', cellWidth: 40 },
    },
    didParseCell: (data) => {
      // Bold total remittance
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [220, 220, 220]
      }
      // Color match/mismatch row
      if (data.row.index === 4) {
        data.cell.styles.fontStyle  = 'bold'
        data.cell.styles.fillColor  = salesMatch
          ? [198, 246, 213] : [254, 215, 215]
        data.cell.styles.textColor  = salesMatch
          ? [39, 103, 73] : [197, 48, 48]
      }
      // Bold round cb case
      if (data.row.index === 5) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [220, 220, 220]
      }
    },
    margin: { left: 5, right: pageW / 2 + 5 },
  })

  doc.save(`stock-report-${date}.pdf`)
  toast.success('PDF downloaded! 📄')
}
  // ── Excel Export ──
  const downloadExcel = () => {
    const wb   = XLSX.utils.book_new()
    const rows = []

    // Header
    rows.push([
      `${shopDetails.name}, ${shopDetails.area}, SHOP ${shopDetails.shopNo}`
    ])
    rows.push([`DATE: ${new Date(date + 'T00:00:00')
      .toLocaleDateString('en-IN')}`])
    rows.push([])
    rows.push([
      'CODE', 'BRANDS', 'ML', 'OB', 'REC', 'TOTAL',
      'S BOT', 'RATE', 'SAL VALUE', 'C', 'B', 'CBBO', 'CB VALUE'
    ])

    sections
      .filter(s => s.visible)
      .forEach(section => {
        const entries = getSectionEntries(section)
        if (!entries.length) return

        entries.forEach(entry => {
          const e = editableStock[entry._id] || {}
          const p = entry.product || {}
          rows.push([
            p.govtCode    || '',
            p.name        || '',
            p.size        || '',
            e.openingStock   || 0,
            e.totalReceived  || 0,
            e.totalAvailable || 0,
            e.salesBottles   || 0,
            p.price          || 0,
            e.salesValue     || 0,
            e.closingCases   || 0,
            e.closingBottles || 0,
            e.cbbo           || 0,
            e.closingValue   || 0,
          ])
        })

        const t = getSectionTotals(entries)
        rows.push([
          '', 'TOTAL', '',
          t.ob, t.rec, t.total,
          t.sales, '', t.salVal,
          '', '', t.cbbo, t.cbVal
        ])
        rows.push([]) // Empty row between sections
      })

    // Grand total
    rows.push([
      '', 'TOTAL', '',
      grandTotals.ob, grandTotals.rec, grandTotals.total,
      grandTotals.sales, '', grandTotals.salVal,
      '', '', grandTotals.cbbo, grandTotals.cbVal
    ])

    rows.push([])
    rows.push(['CLOSING STOCK SUMMARY'])
    rows.push(['PARTICULAR', 'CASES', 'BOTTLES', 'VALUE'])

    if (categorySummary) {
      rows.push(['LOW',
        categorySummary.low.cases,
        categorySummary.low.bottles,
        categorySummary.low.value
      ])
      rows.push(['MEDIUM',
        categorySummary.medium.cases,
        categorySummary.medium.bottles,
        categorySummary.medium.value
      ])
      rows.push(['PREMIUM',
        categorySummary.premium.cases,
        categorySummary.premium.bottles,
        categorySummary.premium.value
      ])
      rows.push(['BEER',
        categorySummary.beer.cases,
        categorySummary.beer.bottles,
        categorySummary.beer.value
      ])
    }

    rows.push([])
    rows.push(['CASH SUMMARY'])
    rows.push(['SALES VALUE',          grandTotals.salVal])
    rows.push(['CLOSING STOCK VALUE',  grandTotals.cbVal ])
    rows.push(['POS / PAYTM',          Number(posAmount  || 0)])
    rows.push(['CASH IN HAND',         Number(cashAmount || 0)])
    rows.push(['TOTAL REMITTANCE',     totalCash])
    rows.push([salesMatch ? 'MATCH ✓' : 'MISMATCH ✗'])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 8  },
      { wch: 30 },
      { wch: 8  },
      { wch: 8  },
      { wch: 8  },
      { wch: 8  },
      { wch: 8  },
      { wch: 8  },
      { wch: 12 },
      { wch: 6  },
      { wch: 6  },
      { wch: 8  },
      { wch: 12 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Daily Stock Report')
    XLSX.writeFile(wb, `stock-report-${date}.xlsx`)
    toast.success('Excel downloaded!')
  }

  // ── Styles ──
  const thStyle = {
    padding: isMobile ? '6px 4px' : '8px 6px',
    backgroundColor: '#000000',
    color: '#ffffff',
    fontSize: isMobile ? '10px' : '11px',
    fontWeight: '700',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    border: '1px solid #000000',
  }

  const tdStyle = (bold, align = 'center') => ({
    padding: isMobile ? '5px 3px' : '6px 5px',
    fontSize: isMobile ? '10px' : '11px',
    color: colors.text,
    fontWeight: bold ? '700' : '400',
    textAlign: align,
    border: `1px solid ${colors.border}`,
    backgroundColor: 'transparent',
    whiteSpace: 'nowrap',
  })

  const totalRowStyle = (align = 'center') => ({
    padding: isMobile ? '5px 3px' : '7px 5px',
    fontSize: isMobile ? '10px' : '11px',
    fontWeight: '700',
    textAlign: align,
    border: '1px solid #000',
    backgroundColor: colors.isDark ? '#333' : '#ddd',
    color: colors.text,
    whiteSpace: 'nowrap',
  })

  const cellInput = {
    width: '100%',
    minWidth: '50px',
    padding: '3px',
    backgroundColor: colors.input,
    border: `1px solid ${colors.accent}`,
    borderRadius: '3px',
    color: colors.text,
    fontSize: '11px',
    textAlign: 'center',
    outline: 'none',
  }

  return (
    <PageLayout title="📄 Daily Report">

      {/* ── Top Controls ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'flex-end',
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: colors.card,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
      }}>

        {/* Date */}
        <div>
          <label style={{
            fontSize: '11px',
            color: colors.textSub,
            fontWeight: '600',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '4px',
          }}>
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${colors.inputBorder}`,
              backgroundColor: colors.input,
              color: colors.text,
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Shop Details */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          {editingShop ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
            }}>
              <input
                value={shopForm.name}
                onChange={e => setShopForm({
                  ...shopForm, name: e.target.value
                })}
                placeholder="Shop Name"
                style={{
                  flex: 2,
                  minWidth: '160px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.inputBorder}`,
                  backgroundColor: colors.input,
                  color: colors.text,
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <input
                value={shopForm.area}
                onChange={e => setShopForm({
                  ...shopForm, area: e.target.value
                })}
                placeholder="Area"
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.inputBorder}`,
                  backgroundColor: colors.input,
                  color: colors.text,
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <input
                value={shopForm.shopNo}
                onChange={e => setShopForm({
                  ...shopForm, shopNo: e.target.value
                })}
                placeholder="Shop No"
                style={{
                  width: '80px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.inputBorder}`,
                  backgroundColor: colors.input,
                  color: colors.text,
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={saveShopDetails}
                style={{
                  padding: '7px 14px',
                  backgroundColor: colors.success,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingShop(false)}
                style={{
                  padding: '7px 14px',
                  backgroundColor: 'transparent',
                  color: colors.textSub,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: colors.text,
                }}>
                  {shopDetails.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: colors.textSub,
                }}>
                  {shopDetails.area} | SHOP {shopDetails.shopNo}
                </div>
              </div>
              <button
                onClick={() => setEditingShop(true)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: 'transparent',
                  color: colors.accent,
                  border: `1px solid ${colors.accent}`,
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>

        {/* Download Buttons */}
        {reportData && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={downloadPDF}
              style={{
                padding: '8px 18px',
                backgroundColor: '#c53030',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              📥 PDF
            </button>
            <button
              onClick={downloadExcel}
              style={{
                padding: '8px 18px',
                backgroundColor: '#276749',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              📊 Excel
            </button>
          </div>
        )}
      </div>

      {/* ── Section Controls ── */}
      {reportData && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px',
          padding: '10px 14px',
          backgroundColor: colors.card,
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            color: colors.textSub,
            marginRight: '4px',
            textTransform: 'uppercase',
          }}>
            Sections:
          </span>
          {sections.map((section, idx) => (
            <div
              key={section.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 10px',
                backgroundColor: section.visible
                  ? colors.accent + '20'
                  : colors.bg,
                border: `1px solid ${section.visible
                  ? colors.accent : colors.border}`,
                borderRadius: '20px',
              }}
            >
              <button
                onClick={() => toggleSection(section.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: section.visible
                    ? colors.accent : colors.textSub,
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '0',
                }}
              >
                {section.visible ? '✓' : '○'} {section.label}
              </button>
              <button
                onClick={() => moveSection(idx, -1)}
                disabled={idx === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: idx === 0 ? 'default' : 'pointer',
                  color: idx === 0 ? colors.border : colors.textSub,
                  fontSize: '10px',
                  padding: '0 2px',
                }}
              >▲</button>
              <button
                onClick={() => moveSection(idx, 1)}
                disabled={idx === sections.length - 1}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: idx === sections.length - 1
                    ? 'default' : 'pointer',
                  color: idx === sections.length - 1
                    ? colors.border : colors.textSub,
                  fontSize: '10px',
                  padding: '0 2px',
                }}
              >▼</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          color: colors.textSub,
        }}>
          Loading report...
        </div>
      )}

      {/* ── No Data ── */}
      {!loading && !reportData && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          color: colors.textSub,
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <p style={{ fontSize: '16px', color: colors.text }}>
            No data for this date
          </p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>
            Make sure stock has been initialized and entries saved
          </p>
        </div>
      )}

      {/* ── Report Preview ── */}
      {!loading && reportData && (
        <div>

          {/* Sheet Header — matches printed format */}
          <div style={{
            textAlign: 'center',
            padding: '10px',
            backgroundColor: colors.card,
            border: `2px solid ${colors.text}`,
            borderBottom: 'none',
            marginBottom: '0',
          }}>
            <div style={{
              fontSize: isMobile ? '11px' : '13px',
              fontWeight: '700',
              color: colors.text,
              textTransform: 'uppercase',
            }}>
              {shopDetails.name}, {shopDetails.area}, SHOP {shopDetails.shopNo}
            </div>
            <div style={{
              fontSize: '11px',
              color: colors.text,
              marginTop: '4px',
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
            }}>
              <span>
                DATE: {new Date(date + 'T00:00:00')
                  .toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'numeric',
                    year: 'numeric'
                  })}
              </span>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '900px',
              border: `2px solid ${colors.text}`,
              fontSize: isMobile ? '10px' : '11px',
            }}>

              {/* Column Headers */}
              <thead>
                <tr>
                  {[
                    'CODE', 'BRANDS', 'ML', 'OB', 'REC',
                    'TOTAL', 'S BOT', 'RATE', 'SAL VALUE',
                    'C', 'B', 'CBBO', 'CB VALUE'
                  ].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sections
                  .filter(s => s.visible)
                  .map((section, sectionIdx) => {
                    const entries = getSectionEntries(section)
                    if (!entries.length) return null
                    const totals = getSectionTotals(entries)

                    return (
                      <>
                        {/* Product Rows */}
                        {entries.map((entry, idx) => {
                          const e = editableStock[entry._id] || {}
                          const p = entry.product || {}
                          return (
                            <tr
                              key={entry._id}
                              style={{
                                backgroundColor: idx % 2 === 0
                                  ? colors.card
                                  : colors.bg,
                              }}
                            >
                              <td style={tdStyle(false, 'center')}>
                                {p.govtCode || ''}
                              </td>
                              <td style={tdStyle(true, 'left')}>
                                {p.name}
                              </td>
                              <td style={tdStyle(false, 'center')}>
                                {p.size}
                              </td>
                              <td style={tdStyle(false, 'center')}>
                                {e.openingStock || 0}
                              </td>
                              <td style={tdStyle(false, 'center')}>
                                {e.totalReceived || 0}
                              </td>
                              <td style={tdStyle(false, 'center')}>
                                {e.totalAvailable || 0}
                              </td>
                              {/* Editable Sales */}
                              <td style={{
                                ...tdStyle(true, 'center'),
                                padding: '2px 4px',
                              }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={e.salesBottles || 0}
                                  onChange={ev => handleCellEdit(
                                    entry._id, 'salesBottles', ev.target.value
                                  )}
                                  style={cellInput}
                                />
                              </td>
                              <td style={tdStyle(false, 'center')}>
                                {p.price || 0}
                              </td>
                              <td style={tdStyle(false, 'center')}>
                                {(e.salesValue || 0).toLocaleString('en-IN')}
                              </td>
                              <td style={tdStyle(false, 'center')}>
                                {e.closingCases || 0}
                              </td>
                              <td style={tdStyle(false, 'center')}>
                                {e.closingBottles || 0}
                              </td>
                              <td style={tdStyle(true, 'center')}>
                                {e.cbbo || 0}
                              </td>
                              <td style={tdStyle(false, 'center')}>
                                {(e.closingValue || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          )
                        })}

                        {/* Section Total Row */}
                        <tr key={`total-${section.key}`}>
                          <td
                            colSpan={3}
                            style={totalRowStyle('center')}
                          >
                            TOTAL
                          </td>
                          <td style={totalRowStyle()}>
                            {totals.ob}
                          </td>
                          <td style={totalRowStyle()}>
                            {totals.rec}
                          </td>
                          <td style={totalRowStyle()}>
                            {totals.total}
                          </td>
                          <td style={totalRowStyle()}>
                            {totals.sales}
                          </td>
                          <td style={totalRowStyle()}></td>
                          <td style={totalRowStyle()}>
                            {totals.salVal.toLocaleString('en-IN')}
                          </td>
                          <td style={totalRowStyle()}></td>
                          <td style={totalRowStyle()}></td>
                          <td style={totalRowStyle()}>
                            {totals.cbbo}
                          </td>
                          <td style={totalRowStyle()}>
                            {totals.cbVal.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {/* Dark Divider Between Sections */}
                        {sectionIdx < sections
                          .filter(s => s.visible).length - 1 && (
                          <tr key={`divider-${section.key}`}>
                            <td
                              colSpan={13}
                              style={{
                                padding: '0',
                                height: '3px',
                                backgroundColor: colors.text,
                                border: 'none',
                              }}
                            />
                          </tr>
                        )}
                      </>
                    )
                  })}

                {/* Grand Total Row */}
                <tr style={{
                  backgroundColor: colors.text,
                }}>
                  <td
                    colSpan={3}
                    style={{
                      ...totalRowStyle('center'),
                      backgroundColor: colors.text,
                      color: colors.card,
                      border: `1px solid ${colors.text}`,
                    }}
                  >
                    TOTAL
                  </td>
                  {[
                    grandTotals.ob,
                    grandTotals.rec,
                    grandTotals.total,
                    grandTotals.sales,
                    '',
                    grandTotals.salVal.toLocaleString('en-IN'),
                    '', '',
                    grandTotals.cbbo,
                    grandTotals.cbVal.toLocaleString('en-IN'),
                  ].map((val, i) => (
                    <td
                      key={i}
                      style={{
                        ...totalRowStyle('center'),
                        backgroundColor: colors.text,
                        color: colors.card,
                        border: `1px solid ${colors.text}`,
                      }}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Summary Section ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
            marginTop: '16px',
          }}>

            {/* Category Closing Summary */}
            <div style={{
              border: `2px solid ${colors.text}`,
              overflow: 'hidden',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
              }}>
                <thead>
                  <tr>
                    {['PARTICULAR RANGE', 'CLOSING CASES',
                      'CLOSING BOTTLES', 'CLOSING TOTAL VALUE'
                    ].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categorySummary && [
                    ['LOW',     categorySummary.low    ],
                    ['MEDIUM',  categorySummary.medium ],
                    ['PREMIUM', categorySummary.premium],
                    ['BEER',    categorySummary.beer   ],
                  ].map(([label, data], idx) => (
                    <tr
                      key={label}
                      style={{
                        backgroundColor: idx % 2 === 0
                          ? colors.card : colors.bg
                      }}
                    >
                      <td style={tdStyle(true, 'left')}>
                        {label}
                      </td>
                      <td style={tdStyle(false)}>
                        {data.cases}
                      </td>
                      <td style={tdStyle(false)}>
                        {data.bottles}
                      </td>
                      <td style={tdStyle(false)}>
                        {data.value.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {/* Total */}
                  {categorySummary && (() => {
                    const totalCases = Object.values(categorySummary)
                      .reduce((s, v) => s + v.cases, 0)
                    const totalBtls = Object.values(categorySummary)
                      .reduce((s, v) => s + v.bottles, 0)
                    const totalVal = Object.values(categorySummary)
                      .reduce((s, v) => s + v.value, 0)
                    return (
                      <tr key="total">
                        <td style={totalRowStyle('left')}>TOTAL</td>
                        <td style={totalRowStyle()}>{totalCases}</td>
                        <td style={totalRowStyle()}>{totalBtls}</td>
                        <td style={totalRowStyle()}>
                          {totalVal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>

            {/* Cash Summary */}
            <div style={{
              border: `2px solid ${colors.text}`,
              overflow: 'hidden',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
              }}>
                <thead>
                  <tr>
                    <th colSpan={2} style={thStyle}>
                      CASH SUMMARY
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['SALES VALUE',
                      grandTotals.salVal.toLocaleString('en-IN')],
                    ['CLOSING STOCK VALUE',
                      grandTotals.cbVal.toLocaleString('en-IN')],
                  ].map(([label, val], idx) => (
                    <tr
                      key={label}
                      style={{
                        backgroundColor: idx % 2 === 0
                          ? colors.card : colors.bg
                      }}
                    >
                      <td style={tdStyle(false, 'left')}>{label}</td>
                      <td style={tdStyle(true)}>{val}</td>
                    </tr>
                  ))}

                  {/* POS — Editable */}
                  <tr style={{ backgroundColor: colors.card }}>
                    <td style={tdStyle(false, 'left')}>
                      POS / PAYTM
                    </td>
                    <td style={{ ...tdStyle(true), padding: '2px 4px' }}>
                      <input
                        type="number"
                        min="0"
                        value={posAmount}
                        onChange={e => setPosAmount(e.target.value)}
                        placeholder="0"
                        style={cellInput}
                      />
                    </td>
                  </tr>

                  {/* Cash — Editable */}
                  <tr style={{ backgroundColor: colors.bg }}>
                    <td style={tdStyle(false, 'left')}>
                      CASH IN HAND
                    </td>
                    <td style={{ ...tdStyle(true), padding: '2px 4px' }}>
                      <input
                        type="number"
                        min="0"
                        value={cashAmount}
                        onChange={e => setCashAmount(e.target.value)}
                        placeholder="0"
                        style={cellInput}
                      />
                    </td>
                  </tr>

                  {/* Total Remittance */}
                  <tr>
                    <td style={totalRowStyle('left')}>
                      TOTAL CASH REMITTANCE
                    </td>
                    <td style={totalRowStyle()}>
                      {totalCash.toLocaleString('en-IN')}
                    </td>
                  </tr>

                  {/* Match indicator */}
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: '12px',
                        backgroundColor: salesMatch
                          ? '#c6f6d5' : '#fed7d7',
                        color: salesMatch ? '#276749' : '#c53030',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {salesMatch
                        ? '✅ CASH MATCHES SALES'
                        : `⚠️ DIFFERENCE: ₹${Math.abs(
                            totalCash - grandTotals.salVal
                          ).toLocaleString('en-IN')}`
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}

export default Report