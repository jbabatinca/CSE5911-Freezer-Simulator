/** Tests tutorial progression, feedback, resets, and practice freezer rendering. */
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
  vi.useRealTimers();
});

function answerLevel(targetId: string): void {
  for (let question = 0; question < 3; question++) answerTrainingTarget(targetId);
}

describe('TutorialTrainingModeView - level flow', () => {
  it('should start at level 1 with a rack question', () => {
    const html = TutorialTrainingModeView();
    expect(html).toContain('L1 · FIND THE RACK');
    expect(html).toContain('Find Project 1');
    expect(html).toContain('0</strong> / 3 misses at L1');
  });

  it('advances after three correct questions in each level and completes only after nine', () => {
    expect(TutorialTrainingModeView()).toContain('Question 1 of 3');
    answerTrainingTarget('tutorial-rack-1');
    expect(TutorialTrainingModeView()).toContain('L1 · FIND THE RACK');
    expect(TutorialTrainingModeView()).toContain('Question 2 of 3');
    answerTrainingTarget('tutorial-rack-1');
    expect(TutorialTrainingModeView()).toContain('Question 3 of 3');
    answerTrainingTarget('tutorial-rack-1');
    expect(TutorialTrainingModeView()).toContain('L2 · FIND THE BOX');
    expect(TutorialTrainingModeView()).toContain('Question 1 of 3');
    expect(TutorialTrainingModeView()).toContain('Advancing to L2');
    answerTrainingTarget('tutorial-box-1');
    answerTrainingTarget('tutorial-box-1');
    expect(TutorialTrainingModeView()).toContain('L2 · FIND THE BOX');
    expect(TutorialTrainingModeView()).toContain('Question 3 of 3');
    answerTrainingTarget('tutorial-box-1');
    expect(TutorialTrainingModeView()).toContain('L3 · FIND THE SAMPLE');
    expect(TutorialTrainingModeView()).toContain('Question 1 of 3');
    answerTrainingTarget('tutorial-sample-1001');
    answerTrainingTarget('tutorial-sample-1001');
    expect(TutorialTrainingModeView()).toContain('Question 3 of 3');
    expect(TutorialTrainingModeView()).not.toContain('Tutorial complete');
    answerTrainingTarget('tutorial-sample-1001');
    expect(TutorialTrainingModeView()).toContain('Tutorial complete');
    expect(TutorialTrainingModeView()).toContain('Tutorial completed in');
    expect(TutorialTrainingModeView()).toContain('id="btn-tutorial-restart"');
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
    answerLevel('tutorial-rack-1');
    answerTrainingTarget('tutorial-box-1');
    expect(TutorialTrainingModeView()).toContain('Question 2 of 3');
    answerTrainingTarget('tutorial-box-2');
    answerTrainingTarget('tutorial-box-2');
    answerTrainingTarget('tutorial-box-2');
    const html = TutorialTrainingModeView();
    expect(html).toContain('Three incorrect answers. Returning to L1.');
    expect(html).toContain('L1 · FIND THE RACK');
    expect(html).toContain('Question 1 of 3');
    expect(html).toContain('0</strong> / 3 misses at L1');
    answerTrainingTarget('tutorial-rack-1');
    expect(TutorialTrainingModeView()).toContain('L1 · FIND THE RACK');
    expect(TutorialTrainingModeView()).toContain('Question 2 of 3');
  });

  it('keeps elapsed-time feedback and resets misses after a correct answer', () => {
    vi.useFakeTimers();
    startTrainingTutorial();
    answerTrainingTarget('tutorial-rack-2');
    vi.advanceTimersByTime(2500);
    answerTrainingTarget('tutorial-rack-1');
    expect(TutorialTrainingModeView()).toContain('Answered in 2.5 seconds.');
    expect(TutorialTrainingModeView()).toContain('0</strong> / 3 misses at L1');
    vi.advanceTimersByTime(1000);
    answerTrainingTarget('tutorial-rack-1');
    expect(TutorialTrainingModeView()).toContain('Answered in 1.0 seconds.');
  });

  it('should restart from level 1 after the tutorial is complete', () => {
    answerLevel('tutorial-rack-1');
    answerLevel('tutorial-box-1');
    answerLevel('tutorial-sample-1001');
    startTrainingTutorial();
    const html = TutorialTrainingModeView();
    expect(html).not.toContain('Tutorial complete');
    expect(html).toContain('L1 · FIND THE RACK');
    expect(html).toContain('Question 1 of 3');
    expect(html).toContain('0</strong> / 3 misses at L1');
  });
});

