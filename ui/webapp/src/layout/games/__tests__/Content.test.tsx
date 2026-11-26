import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { flushPromises, tabTo } from 'common/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Question, State } from '../../../../wasm/quiz/landscape2_quiz';
import { createBaseData } from '../../../test-utils/fixtures';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import Content from '../Content';

const LANDSCAPE_URL = 'https://landscape.example.org';
const QUESTION = {
  options: [
    { category: 'Category', correct: true, item: 'Item A', subcategory: 'Subcategory' },
    { category: 'Category', correct: false, item: 'Item B', subcategory: 'Subcategory' },
  ],
  title: 'Which item is graduated?',
} as unknown as Question;
const QUESTIONS_JSON = '[{"title":"Overlay question","options":[]}]';

const { mockGetQuizQuestionsJson, mockInit, mockIsActiveOverlay, mockIsWasmSupported, mockQuizNew, mockQuizOptions } =
  vi.hoisted(() => ({
    mockGetQuizQuestionsJson: vi.fn<() => string | undefined>(),
    mockInit: vi.fn<() => Promise<void>>(),
    mockIsActiveOverlay: vi.fn<() => boolean>(),
    mockIsWasmSupported: vi.fn<() => boolean>(),
    mockQuizNew: vi.fn(),
    mockQuizOptions: vi.fn(),
  }));

vi.mock('../../../../wasm/quiz/landscape2_quiz', () => ({
  default: mockInit,
  Quiz: { new: mockQuizNew },
  // A class, so the component can construct the options with `new`
  QuizOptions: class {
    constructor(landscapeUrl: string, questionsJson?: string) {
      mockQuizOptions(landscapeUrl, questionsJson);
    }
  },
}));
vi.mock('../../../utils/getLandscapeUrl', () => ({ default: () => LANDSCAPE_URL }));
vi.mock('../../../utils/isWasmSupported', () => ({ default: mockIsWasmSupported }));
vi.mock('../../../utils/overlayData', () => ({
  default: { getQuizQuestionsJson: mockGetQuizQuestionsJson, isActiveOverlay: mockIsActiveOverlay },
}));

