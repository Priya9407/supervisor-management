const jwt = require('jsonwebtoken')

const protect = (req, res, next) => {
  try {
    // 1. Check if token exists in request header
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ 
        message: 'Not authorized, no token' 
      })
    }

    // 2. Verify the token is valid and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // 3. Attach supervisor info to request
    req.supervisor = decoded

    // 4. Move on to the actual route
    next()

  } catch (error) {
    res.status(401).json({ 
      message: 'Not authorized, invalid token' 
    })
  }

  
}

const adminOnly = (req, res, next) => {
  if (req.supervisor.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Access denied. Admins only.' 
    })
  }
  next()
}


module.exports = { protect, adminOnly }