describe('TutorialTrainingModeView - what each level shows', () => {
  it('renders the third rack and allows its rack, box, and sample targets to be answered', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    startTrainingTutorial();
    let html = TutorialTrainingModeView();
    expect(html).toContain('Find Project 3');
    expect(html).toContain('data-training-target="tutorial-rack-3"');
    expect(html).toContain('--tutorial-rack-color: #318272');

    answerLevel('tutorial-rack-3');
    toggleTrainingRack('tutorial-rack-3');
    html = TutorialTrainingModeView();
    expect(html).toContain('Find P3B2');
    expect(html).toContain('data-training-target="tutorial-box-5"');
    expect(html).toContain('data-training-target="tutorial-box-6"');
    expect(html).toContain('2 / 16 boxes filled');

    answerLevel('tutorial-box-6');
    toggleTrainingRack('tutorial-rack-3');
    toggleTrainingBox('tutorial-box-6');
    html = TutorialTrainingModeView();
    expect(html).toContain('Find Sample 3006');
    expect(html).toContain('data-training-target="tutorial-sample-3004"');
    expect(html).toContain('data-training-target="tutorial-sample-3005"');
    expect(html).toContain('data-training-target="tutorial-sample-3006"');
    expect(html).toContain('Sample 3006, position I8');
    answerLevel('tutorial-sample-3006');
    expect(TutorialTrainingModeView()).toContain('Tutorial complete');
  });

  it('selects and renders the third rack’s first box and its specimens', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    startTrainingTutorial();
    answerLevel('tutorial-rack-3');
    toggleTrainingRack('tutorial-rack-3');
    expect(TutorialTrainingModeView()).toContain('Find P3B1');
    answerLevel('tutorial-box-5');
    toggleTrainingRack('tutorial-rack-3');
    toggleTrainingBox('tutorial-box-5');
    const html = TutorialTrainingModeView();
    expect(html).toContain('Find Sample 3001');
    expect(html).toContain('data-training-target="tutorial-sample-3001"');
    expect(html).toContain('data-training-target="tutorial-sample-3002"');
    expect(html).toContain('data-training-target="tutorial-sample-3003"');
    answerLevel('tutorial-sample-3001');
    expect(TutorialTrainingModeView()).toContain('Tutorial complete');
  });

  it('renders racks as color-coded cards and boxes in a 4x4 grid with empty slots', () => {
    const rackView = TutorialTrainingModeView();
    expect(rackView).toContain('style="--tutorial-rack-color: #2878b8"');
    expect(rackView).toContain('data-training-target="tutorial-rack-1"');
    expect(rackView).toContain('2 / 16 boxes filled');

    answerLevel('tutorial-rack-1');
    toggleTrainingRack('tutorial-rack-1');
    const html = TutorialTrainingModeView();
    const root = document.createElement('div');
    root.innerHTML = html;
    const grid = root.querySelector('.tutorial-boxes');
    expect(root.querySelector('.physical-freezer-layout')).not.toBeNull();
    expect(grid?.children).toHaveLength(16);
    expect(grid?.querySelectorAll('.question-set-box-slot')).toHaveLength(14);
    expect(html).toContain('data-training-target="tutorial-box-1"');
    expect(html).toContain('style="--tutorial-box-color: #42a889; --tutorial-box-foreground:');
    expect(html).toContain('class="question-set-rack-capacity"');
  });

  it('should show boxes as plain buttons at level 2, without samples', () => {
    answerLevel('tutorial-rack-1');
    toggleTrainingRack('tutorial-rack-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('data-training-target="tutorial-box-1"');
    expect(html).not.toContain('tutorial-sample-grid');
  });

  it('should show the expanded 9x9 sample grid below the box grid at level 3', () => {
    answerLevel('tutorial-rack-1');
    answerLevel('tutorial-box-1');
    toggleTrainingRack('tutorial-rack-1');
    toggleTrainingBox('tutorial-box-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('aria-label="Sample 1001, position A1"');
    expect(html).toContain('data-training-target="tutorial-sample-1001"');
    const root = document.createElement('div');
    root.innerHTML = html;
    const grid = root.querySelector('.tutorial-boxes');
    const details = root.querySelector('.question-set-box-details');
    expect(grid?.children).toHaveLength(16);
    expect(grid?.nextElementSibling).toBe(details);
    expect(details?.querySelector('.tutorial-sample-grid')?.children).toHaveLength(81);
    expect(details?.querySelector('.tutorial-sample-grid')?.getAttribute('style')).toContain('--tutorial-box-foreground');
    // 81 cells total: 3 samples are targets, the other 78 are empty
    expect(html.match(/tutorial-sample-empty/g)?.length).toBe(78);
  });

  it('should collapse a rack when it is toggled twice', () => {
    answerLevel('tutorial-rack-1');
    toggleTrainingRack('tutorial-rack-1');
    toggleTrainingRack('tutorial-rack-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('data-training-toggle-rack="tutorial-rack-1" aria-expanded="false"');
    expect(html).not.toContain('data-training-target="tutorial-box-1"');
  });
});
