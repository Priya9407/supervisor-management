const express = require('express')
const router = express.Router()
const Sale = require('../models/Sale')
const DailyStock = require('../models/DailyStock')
const { protect } = require('../middleware/auth')

// GET sales by date
// GET /api/sales?date=2024-03-14
router.get('/', protect, async (req, res) => {
  try {
    const date = req.query.date ||
      new Date().toISOString().split('T')[0]
    const sales = await Sale.find({ date })
      .populate('product', 'name size priceCategory subCategory')
      .populate('recordedBy', 'name')
    res.json(sales)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// GET sales report between dates
// GET /api/sales/report?from=2024-03-01&to=2024-03-14
router.get('/report', protect, async (req, res) => {
  try {
    const { from, to } = req.query
    const sales = await Sale.find({
      date: { $gte: from, $lte: to }
    })
      .populate('product', 'name size priceCategory subCategory productType')
      .populate('recordedBy', 'name')
      .sort({ date: 1 })
    
    // Calculate total
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    
    res.json({ sales, totalRevenue })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ADD sale record
router.post('/', protect, async (req, res) => {
  try {
    const { productId, bottlesSold, date } = req.body

    // Get product price
    const Product = require('../models/Product')
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    const totalAmount = product.price * bottlesSold
    const saleDate = date || new Date().toISOString().split('T')[0]

    // Create sale record
    const sale = await Sale.create({
      date: saleDate,
      product: productId,
      bottlesSold,
      priceAtSale: product.price,
      totalAmount,
      recordedBy: req.supervisor.id
    })

    // Update daily stock
    const stockEntry = await DailyStock.findOne({
      date: saleDate,
      product: productId
    })

    if (stockEntry) {
      const newSales = stockEntry.salesBottles + bottlesSold
      const newClosing = stockEntry.totalAvailable - newSales
      await DailyStock.findByIdAndUpdate(stockEntry._id, {
        salesBottles: newSales,
        closingStock: newClosing
      })
    }

    res.status(201).json(sale)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// UPDATE sale
router.put('/:id', protect, async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    res.json(sale)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// DELETE sale
router.delete('/:id', protect, async (req, res) => {
  try {
    await Sale.findByIdAndDelete(req.params.id)
    res.json({ message: 'Sale record removed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

module.exports = router