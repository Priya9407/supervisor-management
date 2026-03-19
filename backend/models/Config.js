const mongoose = require('mongoose')

const configSchema = new mongoose.Schema({
  // What type of config is this?
  // e.g. "bottleSize", "spiritType", "priceCategory", "beerType"
  configType: {
    type: String,
    required: true,
    trim: true
  },
  // The actual value
  // e.g. "180ml", "Whisky", "Low", "Lehar"
  value: {
    type: String,
    required: true,
    trim: true
  },
  // For sorting in the sheet
  // 180ml = 1, 360ml = 2, 750ml = 3 etc
  sortOrder: {
    type: Number,
    default: 0
  },
  // Extra info if needed
  // e.g. for bottleSize: { defaultBottlesPerCase: 24 }
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })


configSchema.index(
  { configType: 1, value: 1, 'meta.productType': 1 },
  { unique: true, sparse: true }
)
module.exports = mongoose.model('Config', configSchema)