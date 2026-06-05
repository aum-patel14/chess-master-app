export const theme = {
  colors: {
    // Backgrounds (match Chess.com)
    bgPage:       '#2b2b2b',  // main page background
    bgCard:       '#1e1e1e',  // card surfaces
    bgNav:        '#1a1a1a',  // navbar and drawer
    bgInput:      '#2f2f2f',  // input fields
    bgHover:      '#333333',  // hover states

    // Brand
    primary:      '#6bbd44',  // Chess.com green — CTA buttons
    primaryHover: '#5aad33',  // darker green on hover
    danger:       '#c0392b',  // resign / error
    warning:      '#f39c12',  // streaks, warnings
    gold:         '#f5c518',  // premium badge

    // Board colours (classic Chess.com)
    boardLight:   '#f0d9b5',  // light squares
    boardDark:    '#b58863',  // dark squares
    boardHighlight: 'rgba(235,208,5,0.4)',   // last move
    boardSelected:  'rgba(20,85,30,0.5)',    // selected piece
    boardDot:       'rgba(0,0,0,0.2)',       // valid move dots

    // Text
    textPrimary:   '#ffffff',
    textSecondary: '#aaaaaa',
    textMuted:     '#666666',
    textLink:      '#6bbd44',
  },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    h1: { size: '32px', weight: 800 },
    h2: { size: '24px', weight: 700 },
    h3: { size: '18px', weight: 600 },
    body: { size: '15px', weight: 400 },
    small: { size: '13px', weight: 400 },
    caption: { size: '11px', weight: 400 },
  },

  spacing: {
    xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '48px'
  },

  radius: {
    sm: '6px', md: '8px', lg: '12px', full: '9999px'
  }
};
