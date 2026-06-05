import React from 'react';

interface AvatarProps {
  src?: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function Avatar({
  src,
  username = 'User',
  size = 'md',
  online = false,
  style,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { width: '28px', height: '28px', fontSize: '11px', dotSize: '8px', offset: '0px' };
      case 'md':
        return { width: '40px', height: '40px', fontSize: '14px', dotSize: '11px', offset: '1px' };
      case 'lg':
        return { width: '60px', height: '60px', fontSize: '20px', dotSize: '15px', offset: '2px' };
    }
  };

  const dim = getDimensions();

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase() || 'U';
  };

  // Generate a random stable background color for the avatar fallback based on the name
  const getBackgroundColor = (name: string) => {
    const colors = [
      '#4f46e5', '#0891b2', '#0d9488', '#059669',
      '#b45309', '#dc2626', '#7c3aed', '#db2777'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: dim.width,
    height: dim.width,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
    ...style,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #333333',
  };

  const fallbackStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: getBackgroundColor(username),
    color: '#ffffff',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #333333',
    userSelect: 'none',
  };

  const dotStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: dim.offset,
    right: dim.offset,
    width: dim.dotSize,
    height: dim.dotSize,
    borderRadius: '50%',
    background: '#6bbd44',
    border: '2px solid #1e1e1e',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  };

  return (
    <div className={className} style={containerStyle}>
      {src && !imageError ? (
        <img
          src={src}
          alt={username}
          onError={() => setImageError(true)}
          style={imageStyle}
        />
      ) : (
        <div style={fallbackStyle}>
          {getInitials(username)}
        </div>
      )}
      {online && <div style={dotStyle} />}
    </div>
  );
}
