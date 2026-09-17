/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { AppIdentityConfig } from '../types';

interface AppBrandProps {
  config?: AppIdentityConfig;
  variant?: 'sidebar' | 'mobile' | 'login' | 'print' | 'preview-desktop' | 'preview-mobile';
  className?: string;
}

export const AppBrand: React.FC<AppBrandProps> = ({
  config: propConfig,
  variant = 'sidebar',
  className = ''
}) => {
  const { identityConfig: ctxConfig } = useApp();
  const config = propConfig || ctxConfig;

  // Base dimensions according to variant
  let baseLogoSize = 44; // px
  let isMobile = false;

  if (variant === 'mobile' || variant === 'preview-mobile') {
    baseLogoSize = 36;
    isMobile = true;
  } else if (variant === 'login') {
    baseLogoSize = 56;
  } else if (variant === 'print') {
    baseLogoSize = 48;
  }

  // Calculate actual logo size using scale (min 20px, max 140px safely)
  const scaleFactor = (config.logoScale || 100) / 100;
  const computedLogoSize = Math.max(20, Math.min(160, Math.round(baseLogoSize * scaleFactor)));

  // Calculate typography scales
  const appNameFontSize = isMobile 
    ? Math.max(14, Math.round((config.appNameSize || 24) * 0.8)) 
    : (config.appNameSize || 24);
  
  const taglineFontSize = isMobile 
    ? Math.max(7, Math.round((config.taglineSize || 9) * 0.85)) 
    : (config.taglineSize || 9);

  // Outline / Bingkai Logo Configurations
  const isOutlineOn = config.logoOutlineEnabled !== false;
  const outlineWidth = config.logoOutlineWidth ?? 2;
  const outlineColor = config.logoOutlineColor || '#0F172A';
  const outlineRadius = config.logoOutlineRadius ?? 12;
  const outlinePadding = config.logoOutlinePadding ?? 4;

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{
        gap: `${config.logoNameGap ?? 10}px`,
      }}
    >
      {/* LOGO ICON CONTAINER */}
      <div
        className={`flex-shrink-0 flex items-center justify-center transition-all duration-100 ${
          isOutlineOn ? 'bg-white shadow-neo-sm' : ''
        }`}
        style={{
          width: `${computedLogoSize}px`,
          height: `${computedLogoSize}px`,
          transform: `translate(${config.logoX || 0}px, ${config.logoY || 0}px)`,
          borderWidth: isOutlineOn ? `${outlineWidth}px` : '0px',
          borderStyle: isOutlineOn && outlineWidth > 0 ? 'solid' : 'none',
          borderColor: isOutlineOn ? outlineColor : 'transparent',
          borderRadius: isOutlineOn ? `${outlineRadius}px` : '0px',
          padding: isOutlineOn ? `${outlinePadding}px` : '0px',
          backgroundColor: isOutlineOn ? '#FFFFFF' : 'transparent',
          boxShadow: isOutlineOn && outlineWidth > 0 ? `2px 2px 0px ${outlineColor}` : 'none',
        }}
      >
        <img
          src={config.logoUrl || '/LOGO.png'}
          alt={config.appName || 'DATAKU'}
          className="w-full h-full object-contain pointer-events-none"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* TEXT IDENTITY (NAME + TAGLINE) */}
      <div
        className="flex flex-col justify-center text-left leading-none transition-transform duration-100"
        style={{
          transform: `translate(${config.appNameX || 0}px, ${config.appNameY || 0}px)`,
        }}
      >
        {/* App Name */}
        <h1
          className="font-chunky tracking-tight transition-colors duration-150 leading-none"
          style={{
            fontSize: `${appNameFontSize}px`,
            color: config.appNameColor || '#0F172A',
          }}
        >
          {config.appName || 'DATAKU'}
        </h1>

        {/* Tagline Badge */}
        {config.tagline && (
          <div
            style={{
              marginTop: `${config.taglineGap ?? 4}px`,
            }}
          >
            <span
              className="inline-block font-extrabold uppercase rounded border border-[#0F172A] shadow-neo-sm leading-tight transition-all duration-150"
              style={{
                fontSize: `${taglineFontSize}px`,
                color: config.taglineColor || '#0F172A',
                backgroundColor: config.taglineBgColor || '#38BDF8',
                padding: isMobile ? '1.5px 4px' : '2px 6px',
              }}
            >
              {config.tagline}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
