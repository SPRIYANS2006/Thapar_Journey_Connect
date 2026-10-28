import React, { useState } from 'react';

export default function Avatar({ 
  src, 
  name = 'Student', 
  size = 'w-10 h-10', 
  textSize = 'text-sm', 
  rounded = 'rounded-2xl', 
  bg = 'bg-indigo-600', 
  className = '' 
}) {
  const [imageError, setImageError] = useState(false);

  const isUrl = typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:'));

  const initials = typeof src === 'string' && !isUrl && src.length <= 4
    ? src
    : (name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST');

  return (
    <div className={`${size} ${rounded} ${bg} text-white font-extrabold flex items-center justify-center overflow-hidden shrink-0 shadow-xs select-none ${className}`}>
      {isUrl && !imageError ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={`${textSize} tracking-tight`}>{initials}</span>
      )}
    </div>
  );
}
