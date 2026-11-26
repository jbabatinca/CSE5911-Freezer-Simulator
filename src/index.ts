/**
 * index.ts - browser entry point. Applies the saved theme, then starts the
 * app (App() builds the UI inside the #app element).
 */
import { App } from './render/App.js';
import { initializeTheme } from './state/themeState.js';
import { polyfill } from 'mobile-drag-drop';
import 'mobile-drag-drop/default.css';

// Turns touch gestures into the drag events App.ts already listens for.
// Hold for 300 ms to start a drag, so a normal swipe still scrolls the page.
polyfill({ holdToDrag: 300 });

// iOS Safari needs a non-passive touchmove listener, or the page scrolls while you drag.
window.addEventListener('touchmove', () => {}, { passive: false });

initializeTheme();
App();
