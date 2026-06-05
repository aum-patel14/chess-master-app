import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'premium' | 'info';
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export default function Badge({
  variant = 'info',
  children,
  style,
  className,
}: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          background: 'rgba(107, 189, 68, 0.15)',
          color: '#6bbd44',
          border: '1px solid rgba(107, 189, 68, 0.3)',
        };
      case 'warning':
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        };
      case 'danger':
        return {
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        };
      case 'premium':
        return {
          background: 'linear-gradient(135deg, #f5c518 0%, #d4af37 100%)',
          color: '#000000',
          border: 'none',
          fontWeight: 800,
        };
      case 'info':
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          color: '#3b82f6',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        };
    }
  };

  const vStyle = getVariantStyles();

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: '1',
    userSelect: 'none',
    boxSizing: 'border-box',
    ...vStyle,
    ...style,
  };

  return (
    <span className={className} style={baseStyle}>
      {children}
    </span>
  );
}
