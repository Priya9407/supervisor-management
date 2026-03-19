const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Supervisor = require('../models/Supervisor')
const { protect, adminOnly } = require('../middleware/auth') // ← only once, with both!

// ─── LOGIN ONLY ────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const supervisor = await Supervisor.findOne({ email })
    if (!supervisor) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const isMatch = await bcrypt.compare(password, supervisor.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const token = jwt.sign(
      {
        id: supervisor._id,
        name: supervisor.name,
        role: supervisor.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      supervisor: {
        id: supervisor._id,
        name: supervisor.name,
        email: supervisor.email,
        role: supervisor.role
      }
    })

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ─── GET LOGGED IN SUPERVISOR ──────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const supervisor = await Supervisor.findById(req.supervisor.id)
      .select('-password')
    res.json(supervisor)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ─── ADMIN ONLY — Get all supervisors ─────────────────────
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await Supervisor.find().select('-password')
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ─── ADMIN ONLY — Add new supervisor ──────────────────────
router.post('/users', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    const exists = await Supervisor.findOne({ email })
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const user = await Supervisor.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'supervisor'
    })

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// ─── ADMIN ONLY — Delete supervisor ───────────────────────
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.supervisor.id) {
      return res.status(400).json({
        message: 'You cannot delete your own account'
      })
    }
    await Supervisor.findByIdAndDelete(req.params.id)
    res.json({ message: 'User removed successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

module.exports = router