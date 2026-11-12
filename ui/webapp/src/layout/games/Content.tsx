import { Image, Loading, NoData, SVGIcon, SVGIconKind } from 'common';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { batch, createMemo, createSignal, For, onMount, Show } from 'solid-js';

import init, { Quiz, QuizOptions, State } from '../../../wasm/quiz/landscape2_quiz';
import pattern from '../../media/pattern_quiz.png';
import getDevOrigin from '../../utils/getDevOrigin';
import getLandscapeUrl from '../../utils/getLandscapeUrl';
import isWasmSupported from '../../utils/isWasmSupported';
import itemsDataGetter from '../../utils/itemsDataGetter';
import overlayData from '../../utils/overlayData';
import styles from './Content.module.css';
import Title from './Title';

/** Message shown when the quiz bindings fail to load. */
const LOAD_ERROR_MESSAGE = "The game couldn't be loaded";

/** Message shown when the quiz can't be created (its questions failed to load or there are none). */
const QUIZ_ERROR_MESSAGE = "The quiz questions couldn't be loaded";

/** Message shown when the landscape has no games. */
const UNAVAILABLE_MESSAGE = 'Games are not available for this landscape';

/** Message shown when the browser can't run the quiz bindings. */
const WASM_ERROR_MESSAGE = "This game requires WebAssembly, but your browser doesn't seem to support it";

/** Loading status of the game. */
type GameStatus = 'error' | 'loading' | 'ready' | 'unavailable';

