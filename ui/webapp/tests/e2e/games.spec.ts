import { expect, Page, test } from '@playwright/test';

import { gotoExplore, gotoGames } from './utils/navigation';
import quizData from './data/quiz.json' assert { type: 'json' };

type QuizFixture = {
  title: string;
  options: {
    item: string;
    correct: boolean;
  }[];
};

const quizFixtures = quizData as QuizFixture[];
const totalQuestions = quizFixtures.length;

const startQuiz = async (page: Page) => {
  const startGameButton = page.getByRole('button', { name: 'Start game' });
  await expect(startGameButton).toBeVisible();
  await startGameButton.click();
  await expect(page.getByLabel(`question 1 of ${totalQuestions}`)).toBeVisible();
};

const getActiveQuestion = async (page: Page) => {
  const title = (await page.getByTestId('quiz-question-title').innerText()).trim();
  const question = quizFixtures.find((fixture) => fixture.title === title);
  expect(question, `Unknown quiz question "${title}"`).toBeDefined();
  return question!;
};

const answerCurrentQuestion = async (page: Page, shouldAnswerCorrect: boolean) => {
  const question = await getActiveQuestion(page);
  const option = shouldAnswerCorrect
    ? question.options.find((candidate) => candidate.correct)
    : question.options.find((candidate) => !candidate.correct);
  expect(option, 'Missing quiz option for desired correctness').toBeDefined();
  await page.getByRole('button', { name: option!.item }).click();
};

const goToNextQuestion = async (page: Page, nextIndex: number) => {
  const nextButton = page.getByRole('button', { name: 'Next' });
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
  await expect(page.getByLabel(`question ${nextIndex} of ${totalQuestions}`)).toBeVisible();
};

const expectScore = async (page: Page, correct: number, wrong: number) => {
  await expect(page.locator(`[aria-label="${correct} correct guesses"]`)).toBeVisible();
  await expect(page.locator(`[aria-label="${wrong} wrong guesses"]`)).toBeVisible();
};

test.describe('Games page', () => {
  test('loads games content when navigating from the header', async ({ page }) => {
    await gotoExplore(page);
    await Promise.all([
      page.waitForURL(/\/games/),
      page.getByRole('button', { name: 'Go to "Games" page' }).click(),
    ]);
    await expect(page).toHaveURL(/\/games/);

    // Games landing state
    const startGameButton = page.getByRole('button', { name: 'Start game' });
    await expect(startGameButton).toBeVisible();
    await expect(page.getByText('Landscape Quiz').nth(1)).toBeVisible();

    // Starts the quiz
    await startGameButton.click();

    // Quiz question and options
    await expect(page.getByLabel('question 1 of 2')).toBeVisible();
    await expect(
      page.getByText(/Which of the following items have feature X\?|Please select the item with feature Y/)
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Item 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Item 2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Item 3' })).toBeVisible();
  });

  test('loads games page', async ({ page }) => {
    await gotoGames(page);

    // Games landing state
    const startGameButton = page.getByRole('button', { name: 'Start game' });
    await expect(startGameButton).toBeVisible();

    // Starts the quiz
    await startGameButton.click();

    // Quiz question and options
    await expect(page.getByLabel('question 1 of 2')).toBeVisible();
    await expect(
      page.getByText(/Which of the following items have feature X\?|Please select the item with feature Y/)
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Item 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Item 2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Item 3' })).toBeVisible();
  });

  test('updates score as questions are answered', async ({ page }) => {
    await gotoGames(page);
    await startQuiz(page);

    await answerCurrentQuestion(page, true);
    await expectScore(page, 1, 0);
    await goToNextQuestion(page, 2);

    await answerCurrentQuestion(page, false);
    await expectScore(page, 1, 1);
    await expect(page.getByRole('button', { name: 'Play again' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Next' })).toHaveCount(0);
  });

  test('restarts quiz state after finishing a game', async ({ page }) => {
    await gotoGames(page);
    await startQuiz(page);

    for (let index = 1; index <= totalQuestions; index += 1) {
      await answerCurrentQuestion(page, true);
      await expectScore(page, index, 0);
      if (index < totalQuestions) {
        await goToNextQuestion(page, index + 1);
      }
    }

    const playAgainButton = page.getByRole('button', { name: 'Play again' });
    await expect(playAgainButton).toBeEnabled();
    await playAgainButton.click();

    await expectScore(page, 0, 0);
    await expect(page.getByLabel(`question 1 of ${totalQuestions}`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
