const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const { protect } = require('../middleware/auth')
// GET all products
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ productType: 1, size: 1, priceCategory: 1 })
      // ❌ Remove this line: .populate('supplier', 'name phone')
    res.json(products)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// GET single product
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      // ❌ Remove this line: .populate('supplier', 'name phone')
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    res.json(product)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})
// ADD product
router.post('/', protect, async (req, res) => {
  try {
    if (!req.body.govtCode) {
      return res.status(400).json({ message: 'Govt code is required' })
    }
    const exists = await Product.findOne({ govtCode: req.body.govtCode })
    if (exists) {
      return res.status(400).json({
        message: `Govt code "${req.body.govtCode}" already used for ${exists.name} ${exists.size}`
      })
    }

    // Create the product
    const product = await Product.create(req.body)

    // ── Auto create today's stock entry ──
    const today = new Date().toISOString().split('T')[0]

    // Check if today's stock exists for this product already
    const DailyStock = require('../models/DailyStock')
    const stockExists = await DailyStock.findOne({
      date: today,
      product: product._id
    })

    if (!stockExists) {
      // Get yesterday's closing to use as opening
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const yesterdayStock = await DailyStock.findOne({
        date: yesterdayStr,
        product: product._id
      })

      const openingStock = yesterdayStock ? yesterdayStock.cbbo : 0

      await DailyStock.create({
        date: today,
        product: product._id,
        openingStock,
        casesReceived:  0,
        bottlesReceived: 0,
        totalReceived:  0,
        totalAvailable: openingStock,
        salesBottles:   0,
        salesValue:     0,
        cbbo:           openingStock,
        closingCases:   Math.floor(openingStock / product.bottlesPerCase),
        closingBottles: openingStock % product.bottlesPerCase,
        closingValue:   openingStock * product.price,
        recordedBy:     req.body.recordedBy || req.supervisor.id
      })
    }

    res.status(201).json(product)

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// UPDATE product
router.put('/:id', protect, async (req, res) => {
  try {
    if (!req.body.govtCode) {
      return res.status(400).json({ message: 'Govt code is required' })
    }
    const exists = await Product.findOne({
      govtCode: req.body.govtCode,
      _id: { $ne: req.params.id }
    })
    if (exists) {
      return res.status(400).json({ 
        message: `Govt code "${req.body.govtCode}" already used for ${exists.name} ${exists.size}` 
      })
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    res.json(product)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// DELETE product (soft)
router.delete('/:id', protect, async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false })
    res.json({ message: 'Product removed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

module.exports = router