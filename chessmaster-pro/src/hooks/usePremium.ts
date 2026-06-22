import { useState, useEffect } from 'react'

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    const checkPremium = () => {
      const mockPremium = localStorage.getItem('chess_premium_mock') === 'true'
      const plan = localStorage.getItem('plan') === 'premium'
      setIsPremium(mockPremium || plan)
    }

    checkPremium()

    // Set up local interval to watch for storage changes in the same window context
    const interval = setInterval(checkPremium, 1000)

    window.addEventListener('storage', checkPremium)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', checkPremium)
    }
  }, [])

  return { isPremium }
}
