const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 'IMFL' or 'BEER'
  productType: {
    type: String,
    enum: ['IMFL', 'BEER'],
    required: true
  },
  // Whisky, Rum, Brandy, Vodka (IMFL) or Lehar, Strong (BEER)
  subCategory: {
    type: String,
    required: true,
    trim: true
  },
  // Low, Medium, Premium (IMFL) or 'NA' (BEER)
  priceCategory: {
    type: String,
    required: true,
    trim: true,
    default: 'NA'
  },
  // 180ml, 360ml, 750ml etc — from Config
  size: {
    type: String,
    required: true,
    trim: true
  },
  // Auto suggested from Config meta, supervisor can override
  bottlesPerCase: {
    type: Number,
    required: true
  },
  // Government assigned code — unique per brand per size
  govtCode: {
  type: String,
  trim: true,
  required: true,   // ← mandatory
  unique: true,
  sparse: true
},
  // Selling price per bottle
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // Below this quantity show low stock alert
  lowStockAlert: {
    type: Number,
    default: 10
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

module.exports = mongoose.model('Product', productSchema)