import React from 'react';

interface CardProps {
  padding?: string;
  hover?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export default function Card({
  padding = '16px',
  hover = false,
  onClick,
  children,
  style,
  className,
}: CardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    background: '#1e1e1e',
    border: '1px solid #333333',
    borderRadius: '12px',
    padding: padding,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
    cursor: onClick ? 'pointer' : 'default',
    boxSizing: 'border-box',
    ...style,
  };

  const finalStyle: React.CSSProperties = {
    ...baseStyle,
    background: hover && isHovered ? '#252525' : '#1e1e1e',
    transform: hover && isHovered && onClick ? 'translateY(-2px)' : 'none',
  };

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={finalStyle}
    >
      {children}
    </div>
  );
}
