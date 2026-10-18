import React from 'react';

export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  layout?: 'horizontal' | 'vertical';
  subtitle?: string;
  className?: string;
}

export const LogoIcon: React.FC<{
  size?: number | string;
  className?: string;
}> = ({ size = 32, className = '' }) => {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id="cogni-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="55%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="cogni-spark-grad" x1="14" y1="7" x2="26" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
      </defs>

      {/* Squircle base */}
      <rect width="40" height="40" rx="10" fill="url(#cogni-logo-grad)" />

      {/* Subtle border outline */}
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="9.25"
        stroke="white"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />

      {/* Retrieval Layer 2 (Bottom vector plane) */}
      <path
        d="M11 25.5L20 29.5L29 25.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />

      {/* Retrieval Layer 1 (Middle vector plane) */}
      <path
        d="M11 20.5L20 24.5L29 20.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.85"
      />

      {/* AI Intelligence Spark (Top synthesis) */}
      <path
        d="M20 7.5L22.5 12.8L28 14.5L22.5 16.2L20 21.5L17.5 16.2L12 14.5L17.5 12.8L20 7.5Z"
        fill="url(#cogni-spark-grad)"
      />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  layout = 'horizontal',
  subtitle,
  className = '',
}) => {
  const sizeMap = {
    xs: { icon: 22, text: 'text-sm', sub: 'text-[10px]', gap: 'gap-1.5' },
    sm: { icon: 28, text: 'text-base', sub: 'text-xs', gap: 'gap-2' },
    md: { icon: 34, text: 'text-lg', sub: 'text-xs', gap: 'gap-2.5' },
    lg: { icon: 44, text: 'text-2xl sm:text-3xl', sub: 'text-sm', gap: 'gap-3.5' },
    xl: { icon: 56, text: 'text-3xl sm:text-4xl', sub: 'text-base', gap: 'gap-4' },
  };

  const { icon, text, sub, gap } = sizeMap[size];

  return (
    <div
      className={`group select-none inline-flex ${
        layout === 'vertical' ? 'flex-col items-center text-center' : 'items-center'
      } ${gap} ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Subtle ambient glow behind logo */}
        <div className="absolute inset-0 rounded-xl bg-brand-500/30 blur-md group-hover:bg-brand-500/50 transition-all duration-300" />
        <LogoIcon size={icon} className="relative z-10" />
      </div>

      {showText && (
        <div className={layout === 'vertical' ? 'mt-1' : ''}>
          <span className={`${text} font-extrabold tracking-tight text-white flex items-center justify-center gap-0.5 leading-none`}>
            Cogni
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-accent-violet to-accent-cyan font-black">
              RAG
            </span>
          </span>
          {subtitle && (
            <p className={`${sub} text-slate-400 font-medium mt-1.5`}>{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
};

