import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── Make the app feel native (disable all browser behaviors) ──

// 1. Disable right-click context menu
document.addEventListener('contextmenu', e => e.preventDefault());

// 2. Disable mouse scroll changing number inputs globally
document.addEventListener('wheel', (e) => {
  const target = e.target as HTMLElement;
  if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
    target.blur();
  }
});

// 3. Disable browser keyboard shortcuts that expose browser UI
document.addEventListener('keydown', e => {
  // Ctrl+R / F5 — Refresh (not native-like)
  if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
    e.preventDefault();
  }
  // Ctrl+P — Print dialog
  if (e.ctrlKey && e.key === 'p') {
    e.preventDefault();
  }
  // Ctrl+U — View source
  if (e.ctrlKey && e.key === 'u') {
    e.preventDefault();
  }
  // Ctrl+Shift+I / F12 — DevTools
  if ((e.ctrlKey && e.shiftKey && e.key === 'I') || e.key === 'F12') {
    e.preventDefault();
  }
  // Ctrl+F — Browser find dialog
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
  }
  // Ctrl+G — Find next
  if (e.ctrlKey && e.key === 'g') {
    e.preventDefault();
  }
  // Ctrl+S — Save page
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
  }
  // Ctrl+Shift+J — Console
  if (e.ctrlKey && e.shiftKey && e.key === 'J') {
    e.preventDefault();
  }
  // F7 — Caret browsing
  if (e.key === 'F7') {
    e.preventDefault();
  }
});

// 3. Disable drag-and-drop of images and links (browser-like behavior)
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());
document.addEventListener('dragover', e => e.preventDefault());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
