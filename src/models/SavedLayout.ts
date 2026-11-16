/** SavedLayout.ts - saved freezer data with dashboard metadata and timestamps. */
import type { FreezerLayout } from './freezerLayout.js';

/** Describes a stored layout: its id, display name, freezer contents, and ISO creation/update timestamps. */
export interface SavedLayout {
  id: string;
  name: string;
  freezerData: FreezerLayout;
  createdAt: string; 
  updatedAt: string;
}
