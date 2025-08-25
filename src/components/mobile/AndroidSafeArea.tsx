import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { cn } from '@/lib/utils';

interface AndroidSafeAreaProps {
  children: React.ReactNode;
  className?: string;
  statusBarStyle?: 'light' | 'dark';
  statusBarColor?: string;
}

export function AndroidSafeArea({ 
  children, 
  className,
  statusBarStyle = 'dark',
  statusBarColor = '#D97706'
}: AndroidSafeAreaProps) {
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0
  });
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const setupAndroidLayout = async () => {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        setIsAndroid(true);
        
        try {
          // Configure status bar
          await StatusBar.setStyle({ 
            style: statusBarStyle === 'light' ? Style.Light : Style.Dark 
          });
          
          await StatusBar.setBackgroundColor({ 
            color: statusBarColor 
          });

          await StatusBar.setOverlaysWebView({ overlay: false });

          // Get safe area insets for Android
          // Android typically has:
          // - Status bar: ~24-48dp (depending on device)
          // - Navigation bar: ~48dp (if using gesture navigation, it's smaller)
          const statusBarHeight = await getStatusBarHeight();
          const navigationBarHeight = await getNavigationBarHeight();

          setSafeAreaInsets({
            top: statusBarHeight,
            bottom: navigationBarHeight
          });

          console.log('Android safe area insets:', { 
            top: statusBarHeight, 
            bottom: navigationBarHeight 
          });

        } catch (error) {
          console.error('Error setting up Android layout:', error);
          // Fallback values for Android
          setSafeAreaInsets({
            top: 24, // Default status bar height
            bottom: 48 // Default navigation bar height
          });
        }
      }
    };

    setupAndroidLayout();
  }, [statusBarStyle, statusBarColor]);

  const getStatusBarHeight = async (): Promise<number> => {
    try {
      // For Android, use a default height since StatusBarInfo doesn't have height property
      return 24; // Standard Android status bar height in dp
    } catch (error) {
      console.error('Could not get status bar height:', error);
      return 24; // Default fallback
    }
  };

  const getNavigationBarHeight = (): Promise<number> => {
    return new Promise((resolve) => {
      // For Android, we can estimate based on screen dimensions
      // or use CSS env() variables if available
      const height = window.innerHeight;
      const screenHeight = window.screen.height;
      const difference = screenHeight - height;
      
      // If there's a significant difference, likely navigation bar is present
      if (difference > 40) {
        resolve(Math.min(difference, 60)); // Cap at 60px
      } else {
        resolve(12); // Gesture navigation or hidden navigation
      }
    });
  };

  if (!isAndroid) {
    // On web or iOS, render without safe area adjustments
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      className={cn(
        "min-h-screen flex flex-col",
        className
      )}
      style={{
        paddingTop: `${safeAreaInsets.top}px`,
        paddingBottom: `${safeAreaInsets.bottom}px`,
        // Ensure the content doesn't overflow behind system bars
        boxSizing: 'border-box'
      }}
    >
      {/* Status bar background overlay */}
      <div 
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: `${safeAreaInsets.top}px`,
          backgroundColor: statusBarColor,
        }}
      />
      
      {/* Main content */}
      <div className="flex-1 relative">
        {children}
      </div>
      
      {/* Navigation bar spacer */}
      <div 
        className="fixed bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: `${safeAreaInsets.bottom}px`,
          background: 'transparent',
        }}
      />
    </div>
  );
}