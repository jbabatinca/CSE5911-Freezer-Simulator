import type { QuestionSet } from '../../src/models/QuestionSet.js';
import type { SavedLayout } from '../../src/models/SavedLayout.js';

// Stable IDs keep assertions independent of the layout service's ID generators.
export function makeLayout(id = 'layout-1'): SavedLayout {
  return {
    id,
    name: `Freezer ${id}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    freezerData: {
      schemaVersion: '1.0', id, name: 'Freezer',
      samples: [{ id: `${id}-sample`, name: 'Serum' }],
      shelves: [{
        id: `${id}-shelf`, name: 'Top shelf',
        racks: [1, 2].map(index => ({
          id: `${id}-rack-${index}`, name: `Rack ${index}`, color: '#FFFFFF',
          boxSlots: [{
            row: 1, column: 1,
            box: {
              id: `${id}-box-${index}`, name: `Box ${index}`, color: '#FFFFFF',
              rows: 9, columns: 9,
              positions: [
                { id: `${id}-position-${index}`, label: 'A1', row: 1, column: 1, sampleId: `${id}-sample` },
                { id: `${id}-empty-${index}`, label: 'A2', row: 1, column: 2 },
              ],
            },
          }, { row: 1, column: 2, box: null }],
        })),
      }],
    },
  };
}

export function makeQuestionSet(overrides: Partial<QuestionSet> = {}): QuestionSet {
  return {
    id: 'set-1', name: 'Orientation', description: 'Find the targets', layoutId: 'layout-1',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    questions: [
      { id: 'q-rack', prompt: 'Find Rack 1', targetType: 'rack', targetId: 'layout-1-rack-1' },
      { id: 'q-box', prompt: 'Find Box 1', targetType: 'box', targetId: 'layout-1-box-1' },
      { id: 'q-sample', prompt: 'Find Serum', targetType: 'sample', targetId: 'layout-1-position-1' },
    ],
    ...overrides,
  };
}

export function parseView(html: string): HTMLDivElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

export function element<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing element: ${selector}`);
  return result;
}
