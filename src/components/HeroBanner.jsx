import React from 'react';

export default function HeroBanner({ tag, title, subtitle, pills, children }) {
  return (
    <div className="relative bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-blue-50/20 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 border-b border-slate-200/70 dark:border-slate-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 min-h-[170px]">
        <div className="z-10 w-full min-w-0 md:flex-1 max-w-xl">
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
        
        <div className="w-full md:w-[40%] max-w-md self-center shrink-0 pointer-events-none select-none">
          <img
            src="/thapar-campus-photo.jpg"
            alt="Thapar Institute campus building and gardens"
            width="967"
            height="631"
            className="block w-full h-auto rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