describe('Content', () => {
  const onUnhandledRejection = vi.fn();

  beforeEach(() => {
    window.baseDS = createBaseData({ games_available: ['quiz'] });
    mockGetQuizQuestionsJson.mockReturnValue(QUESTIONS_JSON);
    mockInit.mockResolvedValue(undefined);
    mockIsActiveOverlay.mockReturnValue(false);
    mockIsWasmSupported.mockReturnValue(true);
    mockQuizNew.mockResolvedValue({ questions_count: () => 0, state: vi.fn() });
    process.on('unhandledRejection', onUnhandledRejection);
  });

  afterEach(() => {
    process.off('unhandledRejection', onUnhandledRejection);
  });

  it('passes overlay quiz questions to QuizOptions when the overlay is active', async () => {
    mockIsActiveOverlay.mockReturnValue(true);

    // Render the game until the quiz is ready to start
    render(() => <Content />);
    expect(await screen.findByRole('button', { name: 'Start game' })).toBeInTheDocument();

    // Verify the quiz was created with the overlay questions
    expect(mockQuizOptions).toHaveBeenCalledExactlyOnceWith(LANDSCAPE_URL, QUESTIONS_JSON);
    expect(mockQuizNew).toHaveBeenCalledOnce();
  });

  it('passes no questions when the overlay is inactive', async () => {
    // Render the game until the quiz is ready to start
    render(() => <Content />);
    expect(await screen.findByRole('button', { name: 'Start game' })).toBeInTheDocument();

    // Verify the quiz fetches the deployed questions instead
    expect(mockQuizOptions).toHaveBeenCalledExactlyOnceWith(LANDSCAPE_URL, undefined);
    expect(mockGetQuizQuestionsJson).not.toHaveBeenCalled();
  });

  it('renders question counter and options from current_question', async () => {
    // Mock a two-question quiz whose current question reads are tracked
    vi.spyOn(itemsDataGetter, 'getLogoItem').mockReturnValue('logos/item.svg');
    const mockCurrentQuestion = vi.fn(() => QUESTION);
    mockQuizNew.mockResolvedValue({
      check_player_guess: vi.fn(() => createState({ answered: true, correct: 1, index: 0 })),
      current_question: mockCurrentQuestion,
      next_question: vi.fn(() => createState({ answered: false, correct: 1, index: 1 })),
      questions_count: () => 2,
      state: () => createState({ answered: false, correct: 0, index: 0 }),
    });
    const user = userEvent.setup();

    // Start the game once the quiz is ready
    render(() => <Content />);
    await user.click(await screen.findByRole('button', { name: 'Start game' }));

    // Verify the counter and options come from a single current_question read
    expect(screen.getByLabelText('question 1 of 2')).toHaveTextContent('1 / 2');
    expect(screen.getByText('Which item is graduated?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item B' })).toBeInTheDocument();
    expect(mockCurrentQuestion).toHaveBeenCalledOnce();

    // Answer the question and verify the score and a single extra read
    await user.click(screen.getByRole('button', { name: 'Item A' }));
    expect(screen.getByLabelText('1 correct guesses')).toHaveTextContent('1');
    expect(mockCurrentQuestion).toHaveBeenCalledTimes(2);

    // Move to the next question and verify the counter and a single extra read
    await user.click(screen.getByRole('button', { name: 'Next question' }));
    expect(screen.getByLabelText('question 2 of 2')).toHaveTextContent('2 / 2');
    expect(mockCurrentQuestion).toHaveBeenCalledTimes(3);
  });

  it('answers a question with the keyboard and announces only the result', async () => {
    // Mock a quiz whose guess is wrong
    vi.spyOn(itemsDataGetter, 'getLogoItem').mockReturnValue('logos/item.svg');
    mockQuizNew.mockResolvedValue({
      check_player_guess: vi.fn(() => createState({ answered: true, correct: 0, index: 0, wrong: 1 })),
      current_question: () => QUESTION,
      questions_count: () => 2,
      state: () => createState({ answered: false, correct: 0, index: 0 }),
    });
    const user = userEvent.setup();
    render(() => <Content />);
    await user.click(await screen.findByRole('button', { name: 'Start game' }));
    const liveRegion = document.querySelector('[aria-live]');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent('');

    // Tab to the second option and answer with Enter
    const option = screen.getByRole('button', { name: 'Item B', pressed: false });
    await tabTo(user, option);
    await user.keyboard('{Enter}');

    // Check the options state, the focus and the announcement
    expect(option).toHaveAttribute('aria-pressed', 'true');
    expect(option).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Item A', pressed: false })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus();
    expect(liveRegion).toHaveTextContent('Wrong answer. The correct answer is Item A. Score: 0 correct, 1 wrong.');
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(1);
  });

  it('shows the not available message and no spinner when the landscape has no games', async () => {
    window.baseDS = createBaseData();

    render(() => <Content />);
    await flushPromises();

    expect(screen.getByRole('alert')).toHaveTextContent('Games are not available for this landscape');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('shows an error without an unhandled rejection when WebAssembly is not supported', async () => {
    mockIsWasmSupported.mockReturnValue(false);

    // Render the game and let every pending promise settle
    render(() => <Content />);
    await flushPromises();
    await flushPromises();

    // Verify the error replaces the spinner and nothing was rejected unhandled
    expect(screen.getByRole('alert')).toHaveTextContent(
      "This game requires WebAssembly, but your browser doesn't seem to support it"
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(onUnhandledRejection).not.toHaveBeenCalled();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('shows an error instead of the spinner when the quiz bindings fail to load', async () => {
    mockInit.mockRejectedValue(new Error('wasm fetch failed'));

    render(() => <Content />);

    expect(await screen.findByRole('alert')).toHaveTextContent("The game couldn't be loaded");
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(mockQuizNew).not.toHaveBeenCalled();
  });

  it('shows an error when the quiz cannot be created', async () => {
    mockQuizNew.mockRejectedValue('Error fetching quiz questions');

    render(() => <Content />);

    expect(await screen.findByRole('alert')).toHaveTextContent("The quiz questions couldn't be loaded");
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start game' })).not.toBeInTheDocument();
  });

  it('shows an error when the quiz of a new game cannot be created', async () => {
    // Mock a quiz that loads once and then fails
    vi.spyOn(itemsDataGetter, 'getLogoItem').mockReturnValue('logos/item.svg');
    mockQuizNew
      .mockResolvedValueOnce({
        current_question: () => QUESTION,
        questions_count: () => 2,
        state: () => createState({ answered: false, correct: 0, index: 0 }),
      })
      .mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();

    // Start a game, then ask for a new one
    render(() => <Content />);
    await user.click(await screen.findByRole('button', { name: 'Start game' }));
    await user.click(screen.getAllByRole('button', { name: 'Start new game' })[0]);

    // Verify the failure of the second quiz is shown
    expect(await screen.findByRole('alert')).toHaveTextContent("The quiz questions couldn't be loaded");
    expect(screen.queryByRole('button', { name: 'Item A' })).not.toBeInTheDocument();
    expect(onUnhandledRejection).not.toHaveBeenCalled();
  });

  it('labels the score with the correct and the wrong guesses', async () => {
    vi.spyOn(itemsDataGetter, 'getLogoItem').mockReturnValue('logos/item.svg');
    mockQuizNew.mockResolvedValue({
      current_question: () => QUESTION,
      questions_count: () => 2,
      state: () => createState({ answered: false, correct: 3, index: 0, wrong: 1 }),
    });
    const user = userEvent.setup();

    render(() => <Content />);
    await user.click(await screen.findByRole('button', { name: 'Start game' }));

    expect(screen.getByLabelText('3 correct guesses')).toHaveTextContent('3');
    expect(screen.getByLabelText('1 wrong guesses')).toHaveTextContent('1');
  });
});

// Helpers.

/** Options for `createState`. */
interface CreateStateOptions {
  /** Whether the current question has been answered. */
  answered: boolean;
  /** Number of correct guesses. */
  correct: number;
  /** Index of the current question. */
  index: number;
  /** Number of wrong guesses, `0` by default. */
  wrong?: number;
}

/** Creates a quiz state for a two questions quiz. */
const createState = (options: CreateStateOptions): State =>
  ({
    current_question: { answered: options.answered, index: options.index, is_last: options.index === 1 },
    game_over: false,
    score: { correct: options.correct, wrong: options.wrong ?? 0 },
  }) as unknown as State;
