const express = require('express')
const router = express.Router()
const Supplier = require('../models/Supplier')
const { protect } = require('../middleware/auth')

// GET all suppliers
router.get('/', protect, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true })
    res.json(suppliers)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ADD supplier
router.post('/', protect, async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body)
    res.status(201).json(supplier)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// UPDATE supplier
router.put('/:id', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    res.json(supplier)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// DELETE supplier (soft)
router.delete('/:id', protect, async (req, res) => {
  try {
    await Supplier.findByIdAndUpdate(req.params.id, { isActive: false })
    res.json({ message: 'Supplier removed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

module.exports = router