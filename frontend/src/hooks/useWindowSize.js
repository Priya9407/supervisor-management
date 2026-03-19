import { useState, useEffect } from 'react'

const useWindowSize = () => {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    ...size,
    isMobile: size.width < 600,
    isTablet: size.width >= 600 && size.width < 900,
    isDesktop: size.width >= 900,
  }
}

export default useWindowSize