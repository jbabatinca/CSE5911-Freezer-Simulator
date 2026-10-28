import { beforeEach, describe, expect, it } from 'vitest';
import type { Mode } from '../../src/state/modeState.js';
import { getCurrentMode, getPreviousMode, goBack, initializeMode, setMode } from '../../src/state/modeState.js';
import { Navigation } from '../../src/render/Navigation.js';
import { parseView } from '../helpers/questionSets.js';

describe('Question set mode navigation', () => {
  beforeEach(() => initializeMode('user-home'));

  it('accepts question-set-user as a Mode and returns to user home', () => {
    const mode: Mode = 'question-set-user';
    setMode(mode);
    expect(getCurrentMode()).toBe(mode);
    expect(getPreviousMode()).toBe('user-home');
    expect(parseView(Navigation(mode)).querySelector('#btn-back')).not.toBeNull();
    goBack();
    expect(getCurrentMode()).toBe('user-home');
    expect(getPreviousMode()).toBe(mode);
  });
});
