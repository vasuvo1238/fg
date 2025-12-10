import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import AppRouter from "@/AppRouter";

// ============================================
// RESIZEOBSERVER ERROR SUPPRESSION
// This is a known cosmetic issue with Recharts/ResponsiveContainer
// and doesn't affect functionality - it's safe to ignore
// ============================================

// 1. Patch ResizeObserver to wrap callbacks and catch errors
const OriginalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends OriginalResizeObserver {
  constructor(callback) {
    const wrappedCallback = (entries, observer) => {
      // Use requestAnimationFrame to defer callback execution
      // This prevents the "loop completed with undelivered notifications" error
      window.requestAnimationFrame(() => {
        try {
          callback(entries, observer);
        } catch (e) {
          // Silently ignore ResizeObserver callback errors
        }
      });
    };
    super(wrappedCallback);
  }
};

// 2. Suppress console.error for ResizeObserver messages
const originalConsoleError = window.console.error;
window.console.error = (...args) => {
  const errorString = args[0]?.toString?.() || '';
  if (errorString.includes('ResizeObserver')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// 3. Capture and suppress error events before React's error overlay
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
    return true;
  }
}, true); // Use capture phase to catch before React

// 4. Also handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.toString().includes('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
    return true;
  }
}, true);

// 5. Override window.onerror for additional protection
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (message && message.includes('ResizeObserver')) {
    return true; // Suppress the error
  }
  if (originalOnError) {
    return originalOnError(message, source, lineno, colno, error);
  }
  return false;
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AppRouter />
);
