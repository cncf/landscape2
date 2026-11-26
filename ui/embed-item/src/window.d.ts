import type { LandscapeColors } from 'common';

declare global {
  interface Window {
    // Set by the generated embed-item.html (absent when the page is served without the template)
    colors: LandscapeColors | undefined;
  }
}
