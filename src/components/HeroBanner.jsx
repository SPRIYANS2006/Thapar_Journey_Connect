import React from 'react';

export default function HeroBanner({ tag, title, subtitle, pills, children, compact = false }) {
  return (
    <div className="relative bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-blue-50/20 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 border-b border-slate-200/70 dark:border-slate-800 overflow-hidden">
      <div className="absolute inset-0 md:left-[38%] pointer-events-none select-none">
        <img src="/thapar-campus-photo.jpg" alt="" width="967" height="631" className="w-full h-full object-cover object-[center_40%] opacity-25 md:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-blue-50/90 to-blue-50/20 dark:from-slate-900 dark:via-slate-900/85 dark:to-slate-900/20 md:via-blue-50/30 md:to-transparent dark:md:via-slate-900/30 dark:md:to-transparent" />
      </div>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative flex items-center ${compact ? 'min-h-[190px] sm:min-h-[220px]' : 'min-h-[240px] sm:min-h-[270px]'}`}>
        <div className="z-10 w-full md:w-[58%] min-w-0 max-w-xl">
          {tag && (
            <span className="inline-block text-[11px] font-extrabold tracking-wider text-blue-600 dark:text-blue-400 uppercase bg-blue-100/80 dark:bg-blue-950/80 px-2.5 py-0.5 rounded-md mb-2">
              {tag}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1">
              {subtitle}
            </p>
          )}
          {pills && (
            <div className="flex items-center gap-2.5 mt-4 flex-wrap">
              {pills}
            </div>
          )}
          {children}
        </div>
        

      </div>
    </div>
  );
}
