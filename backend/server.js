const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()

app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json())

try {
  app.use('/api/auth',      require('./routes/auth'))
  console.log('✅ auth route loaded')
  app.use('/api/config',    require('./routes/config'))
  console.log('✅ config route loaded')
  app.use('/api/products',  require('./routes/products'))
  console.log('✅ products route loaded')
  app.use('/api/stock',     require('./routes/stock'))
  console.log('✅ stock route loaded')
  app.use('/api/suppliers', require('./routes/suppliers'))
  console.log('✅ suppliers route loaded')
  app.use('/api/sales', require('./routes/sales'))
  app.use('/api/report', require('./routes/report'))
} catch (error) {
  console.log('❌ Route loading error:', error.message)
}

app.get('/', (req, res) => {
  res.send('🍷 Wine Shop Server is Running!')
})

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected!')
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.log('❌ Connection failed:', error.message)
  })