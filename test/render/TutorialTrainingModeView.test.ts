import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TutorialTrainingModeView,
  startTrainingTutorial,
  answerTrainingTarget,
  toggleTrainingRack,
  toggleTrainingBox
} from '../../src/render/TutorialTrainingModeView.js';

// Math.random() = 0 makes every question pick the first item:
// L1 -> Project 1 (tutorial-rack-1), L2 -> P1B1 (tutorial-box-1),
// L3 -> Sample 1001 (tutorial-sample-1001, position A1)
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  startTrainingTutorial();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TutorialTrainingModeView - level flow', () => {
  it('should start at level 1 with a rack question', () => {
    const html = TutorialTrainingModeView();
    expect(html).toContain('L1 · FIND THE RACK');
    expect(html).toContain('Find Project 1');
    expect(html).toContain('0</strong> / 3 misses at L1');
  });

  it('should advance to level 2 after a correct rack answer', () => {
    answerTrainingTarget('tutorial-rack-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('L2 · FIND THE BOX');
    expect(html).toContain('Find P1B1');
    expect(html).toContain('Advancing to L2');
  });

  it('should mark the wrong rack and the correct rack after an incorrect answer', () => {
    answerTrainingTarget('tutorial-rack-2');
    const html = TutorialTrainingModeView();
    expect(html).toContain('Not quite. 1 of 3 misses at this level.');
    expect(html).toContain('tutorial-rack-target is-incorrect"');
    expect(html).toContain('tutorial-rack-target is-correct"');
    expect(html).toContain('<strong>1</strong> / 3 misses at L1');
  });

  it('should return to level 1 after three misses at a level', () => {
    answerTrainingTarget('tutorial-rack-1'); // now at L2
    answerTrainingTarget('tutorial-box-2');
    answerTrainingTarget('tutorial-box-2');
    answerTrainingTarget('tutorial-box-2');
    const html = TutorialTrainingModeView();
    expect(html).toContain('Three incorrect answers. Returning to L1.');
    expect(html).toContain('L1 · FIND THE RACK');
  });

  it('should complete the tutorial after a correct sample answer at level 3', () => {
    answerTrainingTarget('tutorial-rack-1');
    answerTrainingTarget('tutorial-box-1');
    answerTrainingTarget('tutorial-sample-1001');
    const html = TutorialTrainingModeView();
    expect(html).toContain('Tutorial complete');
    expect(html).toContain('Tutorial completed in');
    expect(html).toContain('id="btn-tutorial-restart"');
  });

  it('should restart from level 1 after the tutorial is complete', () => {
    answerTrainingTarget('tutorial-rack-1');
    answerTrainingTarget('tutorial-box-1');
    answerTrainingTarget('tutorial-sample-1001');
    startTrainingTutorial();
    const html = TutorialTrainingModeView();
    expect(html).not.toContain('Tutorial complete');
    expect(html).toContain('L1 · FIND THE RACK');
  });
});

describe('TutorialTrainingModeView - what each level shows', () => {
  it('should show boxes as plain buttons at level 2, without samples', () => {
    answerTrainingTarget('tutorial-rack-1'); // now at L2
    toggleTrainingRack('tutorial-rack-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('data-training-target="tutorial-box-1"');
    expect(html).not.toContain('tutorial-sample-grid');
  });

  it('should show a 9x9 sample grid when a box is expanded at level 3', () => {
    answerTrainingTarget('tutorial-rack-1');
    answerTrainingTarget('tutorial-box-1'); // now at L3
    toggleTrainingRack('tutorial-rack-1');
    toggleTrainingBox('tutorial-box-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('aria-label="Sample 1001, position A1"');
    // 81 cells total: 3 samples are targets, the other 78 are empty
    expect(html.match(/tutorial-sample-empty/g)?.length).toBe(78);
  });

  it('should collapse a rack when it is toggled twice', () => {
    answerTrainingTarget('tutorial-rack-1'); // now at L2
    toggleTrainingRack('tutorial-rack-1');
    toggleTrainingRack('tutorial-rack-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('data-training-toggle-rack="tutorial-rack-1" aria-expanded="false"');
    expect(html).not.toContain('data-training-target="tutorial-box-1"');
  });
});
