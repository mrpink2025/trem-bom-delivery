import React from 'react';

interface ScooterIconProps {
  className?: string;
  size?: number;
}

export const ScooterIcon: React.FC<ScooterIconProps> = ({ className = "", size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Scooter platform */}
      <path d="M8 15h6c1 0 1.5-0.5 1.5-1.5V12c0-0.5-0.5-1-1-1h-4" />
      
      {/* Front wheel */}
      <circle cx="17" cy="18" r="2.5" />
      <circle cx="17" cy="18" r="1" />
      
      {/* Back wheel */}
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="6" cy="18" r="1" />
      
      {/* Scooter connections */}
      <path d="M14.5 15v3" />
      <path d="M8.5 15v3" />
      
      {/* Handlebars */}
      <path d="M14.5 11V9h1.5" />
      <path d="M15.5 9h1" />
      
      {/* Rider head */}
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      
      {/* Rider helmet */}
      <path d="M10.5 5.5c0-1 0.7-1.5 1.5-1.5s1.5 0.5 1.5 1.5" />
      
      {/* Rider body */}
      <path d="M12 7.5v4" />
      <path d="M12 9l-1.5 1.5" />
      <path d="M12 9l1.5 0.5" />
      
      {/* Rider legs */}
      <path d="M12 11.5l-1 2" />
      <path d="M12 11.5l1 2" />
      
      {/* Delivery backpack */}
      <rect x="10" y="7" width="2" height="3" rx="0.3" fill="currentColor" opacity="0.7" />
      <path d="M11 7v-0.5" stroke-width="1" />
      
      {/* Motion lines */}
      <path d="M2 12h2" opacity="0.5" />
      <path d="M1 14h2.5" opacity="0.5" />
      <path d="M2 16h2" opacity="0.5" />
    </svg>
  );
};