"use client";

import React from "react";

type SimpleTooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

export default function SimpleTooltip({ content, children, side = "top" }: SimpleTooltipProps) {
  const basePanel =
    "pointer-events-none absolute z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-xs font-medium rounded-lg shadow-lg border";

  const isTop = side === "top";
  const isBottom = side === "bottom";
  const isLeft = side === "left";
  const isRight = side === "right";

  const position = isTop
    ? "-top-3 translate-y-[-100%] left-1/2 -translate-x-1/2"
    : isBottom
    ? "-bottom-3 translate-y-[100%] left-1/2 -translate-x-1/2"
    : isLeft
    ? "left-0 -translate-x-[110%] top-1/2 -translate-y-1/2"
    : "right-0 translate-x-[110%] top-1/2 -translate-y-1/2";

  const arrowPosition = isTop
    ? "top-full left-1/2 -translate-x-1/2"
    : isBottom
    ? "bottom-full left-1/2 -translate-x-1/2"
    : isLeft
    ? "left-full top-1/2 -translate-y-1/2"
    : "right-full top-1/2 -translate-y-1/2";

  return (
    <span className="relative inline-block group">
      {children}
      <span
        className={`${basePanel} ${position} px-3 py-2 bg-gray-900 text-white border-gray-800 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800`}
        role="tooltip"
      >
        {content}
        <span
          className={`absolute w-3 h-3 rotate-45 bg-gray-900 dark:bg-slate-900 border border-gray-800 dark:border-slate-800 ${arrowPosition}`}
          aria-hidden="true"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}
        />
      </span>
    </span>
  );
}

