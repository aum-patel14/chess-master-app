import React from 'react';

interface DifficultyBadgeProps {
  elo: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function DifficultyBadge({
  elo,
  style,
  className,
}: DifficultyBadgeProps) {
  const getDifficultyDetails = () => {
    if (elo < 800) {
      return {
        label: 'Beginner',
        color: '#6bbd44', // Green
        bg: 'rgba(107, 189, 68, 0.15)',
        border: '1px solid rgba(107, 189, 68, 0.3)',
      };
    } else if (elo < 1200) {
      return {
        label: 'Easy',
        color: '#a3e635', // Lime
        bg: 'rgba(163, 230, 53, 0.15)',
        border: '1px solid rgba(163, 230, 53, 0.3)',
      };
    } else if (elo < 1600) {
      return {
        label: 'Intermediate',
        color: '#f59e0b', // Yellow/Amber
        bg: 'rgba(245, 158, 11, 0.15)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
      };
    } else if (elo < 2000) {
      return {
        label: 'Advanced',
        color: '#f97316', // Orange
        bg: 'rgba(249, 115, 22, 0.15)',
        border: '1px solid rgba(249, 115, 22, 0.3)',
      };
    } else if (elo < 2400) {
      return {
        label: 'Expert',
        color: '#ef4444', // Red
        bg: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      };
    } else {
      return {
        label: 'Master',
        color: '#a855f7', // Purple
        bg: 'rgba(168, 85, 247, 0.15)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
      };
    }
  };

  const details = getDifficultyDetails();

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
    color: details.color,
    background: details.bg,
    border: details.border,
    ...style,
  };

  return (
    <span className={className} style={baseStyle}>
      {details.label}
    </span>
  );
}
