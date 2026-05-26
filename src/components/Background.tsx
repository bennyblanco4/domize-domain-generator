"use client";

import React from "react";

export default function Background(): JSX.Element {
  return (
    <div 
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        minHeight: '-webkit-fill-available', // iOS Safari fix
      }}
    >
      <div className="hero-gradient" />
      <div className="noise-overlay" />
    </div>
  );
}

