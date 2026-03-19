const express = require('express')
const router = express.Router()
const DailyStock = require('../models/DailyStock')
const Product = require('../models/Product')
const { protect } = require('../middleware/auth')

const calculateFields = (entry, bottlesPerCase, price) => {
  const totalReceived = (entry.casesReceived * bottlesPerCase)
    + entry.bottlesReceived
  const totalAvailable = entry.openingStock + totalReceived
  const cbbo = totalAvailable - entry.salesBottles
  const closingCases = Math.floor(cbbo / bottlesPerCase)
  const closingBottles = cbbo % bottlesPerCase
  const salesValue = entry.salesBottles * price
  const closingValue = cbbo * price
  return {
    totalReceived, totalAvailable, cbbo,
    closingCases, closingBottles, salesValue, closingValue,
  }
}

// ── 1. GET stock by date ──────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const date = req.query.date ||
      new Date().toISOString().split('T')[0]
    const stock = await DailyStock.find({ date })
      .populate('product')
      .populate('recordedBy', 'name')
    res.json({ date, stock })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ── 2. INITIALIZE — BEFORE /:id ──────────────────────────
router.post('/initialize', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const existing = await DailyStock.findOne({ date: today })
    if (existing) {
      return res.status(400).json({
        message: 'Today stock already initialized'
      })
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const products = await Product.find({ isActive: true })
    if (products.length === 0) {
      return res.status(400).json({
        message: 'No products found. Please add products first.'
      })
    }

    const todayStocks = await Promise.all(products.map(async (product) => {
      const yesterdayStock = await DailyStock.findOne({
        date: yesterdayStr,
        product: product._id
      })
      const openingStock = yesterdayStock ? yesterdayStock.cbbo : 0
      return {
        date: today,
        product: product._id,
        openingStock,
        casesReceived: 0,
        bottlesReceived: 0,
        totalReceived: 0,
        totalAvailable: openingStock,
        salesBottles: 0,
        salesValue: 0,
        cbbo: openingStock,
        closingCases: Math.floor(openingStock / product.bottlesPerCase),
        closingBottles: openingStock % product.bottlesPerCase,
        closingValue: openingStock * product.price,
        recordedBy: req.supervisor.id
      }
    }))

    await DailyStock.insertMany(todayStocks)
    res.status(201).json({
      message: 'Today stock initialized!',
      count: todayStocks.length
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ── 3. BULK UPDATE — BEFORE /:id ─────────────────────────
router.put('/bulk/update', protect, async (req, res) => {
  try {
    const { updates, type } = req.body

    const results = await Promise.all(updates.map(async (update) => {
      const stockEntry = await DailyStock.findById(update.id)
        .populate('product')
      if (!stockEntry) return null

      let updateData = {}
      if (type === 'receive') {
        const calc = calculateFields(
          {
            ...stockEntry.toObject(),
            casesReceived:   update.casesReceived   || 0,
            bottlesReceived: update.bottlesReceived || 0,
          },
          stockEntry.product.bottlesPerCase,
          stockEntry.product.price
        )
        updateData = {
          casesReceived:   update.casesReceived   || 0,
          bottlesReceived: update.bottlesReceived || 0,
          ...calc
        }
      } else if (type === 'sales') {
        const calc = calculateFields(
          {
            ...stockEntry.toObject(),
            salesBottles: update.salesBottles || 0,
          },
          stockEntry.product.bottlesPerCase,
          stockEntry.product.price
        )
        updateData = {
          salesBottles: update.salesBottles || 0,
          ...calc
        }
      }

      return DailyStock.findByIdAndUpdate(
        update.id, updateData, { new: true }
      ).populate('product')
    }))

    res.json({
      message: 'Updated successfully',
      results: results.filter(Boolean)
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ── 4. SINGLE UPDATE receive /:id — LAST ─────────────────
router.put('/:id/receive', protect, async (req, res) => {
  try {
    const { casesReceived, bottlesReceived } = req.body
    const stockEntry = await DailyStock.findById(req.params.id)
      .populate('product')
    if (!stockEntry) {
      return res.status(404).json({ message: 'Stock entry not found' })
    }
    const calc = calculateFields(
      { ...stockEntry.toObject(), casesReceived, bottlesReceived },
      stockEntry.product.bottlesPerCase,
      stockEntry.product.price
    )
    const updated = await DailyStock.findByIdAndUpdate(
      req.params.id,
      { casesReceived, bottlesReceived, ...calc },
      { new: true }
    ).populate('product')
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ── 5. SINGLE UPDATE sales /:id — LAST ───────────────────
router.put('/:id/sales', protect, async (req, res) => {
  try {
    const { salesBottles } = req.body
    const stockEntry = await DailyStock.findById(req.params.id)
      .populate('product')
    if (!stockEntry) {
      return res.status(404).json({ message: 'Stock entry not found' })
    }
    const calc = calculateFields(
      { ...stockEntry.toObject(), salesBottles },
      stockEntry.product.bottlesPerCase,
      stockEntry.product.price
    )
    const updated = await DailyStock.findByIdAndUpdate(
      req.params.id,
      { salesBottles, ...calc },
      { new: true }
    ).populate('product')
    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

module.exports = router