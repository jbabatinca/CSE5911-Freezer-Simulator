/** Tests the ten-level tutorial: bank selection, one drawn question per level, feedback, resets, and practice freezer rendering. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TutorialTrainingModeView,
  startTrainingTutorial,
  answerTrainingTarget,
  toggleTrainingRack,
  toggleTrainingBox,
  TUTORIAL_LEVEL_COUNT,
  TUTORIAL_QUESTION_BANK
} from '../../src/render/TutorialTrainingModeView.js';

// Math.random() = 0 makes every level pick its first stored question:
// L1 Project 1, L2 Project 2, L3 P1B1, L4 P1B2, L5 P2B1, L6 Sample 1001 (A1), L7 Sample 1004, ...
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  startTrainingTutorial();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Answers the first `count` levels correctly using the stored question at `choice` (the index the random mock selects).
function answerLevels(count: number, choice = 0): void {
  for (let level = 0; level < count; level++) answerTrainingTarget(TUTORIAL_QUESTION_BANK[level]![choice]!.targetId);
}

describe('TutorialTrainingModeView - question bank', () => {
  it('stores three questions for each of the ten levels', () => {
    expect(TUTORIAL_LEVEL_COUNT).toBe(10);
    expect(TUTORIAL_QUESTION_BANK).toHaveLength(10);
    for (const candidates of TUTORIAL_QUESTION_BANK) expect(candidates).toHaveLength(3);
    expect(TUTORIAL_QUESTION_BANK.flat()).toHaveLength(30);
  });

  it.each([0, 0.5, 0.99])('draws one stored question per level when the random value is %s', random => {
    vi.mocked(Math.random).mockReturnValue(random);
    startTrainingTutorial();
    const choice = Math.floor(random * 3);
    for (let level = 1; level <= 9; level++) {
      expect(TutorialTrainingModeView()).toContain(`LEVEL L${level} ·`);
      answerTrainingTarget(TUTORIAL_QUESTION_BANK[level - 1]![choice]!.targetId);
      expect(TutorialTrainingModeView()).not.toContain('Tutorial complete');
    }
    answerTrainingTarget(TUTORIAL_QUESTION_BANK[9]![choice]!.targetId);
    expect(TutorialTrainingModeView()).toContain('Tutorial complete');
  });

  it('draws a different set of questions on each run', () => {
    expect(TutorialTrainingModeView()).toContain('Find Project 1');
    vi.mocked(Math.random).mockReturnValue(0.99);
    startTrainingTutorial();
    expect(TutorialTrainingModeView()).toContain('Find Project 3');
  });
});

describe('TutorialTrainingModeView - level flow', () => {
  it('should start at level 1 of 10 with a rack question and ten level tiles', () => {
    const html = TutorialTrainingModeView();
    expect(html).toContain('L1 · FIND THE RACK');
    expect(html).toContain('Find Project 1');
    expect(html).toContain('Question 1 of 10');
    expect(html).toContain('0</strong> / 3 misses at L1');
    const root = document.createElement('div');
    root.innerHTML = html;
    const tiles = Array.from(root.querySelectorAll('.tutorial-level strong')).map(tile => tile.textContent);
    expect(tiles).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10']);
  });

  it('advances one level per correct answer and completes only after the tenth', () => {
    for (let level = 1; level <= 9; level++) {
      answerTrainingTarget(TUTORIAL_QUESTION_BANK[level - 1]![0]!.targetId);
      const html = TutorialTrainingModeView();
      expect(html).toContain(`Advancing to L${level + 1}`);
      expect(html).toContain(`Question ${level + 1} of 10`);
      expect(html).not.toContain('Tutorial complete');
    }
    answerTrainingTarget(TUTORIAL_QUESTION_BANK[9]![0]!.targetId);
    const html = TutorialTrainingModeView();
    expect(html).toContain('Tutorial complete');
    expect(html).toContain('Tutorial completed in');
    expect(html).toContain('id="btn-tutorial-restart"');
  });

  it('marks completed and current level tiles', () => {
    answerLevels(3);
    const root = document.createElement('div');
    root.innerHTML = TutorialTrainingModeView();
    expect(root.querySelectorAll('.tutorial-level.is-complete')).toHaveLength(3);
    expect(root.querySelector('.tutorial-level.is-current strong')?.textContent).toBe('L4');
  });

  it('should mark the wrong rack and the correct rack after an incorrect answer', () => {
    answerTrainingTarget('tutorial-rack-2');
    const html = TutorialTrainingModeView();
    expect(html).toContain('Not quite. 1 of 3 misses at this level.');
    expect(html).toContain('tutorial-rack-target is-incorrect"');
    expect(html).toContain('tutorial-rack-target is-correct"');
    expect(html).toContain('<strong>1</strong> / 3 misses at L1');
  });

  it('should return to level 1 with newly drawn questions after three misses at a level', () => {
    answerLevels(4);
    expect(TutorialTrainingModeView()).toContain('Question 5 of 10');
    vi.mocked(Math.random).mockReturnValue(0.99);
    answerTrainingTarget('tutorial-box-1');
    answerTrainingTarget('tutorial-box-1');
    answerTrainingTarget('tutorial-box-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('Three incorrect answers. Returning to L1.');
    expect(html).toContain('L1 · FIND THE RACK');
    expect(html).toContain('Question 1 of 10');
    expect(html).toContain('0</strong> / 3 misses at L1');
    expect(html).toContain('Find Project 3');
  });

  it('keeps elapsed-time feedback and resets misses after a correct answer', () => {
    vi.useFakeTimers();
    startTrainingTutorial();
    answerTrainingTarget('tutorial-rack-3');
    vi.advanceTimersByTime(2500);
    answerTrainingTarget('tutorial-rack-1');
    expect(TutorialTrainingModeView()).toContain('Answered in 2.5 seconds.');
    expect(TutorialTrainingModeView()).toContain('0</strong> / 3 misses at L2');
    vi.advanceTimersByTime(1000);
    answerTrainingTarget('tutorial-rack-2');
    expect(TutorialTrainingModeView()).toContain('Answered in 1.0 seconds.');
  });

  it('should restart from level 1 with fresh questions after the tutorial is complete', () => {
    answerLevels(10);
    expect(TutorialTrainingModeView()).toContain('Tutorial complete');
    vi.mocked(Math.random).mockReturnValue(0.99);
    startTrainingTutorial();
    const html = TutorialTrainingModeView();
    expect(html).not.toContain('Tutorial complete');
    expect(html).toContain('L1 · FIND THE RACK');
    expect(html).toContain('Question 1 of 10');
    expect(html).toContain('Find Project 3');
    expect(html).toContain('0</strong> / 3 misses at L1');
  });
});

describe('TutorialTrainingModeView - what each level shows', () => {
  it('renders the third rack and allows its rack, box, and sample targets to be answered', () => {
    vi.mocked(Math.random).mockReturnValue(0.99);
    startTrainingTutorial();
    let html = TutorialTrainingModeView();
    expect(html).toContain('Find Project 3');
    expect(html).toContain('data-training-target="tutorial-rack-3"');
    expect(html).toContain('--tutorial-rack-color: #318272');

    answerLevels(2, 2);
    toggleTrainingRack('tutorial-rack-3');
    html = TutorialTrainingModeView();
    expect(html).toContain('Find P3B1');
    expect(html).toContain('data-training-target="tutorial-box-5"');
    expect(html).toContain('data-training-target="tutorial-box-6"');
    expect(html).toContain('2 / 16 boxes filled');

    answerTrainingTarget('tutorial-box-5');
    expect(TutorialTrainingModeView()).toContain('Find P3B2');
  });

  it('renders every sample of the third rack at the sample levels', () => {
    vi.mocked(Math.random).mockReturnValue(0.99);
    startTrainingTutorial();
    answerLevels(5, 2);
    toggleTrainingRack('tutorial-rack-3');
    toggleTrainingBox('tutorial-box-5');
    const html = TutorialTrainingModeView();
    expect(html).toContain('Find Sample 3003');
    expect(html).toContain('data-training-target="tutorial-sample-3001"');
    expect(html).toContain('data-training-target="tutorial-sample-3002"');
    expect(html).toContain('data-training-target="tutorial-sample-3003"');
    answerTrainingTarget('tutorial-sample-3003');
    expect(TutorialTrainingModeView()).toContain('Advancing to L7');
  });

  it('renders racks as color-coded cards and boxes in a 4x4 grid with empty slots', () => {
    const rackView = TutorialTrainingModeView();
    expect(rackView).toContain('style="--tutorial-rack-color: #2878b8"');
    expect(rackView).toContain('data-training-target="tutorial-rack-1"');
    expect(rackView).toContain('2 / 16 boxes filled');

    answerLevels(2);
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

  it('should show boxes as plain buttons at the box levels, without samples', () => {
    answerLevels(2);
    toggleTrainingRack('tutorial-rack-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('L3 · FIND THE BOX');
    expect(html).toContain('data-training-target="tutorial-box-1"');
    expect(html).not.toContain('tutorial-sample-grid');
  });

  it('should show the expanded 9x9 sample grid below the box grid at the sample levels', () => {
    answerLevels(5);
    toggleTrainingRack('tutorial-rack-1');
    toggleTrainingBox('tutorial-box-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('L6 · FIND THE SAMPLE');
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
    answerLevels(2);
    toggleTrainingRack('tutorial-rack-1');
    toggleTrainingRack('tutorial-rack-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('data-training-toggle-rack="tutorial-rack-1" aria-expanded="false"');
    expect(html).not.toContain('data-training-target="tutorial-box-1"');
  });
});
