import React from 'react';

interface AkgLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AkgLogo: React.FC<AkgLogoProps> = ({ className = '', size = 'md' }) => {
  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-14' : 'h-10';

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <svg
        className={`${heightClass} w-auto`}
        viewBox="0 0 540 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="akgShield" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0077c8" />
            <stop offset="100%" stopColor="#004c81" />
          </linearGradient>
          <linearGradient id="akgSilver" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#d5dbe2" />
            <stop offset="60%" stopColor="#9aa6b2" />
            <stop offset="100%" stopColor="#7a8794" />
          </linearGradient>
          <filter id="akgShadow" x="-10%" y="-10%" width="125%" height="125%">
            <feDropShadow dx="2" dy="2" stdDeviation="1.5" floodColor="#0f2d4d" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* AKG Radiator Blue Shield */}
        <g transform="translate(14, 12)">
          {/* Top Cap */}
          <rect x="42" y="3" width="46" height="11" rx="3" fill="#0077c8" stroke="#004c81" strokeWidth="2" />
          {/* Main Shield */}
          <path
            d="M 22 25 L 108 25 L 126 142 C 126 150, 118 156, 110 156 L 20 156 C 12 156, 4 150, 4 142 Z"
            fill="url(#akgShield)"
            stroke="#003761"
            strokeWidth="3.5"
          />
          {/* White Center Blade / Fin */}
          <path
            d="M 64 38 C 50 58, 44 82, 44 112 C 44 118, 54 118, 56 112 C 64 88, 76 66, 78 40 C 74 38, 68 38, 64 38 Z"
            fill="#ffffff"
          />
          {/* 3 Wavy Flow Lines */}
          <path d="M 14 122 Q 35 116, 56 122 T 98 122 T 116 122" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M 14 135 Q 35 129, 56 135 T 98 135 T 116 135" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M 14 148 Q 35 142, 56 148 T 98 148 T 116 148" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" />
        </g>

        {/* AKG Metallic Typo */}
        <g transform="translate(155, 30)" filter="url(#akgShadow)">
          {/* Letter A */}
          <path
            d="M 62 116 L 88 116 L 58 10 L 26 10 L 0 116 L 26 116 L 32 90 L 56 90 Z M 44 38 L 51 68 L 37 68 Z"
            fill="url(#akgSilver)"
            stroke="#5c6773"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Letter K */}
          <path
            d="M 96 10 L 96 116 L 124 116 L 124 75 L 160 116 L 198 116 L 150 63 L 192 10 L 156 10 L 124 53 L 124 10 Z"
            fill="url(#akgSilver)"
            stroke="#5c6773"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Letter G */}
          <path
            d="M 276 38 C 266 20, 246 8, 222 8 C 185 8, 160 36, 160 72 C 160 108, 186 136, 224 136 C 260 136, 282 116, 284 82 L 234 82 L 234 64 L 308 64 C 309 72, 310 80, 310 90 C 310 132, 274 156, 222 156 C 168 156, 134 118, 134 72 C 134 26, 172 -12, 226 -12 C 262 -12, 290 4, 304 26 Z"
            fill="url(#akgSilver)"
            stroke="#5c6773"
            strokeWidth="3"
            strokeLinejoin="round"
            transform="translate(42, -10) scale(0.85)"
          />

          {/* Registered (R) */}
          <circle cx="340" cy="18" r="14" fill="none" stroke="#718096" strokeWidth="2.5" />
          <text x="340" y="24" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="#718096" textAnchor="middle">
            R
          </text>
        </g>
      </svg>
    </div>
  );
};
