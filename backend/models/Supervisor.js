const mongoose = require('mongoose')

const supervisorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
  type: String,
  enum: ['admin', 'supervisor'],
  default: 'supervisor'
}
}, { timestamps: true })

module.exports = mongoose.model('Supervisor', supervisorSchema)