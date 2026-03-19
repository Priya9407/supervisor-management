const mongoose = require('mongoose')

const dailyStockSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // Opening Balance — auto from yesterday's CBBO
  openingStock: {
    type: Number,
    default: 0
  },
  // Morning entry — cases received
  casesReceived: {
    type: Number,
    default: 0
  },
  // Morning entry — loose bottles received
  bottlesReceived: {
    type: Number,
    default: 0
  },
  // Auto calculated: casesReceived × bottlesPerCase + bottlesReceived
  totalReceived: {
    type: Number,
    default: 0
  },
  // Auto calculated: openingStock + totalReceived
  totalAvailable: {
    type: Number,
    default: 0
  },
  // Night entry — bottles sold
  salesBottles: {
    type: Number,
    default: 0
  },
  // Auto calculated: totalAvailable × RATE
  salesValue: {
    type: Number,
    default: 0
  },
  // Auto calculated: totalAvailable - salesBottles
  cbbo: {
    type: Number,
    default: 0
  },
  // Auto calculated: Math.floor(cbbo / bottlesPerCase)
  closingCases: {
    type: Number,
    default: 0
  },
  // Auto calculated: cbbo % bottlesPerCase
  closingBottles: {
    type: Number,
    default: 0
  },
  // Auto calculated: cbbo × RATE
  closingValue: {
    type: Number,
    default: 0
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supervisor',
    required: true
  }
}, { timestamps: true })

// One record per product per day — no duplicates
dailyStockSchema.index({ date: 1, product: 1 }, { unique: true })

module.exports = mongoose.model('DailyStock', dailyStockSchema)