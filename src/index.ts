/**
 * index.ts - browser entry point. Applies the saved theme, then starts the
 * app (App() builds the UI inside the #app element).
 */
import { App } from './render/App.js';
import { initializeTheme } from './state/themeState.js';

initializeTheme();
App();
