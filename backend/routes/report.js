const express = require('express')
const router = express.Router()
const DailyStock = require('../models/DailyStock')
const { protect } = require('../middleware/auth')

router.get('/', protect, async (req, res) => {
  try {
    const date = req.query.date ||
      new Date().toISOString().split('T')[0]

    const stock = await DailyStock.find({ date })
      .populate('product')
      .lean()

    if (!stock.length) {
      return res.status(404).json({
        message: 'No stock data found for this date'
      })
    }

    // Only keep entries with some activity
    const activeStock = stock.filter(entry =>
      (entry.openingStock  || 0) > 0 ||
      (entry.salesBottles  || 0) > 0 ||
      (entry.totalReceived || 0) > 0
    )

    if (!activeStock.length) {
      return res.status(404).json({
        message: 'No activity found for this date'
      })
    }

    // Group by productType then size then priceCategory
    const imfl = {}
    const beer = {}

    activeStock.forEach(entry => {
      const p = entry.product
      if (!p) return
      if (p.productType === 'IMFL') {
        if (!imfl[p.size]) imfl[p.size] = {}
        const cat = p.priceCategory || 'NA'
        if (!imfl[p.size][cat]) imfl[p.size][cat] = []
        imfl[p.size][cat].push(entry)
      } else {
        if (!beer[p.size]) beer[p.size] = []
        beer[p.size].push(entry)
      }
    })

    // Calculate summary from activeStock only
    const summary = {
      low:     { openingValue: 0, salesValue: 0, closingCases: 0, closingBottles: 0, closingValue: 0 },
      medium:  { openingValue: 0, salesValue: 0, closingCases: 0, closingBottles: 0, closingValue: 0 },
      premium: { openingValue: 0, salesValue: 0, closingCases: 0, closingBottles: 0, closingValue: 0 },
      beer:    { openingValue: 0, salesValue: 0, closingCases: 0, closingBottles: 0, closingValue: 0 },
      totalOpeningValue:  0,
      totalSalesValue:    0,
      totalClosingValue:  0,
      totalSalesBottles:  0,
      imflSalesBottles:   0,
      beerSalesBottles:   0,
    }

    activeStock.forEach(entry => {
      const p = entry.product
      if (!p) return

      const openingVal = entry.openingStock * p.price
      const cat = p.priceCategory?.toLowerCase()

      if (p.productType === 'IMFL' && summary[cat]) {
        summary[cat].openingValue   += openingVal
        summary[cat].salesValue     += entry.salesValue     || 0
        summary[cat].closingCases   += entry.closingCases   || 0
        summary[cat].closingBottles += entry.closingBottles || 0
        summary[cat].closingValue   += entry.closingValue   || 0
        summary.imflSalesBottles    += entry.salesBottles   || 0
      } else if (p.productType === 'BEER') {
        summary.beer.openingValue   += openingVal
        summary.beer.salesValue     += entry.salesValue     || 0
        summary.beer.closingCases   += entry.closingCases   || 0
        summary.beer.closingBottles += entry.closingBottles || 0
        summary.beer.closingValue   += entry.closingValue   || 0
        summary.beerSalesBottles    += entry.salesBottles   || 0
      }

      summary.totalOpeningValue += openingVal
      summary.totalSalesValue   += entry.salesValue   || 0
      summary.totalClosingValue += entry.closingValue || 0
      summary.totalSalesBottles += entry.salesBottles || 0
    })

    // Send activeStock in response
    res.json({ date, imfl, beer, summary, stock: activeStock })

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

module.exports = router