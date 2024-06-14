import { Image, Loading, NoData, SVGIcon, SVGIconKind } from 'common';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { createSignal, For, onMount, Show } from 'solid-js';

import init, { Quiz, QuizOptions, State } from '../../../wasm/quiz/landscape2_quiz';
import pattern from '../../media/pattern_quiz.png';
import isWasmSupported from '../../utils/isWasmSupported';
import itemsDataGetter from '../../utils/itemsDataGetter';
import styles from './Content.module.css';
import Title from './Title';

const Content = () => {
  const [loaded, setLoaded] = createSignal<boolean>(false);
  const [activeQuiz, setActiveQuiz] = createSignal<Quiz | null>(null);
  const [quizState, setQuizState] = createSignal<State | undefined>();
  const [selectedAnswer, setSelectedAnswer] = createSignal<number | null>(null);
  const [error, setError] = createSignal<string | undefined>();

  const startGame = async (initiated?: boolean) => {
    const options = new QuizOptions(import.meta.env.MODE === 'development' ? 'http://localhost:8000' : location.origin);
    const quiz = await new Quiz(options);
    setActiveQuiz(quiz);
    if (initiated) setQuizState(quiz.state());
  };

  const startNewGame = () => {
    setQuizState(undefined);
    setSelectedAnswer(null);
    startGame(true);
  };

  const importGames = async () => {
    if (!isWasmSupported()) {
      setError("This game requires WebAssembly, but your browser doesn't seem to support it");
      setLoaded(true);
      return Promise.reject('WebAssembly is not supported in this browser');
    } else {
      await init();
      setLoaded(true);
      startGame();
    }
  };

  onMount(() => {
    if (!isUndefined(window.baseDS.games_available)) {
      importGames();
    }
  });

  return (
    <div class={`d-flex flex-column h-100 ${styles.wrapper}`}>
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
                <div class="fw-semibold">
                  {quizState()!.current_question.index + 1} / {activeQuiz()!.questions().length}
                </div>
                <div class="d-flex flex-row align-items-center ms-4 ms-xl-5">
                  <div class={`border border-2 border-light ${styles.dot} ${styles.dotCorrect}`} />
                  <div class={`ms-2 fw-semibold ${styles.score}`}>{quizState()!.score.correct}</div>

                  <div class={`ms-3 ms-xl-4 border border-2 border-light  ${styles.dot} ${styles.dotWrong}`} />
                  <div class={`ms-2 fw-semibold ${styles.score}`}>{quizState()!.score.wrong}</div>
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
                class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
                onClick={startNewGame}
              >
                New game
              </button>
            </Show>
          </div>
        </div>
        <Show when={!loaded()}>
          <Loading />
        </Show>
        <Show when={!isUndefined(error())}>
          <div class="flex-grow-1 d-flex flex-column align-items-center justify-content-center h-100 w-100">
            <NoData class="bg-light fs-5">{error()}</NoData>
          </div>
        </Show>
        <Show when={!isNull(activeQuiz()) && isUndefined(quizState())}>
          <div class="flex-grow-1 d-flex flex-column align-items-center justify-content-center h-100 w-100">
            {/* Init Quiz state */}
            <button
              class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
              onClick={() => setQuizState(activeQuiz()!.state())}
            >
              New game
            </button>
          </div>
        </Show>
        <Show when={!isUndefined(quizState()) && !isNull(quizState())}>
          <div class="d-flex flex-column h-100">
            <div class={`flex-grow-1 d-flex flex-column mx-auto py-4 ${styles.quizContent}`}>
              <div
                class={`d-flex align-items-center justify-content-center border border-4 border-dark text-center mb-3 mb-xl-5 bg-white ${styles.title}`}
              >
                <Title content={activeQuiz()!.questions()[quizState()!.current_question.index]!.title} />
              </div>

              <div class="d-flex flex-column flex-lg-row flex-wrap justify-content-center mt-0 mt-lg-3">
                <For each={activeQuiz()!.questions()[quizState()!.current_question.index]!.options}>
                  {(option, index) => {
                    const logo = itemsDataGetter.getLogoItem(option.item, option.category, option.subcategory);

                    if (isNull(logo)) return null;

                    const isCorrect = () => quizState()!.current_question.answered && option.correct;
                    const isWrong = () =>
                      quizState()!.current_question.answered && !option.correct && selectedAnswer() === index();

                    return (
                      <div
                        class={`d-flex flex-row flex-lg-column border border-4 border-dark bg-white mx-auto mx-lg-4 my-2 my-md-3 ${styles.option}`}
                        classList={{
                          [styles.answered]: quizState()!.current_question.answered,
                          [styles.selected]: selectedAnswer() === index(),
                          [styles.correct]: isCorrect(),
                          [styles.wrong]: isWrong(),
                        }}
                        onClick={() => {
                          if (quizState()!.current_question.answered) return;
                          setSelectedAnswer(index());
                          setQuizState(activeQuiz()!.check_player_guess(index()));
                        }}
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
                              <Image name={option.item} logo={logo!} class={`m-auto w-100 ${styles.logo}`} />
                            </Show>
                          </div>
                        </div>
                        <div
                          class={`d-flex align-items-center justify-content-start justify-content-lg-center fw-semibold px-3 px-lg-2 py-2 py-md-3 py-lg-2 ${styles.item}`}
                          classList={{ 'text-white': isCorrect() || isWrong() }}
                        >
                          <div class={`w-100 text-lg-center text-truncate ${styles.itemName}`}>{option.item}</div>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
            <div
              class={`position-relative d-flex flex-row justify-content-between mt-auto py-2 py-xl-4 ${styles.buttons}`}
            >
              <Show when={!isUndefined(quizState()) && !quizState()!.current_question.is_last}>
                <div class="d-block d-xl-none">
                  <button
                    class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
                    onClick={startNewGame}
                  >
                    New game
                  </button>
                </div>
              </Show>

              <Show when={quizState()!.game_over}>
                <div class="w-100 text-center">
                  <button
                    class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
                    disabled={!quizState()!.current_question.answered}
                    onClick={startNewGame}
                  >
                    Play again
                  </button>
                </div>
              </Show>

              {/* Next question */}
              <Show when={!quizState()!.current_question.is_last}>
                <div class="ms-auto">
                  <button
                    class={`btn btn-secondary rounded-0 text-uppercase border border-4 border-light ${styles.btn}`}
                    disabled={!quizState()!.current_question.answered}
                    onClick={() => {
                      setSelectedAnswer(null);
                      setQuizState(activeQuiz()!.next_question());
                    }}
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
