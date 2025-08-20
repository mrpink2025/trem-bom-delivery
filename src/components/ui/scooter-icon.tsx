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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Main body/platform */}
      <path d="M8 14h8c1 0 2-1 2-2V9c0-1-1-2-2-2h-6" />
      
      {/* Handlebars */}
      <path d="M14 7V5h2" />
      <path d="M15 5h1" />
      
      {/* Front wheel */}
      <circle cx="18" cy="17" r="3" />
      <circle cx="18" cy="17" r="1" />
      
      {/* Back wheel */}
      <circle cx="6" cy="17" r="3" />
      <circle cx="6" cy="17" r="1" />
      
      {/* Connecting parts */}
      <path d="M15 14v3" />
      <path d="M9 14v3" />
      
      {/* Seat */}
      <path d="M10 9h4v2h-4z" />
      
      {/* Delivery box */}
      <rect x="3" y="8" width="4" height="3" rx="0.5" />
      <path d="M3 9.5h4" />
    </svg>
  );
};