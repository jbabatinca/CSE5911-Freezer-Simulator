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
    for (let level = 1; level <= 10; level++) {
      const question = TUTORIAL_QUESTION_BANK[level - 1]![choice]!;
      const parts = question.targetId.split('-');
      const shelfNumber = parts[2]!;
      const rackNumber = parts[3]!;
      const boxNumber = parts[4];
      if (question.type !== 'rack') toggleTrainingRack(`tutorial-rack-${shelfNumber}-${rackNumber}`);
      if (question.type === 'sample') toggleTrainingBox(`tutorial-box-${shelfNumber}-${rackNumber}-${boxNumber}`);
      const root = document.createElement('div');
      root.innerHTML = TutorialTrainingModeView();
      expect(root.textContent).toContain(`LEVEL L${level} ·`);
      const target = root.querySelector(`[data-training-target="${question.targetId}"]`);
      expect(target).not.toBeNull();
      if (question.type === 'sample') {
        const rack = target?.closest('.tutorial-rack');
        const rackName = rack?.querySelector('.tutorial-rack-toggle span:last-child')?.textContent?.replace(/^[▾▸]\s*/, '');
        const boxName = rack?.querySelector(`[data-training-toggle-box="tutorial-box-${shelfNumber}-${rackNumber}-${boxNumber}"]`)?.textContent?.replace(/^[▾▸]\s*/, '');
        expect(root.querySelector('#training-question-panel h2')?.textContent).toBe(`Find Shelf ${shelfNumber} / ${rackName} / ${boxName} / ${target?.textContent}`);
      }
      answerTrainingTarget(question.targetId);
      if (level < 10) expect(TutorialTrainingModeView()).not.toContain('Tutorial complete');
    }
    expect(TutorialTrainingModeView()).toContain('Tutorial complete');
  });

  it('draws a different set of questions on each run', () => {
    expect(TutorialTrainingModeView()).toContain('Find Shelf 1 / INSPIR');
    vi.mocked(Math.random).mockReturnValue(0.99);
    startTrainingTutorial();
    expect(TutorialTrainingModeView()).toContain('Find Shelf 2 / Project 1');
  });
});

describe('TutorialTrainingModeView - specimen positions', () => {
  it('randomizes distinct positions per box while keeping questions and the grid in sync', async () => {
    const renderBox = async (random: number) => {
      vi.resetModules();
      vi.mocked(Math.random).mockReturnValue(random);
      const tutorial = await import('../../src/render/TutorialTrainingModeView.js');
      vi.mocked(Math.random).mockReturnValue(0);
      tutorial.startTrainingTutorial();
      for (let level = 0; level < 5; level++) {
        tutorial.answerTrainingTarget(tutorial.TUTORIAL_QUESTION_BANK[level]![0]!.targetId);
      }
      tutorial.toggleTrainingRack('tutorial-rack-1-1');
      tutorial.toggleTrainingBox('tutorial-box-1-1-1');
      const root = document.createElement('div');
      root.innerHTML = tutorial.TutorialTrainingModeView();
      const positions = Array.from(root.querySelectorAll('.tutorial-sample-target'), target => target.textContent);
      const target = root.querySelector('[data-training-target="tutorial-sample-1-1-1-1"]');
      expect(positions).toHaveLength(3);
      expect(new Set(positions).size).toBe(3);
      expect(root.querySelector('#training-question-panel h2')?.textContent).toBe(`Find Shelf 1 / INSPIR / Box 1 / ${target?.textContent}`);
      tutorial.toggleTrainingBox('tutorial-box-1-1-1');
      tutorial.toggleTrainingBox('tutorial-box-1-1-1');
      const rerendered = document.createElement('div');
      rerendered.innerHTML = tutorial.TutorialTrainingModeView();
      expect(rerendered.querySelector('[data-training-target="tutorial-sample-1-1-1-1"]')?.textContent).toBe(target?.textContent);
      return positions;
    };

    const firstPositions = await renderBox(0);
    const secondPositions = await renderBox(0.99);
    expect(firstPositions).not.toEqual(secondPositions);
  });
});

