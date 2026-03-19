const mongoose = require('mongoose')

const saleSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  bottlesSold: {
    type: Number,
    required: true,
    min: 0
  },
  priceAtSale: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supervisor',
    required: true
  }
}, { timestamps: true })

// One sale record per product per day
saleSchema.index({ date: 1, product: 1 }, { unique: true })

module.exports = mongoose.model('Sale', saleSchema)