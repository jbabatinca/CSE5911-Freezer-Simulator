import type { FreezerLayout } from './freezerLayout.js';

export interface SavedLayout {
  id: string;
  name: string;
  freezerData: FreezerLayout;
  createdAt: string; 
  updatedAt: string;
}