describe('TutorialTrainingModeView - level flow', () => {
  it('should start at level 1 of 10 with a rack question and ten level tiles', () => {
    const html = TutorialTrainingModeView();
    expect(html).toContain('L1 · FIND THE RACK');
    expect(html).toContain('Find Shelf 1 / INSPIR');
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
    answerTrainingTarget('tutorial-rack-1-2');
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
    answerTrainingTarget('tutorial-box-1-1-1');
    answerTrainingTarget('tutorial-box-1-1-1');
    answerTrainingTarget('tutorial-box-1-1-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('Three incorrect answers. Returning to L1.');
    expect(html).toContain('L1 · FIND THE RACK');
    expect(html).toContain('Question 1 of 10');
    expect(html).toContain('0</strong> / 3 misses at L1');
    expect(html).toContain('Find Shelf 2 / Project 1');
  });

  it('keeps elapsed-time feedback and resets misses after a correct answer', () => {
    vi.useFakeTimers();
    startTrainingTutorial();
    answerTrainingTarget('tutorial-rack-1-2');
    vi.advanceTimersByTime(2500);
    answerTrainingTarget('tutorial-rack-1-1');
    expect(TutorialTrainingModeView()).toContain('Answered in 2.5 seconds.');
    expect(TutorialTrainingModeView()).toContain('0</strong> / 3 misses at L2');
    vi.advanceTimersByTime(1000);
    answerTrainingTarget('tutorial-rack-2-2');
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
    expect(html).toContain('Find Shelf 2 / Project 1');
    expect(html).toContain('0</strong> / 3 misses at L1');
  });
});

describe('TutorialTrainingModeView - what each level shows', () => {
  it('renders four shelves with the expected rack names and box capacities', () => {
    const root = document.createElement('div');
    root.innerHTML = TutorialTrainingModeView();
    const shelves = Array.from(root.querySelectorAll('.tutorial-shelf'));
    expect(shelves).toHaveLength(4);
    const names = [
      ['INSPIR', 'PROMIS'],
      ['Project 1', 'EPIC', 'MOMI'],
      ['MOMI', 'EPIC', 'INSPIR', 'PROMIS'],
      ['PROMIS', 'Project 2', 'INSPIR', 'EPIC', 'Project 3', 'MOMI']
    ];
    shelves.forEach((shelf, index) => {
      const racks = Array.from(shelf.querySelectorAll('.tutorial-rack'));
      expect(racks.map(rack => rack.querySelector('button')?.textContent?.trim())).toEqual(names[index]);
      for (const rack of racks) expect(rack.textContent).toContain(`${2 ** (index + 1)} / 16 boxes filled`);
    });
  });

  it('increases specimen counts across shelves without filling bottom boxes', () => {
    answerLevels(5);
    const sampleCounts: number[] = [];
    for (let shelf = 1; shelf <= 4; shelf++) {
      toggleTrainingRack(`tutorial-rack-${shelf}-1`);
      toggleTrainingBox(`tutorial-box-${shelf}-1-1`);
      const root = document.createElement('div');
      root.innerHTML = TutorialTrainingModeView();
      sampleCounts.push(root.querySelectorAll('.tutorial-sample-target').length);
      expect(root.querySelectorAll('.tutorial-sample-grid > *')).toHaveLength(81);
    }
    expect(sampleCounts).toEqual([3, 10, 20, 36]);
  });

  it('renders racks as color-coded cards and boxes in a 4x4 grid with empty slots', () => {
    const rackView = TutorialTrainingModeView();
    expect(rackView).toContain('style="--tutorial-rack-color: #2878b8"');
    expect(rackView).toContain('data-training-target="tutorial-rack-1-1"');
    expect(rackView).toContain('2 / 16 boxes filled');

    answerLevels(2);
    toggleTrainingRack('tutorial-rack-1-1');
    const html = TutorialTrainingModeView();
    const root = document.createElement('div');
    root.innerHTML = html;
    const grid = root.querySelector('.tutorial-boxes');
    expect(root.querySelector('.physical-freezer-layout')).not.toBeNull();
    expect(grid?.children).toHaveLength(16);
    expect(grid?.querySelectorAll('.question-set-box-slot')).toHaveLength(14);
    expect(Array.from(grid?.querySelectorAll('.tutorial-box-target') ?? [], box => box.textContent)).toEqual(['Box 1', 'Box 2']);
    expect(html).toContain('data-training-target="tutorial-box-1-1-1"');
    expect(html).toContain('style="--tutorial-box-color: #2878b8; --tutorial-box-foreground:');
    expect(html).toContain('class="question-set-rack-capacity"');
  });

  it('should show boxes as plain buttons at the box levels, without samples', () => {
    answerLevels(2);
    toggleTrainingRack('tutorial-rack-1-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('L3 · FIND THE BOX');
    expect(html).toContain('data-training-target="tutorial-box-1-1-1"');
    expect(html).not.toContain('tutorial-sample-grid');
  });

  it('should show the expanded 9x9 sample grid below the box grid at the sample levels', () => {
    answerLevels(5);
    toggleTrainingRack('tutorial-rack-1-1');
    toggleTrainingBox('tutorial-box-1-1-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('L6 · FIND THE SAMPLE');
    expect(html).toContain('data-training-target="tutorial-sample-1-1-1-1"');
    expect(html).not.toContain('Sample 1001');
    const root = document.createElement('div');
    root.innerHTML = html;
    const grid = root.querySelector('.tutorial-boxes');
    const details = root.querySelector('.question-set-box-details');
    const target = details?.querySelector('[data-training-target="tutorial-sample-1-1-1-1"]');
    expect(root.querySelector('#training-question-panel h2')?.textContent).toBe(`Find Shelf 1 / INSPIR / Box 1 / ${target?.textContent}`);
    expect(target?.getAttribute('aria-label')).toBe(`Position ${target?.textContent}`);
    expect(grid?.children).toHaveLength(16);
    expect(grid?.nextElementSibling).toBe(details);
    expect(details?.querySelector('.tutorial-sample-grid')?.children).toHaveLength(81);
    expect(details?.querySelector('.tutorial-sample-grid')?.getAttribute('style')).toContain('--tutorial-box-foreground');
    // 81 cells total: 3 samples are targets, the other 78 are empty
    expect(html.match(/tutorial-sample-empty/g)?.length).toBe(78);
  });

  it('should collapse a rack when it is toggled twice', () => {
    answerLevels(2);
    toggleTrainingRack('tutorial-rack-1-1');
    toggleTrainingRack('tutorial-rack-1-1');
    const html = TutorialTrainingModeView();
    expect(html).toContain('data-training-toggle-rack="tutorial-rack-1-1" aria-expanded="false"');
    expect(html).not.toContain('data-training-target="tutorial-box-1-1-1"');
  });
});
