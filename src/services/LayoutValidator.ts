import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../models/freezer-layout.schema.json';
import type { FreezerLayout } from '../models/freezerLayout.js';

const ajv = new Ajv2020({ allErrors: true });
const validateLayout = ajv.compile<FreezerLayout>(schema);

export function validateFreezerLayout(
  data: unknown
): { ok: true; layout: FreezerLayout } | { ok: false; errors: string[] } {
  if (validateLayout(data)) return { ok: true, layout: data };
  return {
    ok: false,
    errors: (validateLayout.errors ?? []).map(
      (e) => `${e.instancePath || '(root)'} ${e.message}`
    ),
  };
}
