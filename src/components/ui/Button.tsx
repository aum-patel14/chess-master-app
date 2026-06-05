import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  // Styles mapped to Chess.com spec
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: '#6bbd44',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #589b37',
          hoverBg: '#78d24c',
          activeBg: '#589b37',
        };
      case 'secondary':
        return {
          background: '#3a3a3a',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #282828',
          hoverBg: '#484848',
          activeBg: '#2a2a2a',
        };
      case 'danger':
        return {
          background: '#c0392b',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 0 #8b251a',
          hoverBg: '#d9534f',
          activeBg: '#8b251a',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: '#ffffff',
          border: 'none',
          boxShadow: 'none',
          hoverBg: 'rgba(255, 255, 255, 0.1)',
          activeBg: 'rgba(255, 255, 255, 0.15)',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          height: '32px',
          padding: '0 12px',
          fontSize: '13px',
          borderRadius: '4px',
        };
      case 'md':
        return {
          height: '40px',
          padding: '0 18px',
          fontSize: '14px',
          borderRadius: '6px',
        };
      case 'lg':
        return {
          height: '52px',
          padding: '0 24px',
          fontSize: '16px',
          borderRadius: '8px',
        };
    }
  };

  const vStyle = getVariantStyles();
  const sStyle = getSizeStyles();
  const isButtonDisabled = disabled || loading;

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'inherit',
    fontWeight: 700,
    cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
    width: fullWidth ? '100%' : 'auto',
    opacity: isButtonDisabled ? 0.6 : 1,
    transition: 'all 0.15s ease',
    textDecoration: 'none',
    boxSizing: 'border-box',
    transform: 'translateY(0)',
    ...sStyle,
    ...vStyle,
    ...style,
  };

  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  const finalStyle: React.CSSProperties = {
    ...baseStyle,
    background: isButtonDisabled
      ? vStyle.background
      : isActive
      ? vStyle.activeBg
      : isHovered
      ? vStyle.hoverBg
      : vStyle.background,
    transform: !isButtonDisabled && isActive ? 'translateY(2px)' : 'translateY(0)',
    boxShadow: !isButtonDisabled && isActive
      ? 'none'
      : (isButtonDisabled ? 'none' : vStyle.boxShadow),
  };

  return (
    <button
      disabled={isButtonDisabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      style={finalStyle}
      {...props}
    >
      {loading ? (
        <span
          style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '50%',
            borderTopColor: '#fff',
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : (
        icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      )}
      {children}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
