import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Comprehensive ResizeObserver error suppression
// This is a known cosmetic issue with Recharts and doesn't affect functionality
const suppressResizeObserverError = () => {
  const resizeObserverErr = window.console.error;
  window.console.error = (...args) => {
    const errorString = args[0]?.toString?.() || '';
    if (errorString.includes('ResizeObserver')) {
      return;
    }
    resizeObserverErr(...args);
  };
};

// Prevent React error overlay from showing ResizeObserver errors
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }
});

// Suppress unhandled promise rejections related to ResizeObserver
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.toString().includes('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }
});

suppressResizeObserverError();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
