import { useEffect } from 'react'

interface DocumentTitleProps {
  title: string
  description?: string
}

export function DocumentTitle({ title, description }: DocumentTitleProps) {
  useEffect(() => {
    // 1. Update tab title
    const fullTitle = `${title} | Chessmaster Pro`
    document.title = fullTitle

    // Update OG & Twitter titles
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute('content', fullTitle)
    const twitterTitle = document.querySelector('meta[name="twitter:title"], meta[property="twitter:title"]')
    if (twitterTitle) twitterTitle.setAttribute('content', fullTitle)

    // 2. Update descriptions if provided
    if (description) {
      const selectors = [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
        'meta[property="twitter:description"]'
      ]
      selectors.forEach((selector) => {
        const tag = document.querySelector(selector)
        if (tag) tag.setAttribute('content', description)
      })
    }
  }, [title, description])

  return null
}