const Content = () => {
  const [status, setStatus] = createSignal<GameStatus>(
    isUndefined(window.baseDS.games_available) ? 'unavailable' : 'loading'
  );
  const [activeQuiz, setActiveQuiz] = createSignal<Quiz | null>(null);
  const [quizState, setQuizState] = createSignal<State | undefined>();
  const [questionsCount, setQuestionsCount] = createSignal<number>(0);
  const [selectedAnswer, setSelectedAnswer] = createSignal<number | null>(null);
  const [error, setError] = createSignal<string>();
  const currentQuestion = createMemo(() =>
    quizState() && activeQuiz() ? activeQuiz()!.current_question() : undefined
  );
  const questionState = createMemo(() => quizState()?.current_question);
  const score = createMemo(() => quizState()?.score);
  const message = () => (status() === 'unavailable' ? UNAVAILABLE_MESSAGE : error());
  const [nextButtonRef, setNextButtonRef] = createSignal<HTMLButtonElement>();
  const [playAgainButtonRef, setPlayAgainButtonRef] = createSignal<HTMLButtonElement>();

  // Result of the answered question and score, the only game changes announced
  const announcement = createMemo(() => {
    const currentScore = score();
    const answer = selectedAnswer();
    if (!questionState()?.answered || isUndefined(currentScore) || isNull(answer)) return '';
    const options = currentQuestion()?.options ?? [];
    const result = options[answer]?.correct
      ? 'Correct answer.'
      : `Wrong answer. The correct answer is ${options.find((option) => option.correct)?.item ?? 'unknown'}.`;
    return `${result} Score: ${currentScore.correct} correct, ${currentScore.wrong} wrong.`;
  });

  const answerQuestion = (index: number) => {
    batch(() => {
      setSelectedAnswer(index);
      setQuizState(activeQuiz()!.check_player_guess(index));
    });
    // The answered options are disabled, so the focus moves on to the next step
    (nextButtonRef() ?? playAgainButtonRef())?.focus();
  };

  const showError = (errorMessage: string) => {
    batch(() => {
      setError(errorMessage);
      setStatus('error');
    });
  };

  const startGame = async (initiated?: boolean) => {
    const options = new QuizOptions(
      getDevOrigin(getLandscapeUrl()),
      overlayData.isActiveOverlay() ? overlayData.getQuizQuestionsJson() : undefined
    );
    try {
      const quiz = await Quiz.new(options);
      batch(() => {
        setQuestionsCount(quiz.questions_count());
        setActiveQuiz(quiz);
        if (initiated) setQuizState(quiz.state());
        setStatus('ready');
      });
    } catch {
      showError(QUIZ_ERROR_MESSAGE);
    }
  };

  const startNewGame = async () => {
    // The board stays hidden behind the spinner until the new quiz is ready
    batch(() => {
      setQuizState(undefined);
      setSelectedAnswer(null);
      setActiveQuiz(null);
      setStatus('loading');
    });
    await startGame(true);
  };

  const loadGames = async () => {
    if (!isWasmSupported()) {
      showError(WASM_ERROR_MESSAGE);
      return;
    }
    try {
      await init();
    } catch {
      showError(LOAD_ERROR_MESSAGE);
      return;
    }
    await startGame();
  };

  onMount(() => {
    if (status() === 'loading') {
      void loadGames();
    }
  });

  return (
    <div class={`d-flex flex-column h-100 ${styles.wrapper}`}>
      <div class="visually-hidden" aria-live="polite">
        {announcement()}
      </div>
      <div
        style={{ 'background-image': `url(${pattern})` }}
        class={`d-flex flex-column border flex-grow-1 mt-3 ${styles.game}`}
      >
        <div class={`d-block d-xl-none text-center ${styles.header}`}>
          <div class="fw-semibold text-light text-uppercase">Landscape Quiz</div>
        </div>
        <div class={`row mt-2 mt-lg-0 mb-0 mb-xl-5 ${styles.header}`}>
          <div class="col">
            <Show when={!isUndefined(quizState())}>
              <div class="d-flex flex-row justify-content-between justify-content-xl-start text-light">
                <div class="fw-semibold" aria-label={`question ${questionState()!.index + 1} of ${questionsCount()}`}>
                  {questionState()!.index + 1} / {questionsCount()}
                </div>
                <div class="d-flex flex-row align-items-center ms-4 ms-xl-5">
                  <div class={`border border-2 border-light ${styles.dot} ${styles.dotCorrect}`} />
                  <div class="ms-2 fw-semibold" aria-label={`${score()!.correct} correct guesses`}>
                    {score()!.correct}
                  </div>

                  <div class={`ms-3 ms-xl-4 border border-2 border-light ${styles.dot} ${styles.dotWrong}`} />
                  <div class="ms-2 fw-semibold" aria-label={`${score()!.wrong} wrong guesses`}>
                    {score()!.wrong}
                  </div>
                </div>
              </div>
            </Show>
          </div>
          <div class="col d-none d-xl-block text-center">
            <div class="fw-semibold text-light text-uppercase">Landscape Quiz</div>
          </div>
          <div class="d-none d-xl-block col text-end">
            <Show when={!isUndefined(quizState())}>
              <button
                type="button"
                class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
                onClick={startNewGame}
                aria-label="Start new game"
              >
                New game
              </button>
            </Show>
          </div>
        </div>
        <Show when={status() === 'loading'}>
          <Loading />
        </Show>
        <Show when={status() === 'error' || status() === 'unavailable'}>
          <div class="flex-grow-1 d-flex flex-column align-items-center justify-content-center h-100 w-100">
            <NoData class="bg-light fs-5">{message()}</NoData>
          </div>
        </Show>
        <Show when={status() === 'ready' && !isNull(activeQuiz()) && isUndefined(quizState())}>
          <div class="flex-grow-1 d-flex flex-column align-items-center justify-content-center h-100 w-100">
            {/* Init Quiz state */}
            <button
              type="button"
              class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
              onClick={() => setQuizState(activeQuiz()!.state())}
              aria-label="Start game"
            >
              New game
            </button>
          </div>
        </Show>
        <Show when={!isUndefined(quizState())}>
          <div class="d-flex flex-column h-100">
            <div class={`flex-grow-1 d-flex flex-column mx-auto py-4 ${styles.quizContent}`}>
              <div
                class={`d-flex align-items-center justify-content-center border border-4 border-dark text-center mb-3 mb-xl-5 bg-white ${styles.title}`}
              >
                <Title content={currentQuestion()!.title} />
              </div>

              <div class="d-flex flex-column flex-lg-row flex-wrap justify-content-center mt-0 mt-lg-3">
                <For each={currentQuestion()?.options}>
                  {(option, index) => {
                    const logo = itemsDataGetter.getLogoItem(option.item, option.category, option.subcategory);

                    if (isNull(logo)) return null;

                    const isCorrect = () => questionState()!.answered && option.correct;
                    const isWrong = () => questionState()!.answered && !option.correct && selectedAnswer() === index();

                    return (
                      <button
                        type="button"
                        class={`d-flex flex-row flex-lg-column border border-4 border-dark bg-white mx-auto mx-lg-4 my-2 my-md-3 p-0 ${styles.option}`}
                        classList={{
                          [styles.answered]: questionState()!.answered,
                          [styles.selected]: selectedAnswer() === index(),
                          [styles.correct]: isCorrect(),
                          [styles.wrong]: isWrong(),
                        }}
                        aria-pressed={selectedAnswer() === index()}
                        disabled={questionState()!.answered}
                        onClick={() => answerQuestion(index())}
                      >
                        <div class={`d-flex align-items-center ${styles.logoContent}`}>
                          <div
                            class={`position-relative d-flex align-items-center m-auto p-1 p-xl-3 ${styles.logoWrapper}`}
                          >
                            <Show
                              when={!isUndefined(logo)}
                              fallback={
                                <SVGIcon kind={SVGIconKind.NotImage} class={`opacity-25 m-auto w-100 ${styles.logo}`} />
                              }
                            >
                              <Image logo={logo!} class={`m-auto w-100 ${styles.logo}`} ariaHidden={true} />
                            </Show>
                          </div>
                        </div>
                        <div
                          class={`d-flex align-items-center justify-content-start justify-content-lg-center fw-semibold px-3 px-lg-2 py-2 py-md-3 py-lg-2 ${styles.item}`}
                          classList={{ 'text-white': isCorrect() || isWrong() }}
                        >
                          <div class={`w-100 text-lg-center text-truncate ${styles.itemName}`}>{option.item}</div>
                        </div>
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>
            <div
              class={`position-relative d-flex flex-row justify-content-between mt-auto py-2 py-xl-4 ${styles.buttons}`}
            >
              {/* Start new game */}
              <Show when={questionState()?.is_last === false}>
                <div class="d-block d-xl-none">
                  <button
                    type="button"
                    class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
                    onClick={startNewGame}
                    aria-label="Start new game"
                  >
                    New game
                  </button>
                </div>
              </Show>

              {/* Play again */}
              <Show when={quizState()!.game_over}>
                <div class="w-100 text-center">
                  <button
                    ref={setPlayAgainButtonRef}
                    type="button"
                    class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
                    disabled={!questionState()!.answered}
                    onClick={startNewGame}
                    aria-label="Play again"
                  >
                    Play again
                  </button>
                </div>
              </Show>

              {/* Next question */}
              <Show when={!questionState()!.is_last}>
                <div class="ms-auto">
                  <button
                    ref={setNextButtonRef}
                    type="button"
                    class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
                    disabled={!questionState()!.answered}
                    onClick={() => {
                      setSelectedAnswer(null);
                      setQuizState(activeQuiz()!.next_question());
                    }}
                    aria-label="Next question"
                  >
                    Next
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default Content;
