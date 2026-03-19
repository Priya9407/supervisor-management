const express = require('express')
const router = express.Router()
const Config = require('../models/Config')
const { protect } = require('../middleware/auth')

// GET all configs or filter by type
// GET /api/config?type=bottleSize
router.get('/', protect, async (req, res) => {
  try {
    const filter = { isActive: true }
    if (req.query.type) {
      filter.configType = req.query.type
    }
    const configs = await Config.find(filter).sort({ sortOrder: 1 })
    res.json(configs)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ADD new config value
// POST /api/config
router.post('/', protect, async (req, res) => {
  try {
    const config = await Config.create(req.body)
    res.status(201).json(config)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// UPDATE config value
// PUT /api/config/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const config = await Config.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    res.json(config)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// GET shop details
router.get('/shop', protect, async (req, res) => {
  try {
    const shop = await Config.findOne({ 
      configType: 'shopDetails', 
      value: 'main' 
    })
    res.json(shop?.meta || {
      name: 'TAMIL NADU STATE MARKETING LIMITED',
      area: 'KANCHEEPURAM NORTH',
      shopNo: '4359'
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// UPDATE shop details
router.put('/shop', protect, async (req, res) => {
  try {
    const shop = await Config.findOneAndUpdate(
      { configType: 'shopDetails', value: 'main' },
      { meta: req.body },
      { returnDocument: 'after', upsert: true }
    )
    res.json(shop.meta)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// DELETE config value
// DELETE /api/config/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Config.findByIdAndUpdate(req.params.id, { isActive: false })
    res.json({ message: 'Config removed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

module.exports = router