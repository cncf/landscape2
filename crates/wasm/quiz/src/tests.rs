use std::fs;

use mockito::{Mock, ServerGuard};
use rand::{SeedableRng, rngs::StdRng};

use super::*;

#[tokio::test]
async fn test_quiz_new_rejects_invalid_provided_questions() {
    // Setup a server whose quiz data must not be fetched
    let test_name = "test_quiz_new_rejects_invalid_provided_questions";
    let mut server = mockito::Server::new_async().await;
    let mock = mock_quiz_data(&mut server, test_name, 200, &read_fixture("quiz2.json"), 0).await;

    // Run the quiz creation with malformed provided questions
    let options = QuizOptions::new(
        landscape_url(&server, test_name),
        Some(r#"[{"title": "question1"}"#.to_string()),
    );
    let Err(err) = Quiz::new(options).await else {
        panic!("expected error");
    };

    // Check the provided questions were rejected without fetching any
    mock.assert_async().await;
    assert_eq!(
        err,
        "invalid quiz data: missing field `options` at line 1 column 23"
    );
}

#[tokio::test]
async fn test_quiz_new_rejects_not_found_quiz_data() {
    // Setup a server without quiz data
    let test_name = "test_quiz_new_rejects_not_found_quiz_data";
    let mut server = mockito::Server::new_async().await;
    let mock = mock_quiz_data(&mut server, test_name, 404, "", 1).await;

    // Run the quiz creation
    let options = QuizOptions::new(landscape_url(&server, test_name), None);
    let Err(err) = Quiz::new(options).await else {
        panic!("expected error");
    };

    // Check the fetch error is returned as is, without quotes
    mock.assert_async().await;
    assert_eq!(err, "unexpected status code getting quiz data: 404");
}

#[tokio::test]
async fn test_quiz_new_uses_provided_questions() {
    // Setup a server whose quiz data must not be fetched, and the questions
    let test_name = "test_quiz_new_uses_provided_questions";
    let mut server = mockito::Server::new_async().await;
    let mock = mock_quiz_data(&mut server, test_name, 200, &read_fixture("quiz1.json"), 0).await;
    let questions_json = read_fixture("quiz2.json");

    // Run the quiz creation with the provided questions
    let options = QuizOptions::new(landscape_url(&server, test_name), Some(questions_json));
    let Ok(quiz) = Quiz::new(options).await else {
        panic!("expected quiz");
    };

    // Check the provided questions are used and none were fetched
    mock.assert_async().await;
    assert_eq!(quiz.questions_count(), 2);
    let mut titles: Vec<&str> = quiz.questions.iter().map(|question| question.title.as_str()).collect();
    titles.sort_unstable();
    assert_eq!(titles, vec!["question1", "question2"]);
}

#[test]
fn test_check_player_guess_counts_wrong_then_correct() {
    // Setup a quiz with two questions
    let mut quiz = quiz_from_fixture("quiz2.json");

    // Run a wrong guess on the first question, then a correct one on the second
    quiz.check_player_guess(wrong_option(&quiz)).unwrap();
    quiz.next_question().unwrap();
    let state = quiz.check_player_guess(correct_option(&quiz)).unwrap();

    // Check both guesses were counted and the game is over
    assert_eq!(state.score, Score { correct: 1, wrong: 1 });
    assert!(state.game_over);
    assert_eq!(quiz.state(), state);
}

#[test]
fn test_check_player_guess_rejects_after_game_over() {
    // Setup a single question quiz whose question has been answered
    let mut quiz = quiz_from_fixture("quiz1.json");
    let state = quiz.check_player_guess(correct_option(&quiz)).unwrap();
    assert!(state.game_over);

    // Run another guess
    let Err(err) = quiz.check_player_guess(wrong_option(&quiz)) else {
        panic!("expected error");
    };

    // Check the guess was rejected and the state was kept
    assert_eq!(err, "game is over");
    assert_eq!(quiz.state(), state);
}

#[test]
fn test_check_player_guess_rejects_invalid_option_and_keeps_state() {
    // Setup a quiz
    let mut quiz = quiz_from_fixture("quiz1.json");
    let state_before = quiz.state();

    // Run a guess with an out of bounds option
    let Err(err) = quiz.check_player_guess(5) else {
        panic!("expected error");
    };

    // Check the guess was rejected and the state was kept
    assert_eq!(err, "invalid option selected");
    assert_eq!(quiz.state(), state_before);
}

#[test]
fn test_check_player_guess_rejects_second_answer_and_keeps_state() {
    // Setup a quiz with two questions whose first question has been answered
    let mut quiz = quiz_from_fixture("quiz2.json");
    let state_before = quiz.check_player_guess(correct_option(&quiz)).unwrap();

    // Run a second guess on the same question
    let Err(err) = quiz.check_player_guess(wrong_option(&quiz)) else {
        panic!("expected error");
    };

    // Check the guess was rejected and the state was kept
    assert_eq!(err, "question already answered");
    assert_eq!(quiz.state(), state_before);
}

#[test]
fn test_quiz_current_question_follows_next_question() {
    // Setup a quiz with two questions
    let mut quiz = quiz_from_fixture("quiz2.json");

    // Check the first question is the current one
    assert_eq!(quiz.current_question(), quiz.questions[0]);

    // Run an answer and move to the next question
    quiz.check_player_guess(correct_option(&quiz)).unwrap();
    quiz.next_question().unwrap();

    // Check the second question is the current one
    assert_eq!(quiz.current_question(), quiz.questions[1]);
}

#[test]
fn test_next_question_rejects_after_game_over() {
    // Setup a single question quiz whose question has been answered
    let mut quiz = quiz_from_fixture("quiz1.json");
    let state = quiz.check_player_guess(correct_option(&quiz)).unwrap();

    // Run the move to the next question
    let Err(err) = quiz.next_question() else {
        panic!("expected error");
    };

    // Check the move was rejected and the state was kept
    assert_eq!(err, "game is over");
    assert_eq!(quiz.state(), state);
}

#[test]
fn test_next_question_rejects_unanswered_question() {
    // Setup a quiz with two questions
    let mut quiz = quiz_from_fixture("quiz2.json");
    let state_before = quiz.state();

    // Run the move to the next question without answering the current one
    let Err(err) = quiz.next_question() else {
        panic!("expected error");
    };

    // Check the move was rejected and the state was kept
    assert_eq!(err, "current question not answered");
    assert_eq!(quiz.state(), state_before);
}

#[test]
fn test_quiz_questions_count_matches_picked_questions() {
    let quiz = quiz_from_fixture("quiz11.json");

    assert_eq!(quiz.questions_count(), QUIZ_QUESTIONS);
    assert_eq!(quiz.questions_count(), quiz.questions.len());
}

#[test]
fn test_quiz_completes_successfully() {
    // Setup a quiz with two questions
    let mut quiz = quiz_from_fixture("quiz2.json");

    // Check the state after the quiz creation
    assert_eq!(
        quiz.state(),
        State {
            current_question: CurrentQuestion {
                answered: false,
                index: 0,
                is_last: false,
            },
            game_over: false,
            score: Score { correct: 0, wrong: 0 },
        }
    );

    // Check the state after answering the first question correctly
    let state = quiz.check_player_guess(correct_option(&quiz)).unwrap();
    let expected_state = State {
        current_question: CurrentQuestion {
            answered: true,
            index: 0,
            is_last: false,
        },
        game_over: false,
        score: Score { correct: 1, wrong: 0 },
    };
    assert_eq!(state, expected_state);
    assert_eq!(quiz.state(), expected_state);

    // Check the state after moving to the next question
    let state = quiz.next_question().unwrap();
    let expected_state = State {
        current_question: CurrentQuestion {
            answered: false,
            index: 1,
            is_last: true,
        },
        game_over: false,
        score: Score { correct: 1, wrong: 0 },
    };
    assert_eq!(state, expected_state);
    assert_eq!(quiz.state(), expected_state);

    // Check the state after answering the second question wrongly
    let state = quiz.check_player_guess(wrong_option(&quiz)).unwrap();
    let expected_state = State {
        current_question: CurrentQuestion {
            answered: true,
            index: 1,
            is_last: true,
        },
        game_over: true,
        score: Score { correct: 1, wrong: 1 },
    };
    assert_eq!(state, expected_state);
    assert_eq!(quiz.state(), expected_state);
}

#[test]
fn test_quiz_from_questions_caps_at_ten() {
    // Setup more questions than a quiz can hold
    let questions = questions_from_fixture("quiz11.json");
    assert_eq!(questions.len(), 11);

    // Run the quiz creation
    let quiz = Quiz::from_questions(questions, &mut rng()).unwrap();

    // Check only ten distinct questions were picked
    assert_eq!(quiz.questions.len(), 10);
    let mut titles: Vec<&str> = quiz.questions.iter().map(|question| question.title.as_str()).collect();
    titles.sort_unstable();
    titles.dedup();
    assert_eq!(titles.len(), 10);
}

#[test]
fn test_quiz_from_questions_keeps_options_and_single_correct() {
    // Setup the questions available
    let questions = questions_from_fixture("quiz11.json");

    // Run the quiz creation
    let quiz = Quiz::from_questions(questions.clone(), &mut rng()).unwrap();

    // Check each picked question keeps its options, with the correct flag on
    // the same item, and exactly one correct option
    for picked in &quiz.questions {
        let original = questions.iter().find(|question| question.title == picked.title).unwrap();
        let mut picked_options = picked.options.clone();
        picked_options.sort_by(|a, b| a.item.cmp(&b.item));
        let mut original_options = original.options.clone();
        original_options.sort_by(|a, b| a.item.cmp(&b.item));
        assert_eq!(picked_options, original_options);
        assert_eq!(picked.options.iter().filter(|option| option.correct).count(), 1);
    }
}

#[test]
fn test_quiz_from_questions_marks_single_question_as_last() {
    // Run the quiz creation with a single question
    let quiz = Quiz::from_questions(questions_from_fixture("quiz1.json"), &mut rng()).unwrap();

    // Check the first question is the last one
    assert_eq!(
        quiz.state(),
        State {
            current_question: CurrentQuestion {
                answered: false,
                index: 0,
                is_last: true,
            },
            game_over: false,
            score: Score { correct: 0, wrong: 0 },
        }
    );
}

#[test]
fn test_quiz_from_questions_rejects_empty() {
    // Run the quiz creation from an empty quiz data file
    let Err(err) = Quiz::from_questions(questions_from_fixture("quiz3.json"), &mut rng()) else {
        panic!("expected error");
    };

    // Check the quiz was rejected
    assert_eq!(err, "no questions available");
}

#[test]
fn test_quiz_from_questions_shuffles_questions() {
    // Setup the questions available
    let questions = questions_from_fixture("quiz11.json");
    let input_titles: Vec<&str> = questions.iter().map(|question| question.title.as_str()).collect();

    // Run the quiz creation
    let quiz = Quiz::from_questions(questions.clone(), &mut rng()).unwrap();

    // Check the picked questions are not in the input order
    let picked_titles: Vec<&str> = quiz.questions.iter().map(|question| question.title.as_str()).collect();
    assert_ne!(picked_titles, input_titles[..QUIZ_QUESTIONS]);
}

#[tokio::test]
async fn test_fetch_questions_caches_successful_response() {
    // Setup a server that serves the quiz data only once
    let test_name = "test_fetch_questions_caches_successful_response";
    let mut server = mockito::Server::new_async().await;
    let mock = mock_quiz_data(&mut server, test_name, 200, &read_fixture("quiz2.json"), 1).await;

    // Run the questions fetch twice
    let first = fetch_questions(landscape_url(&server, test_name)).await.unwrap();
    let second = fetch_questions(landscape_url(&server, test_name)).await.unwrap();

    // Check the second fetch was served from the cache
    mock.assert_async().await;
    assert_eq!(first, questions_from_fixture("quiz2.json"));
    assert_eq!(second, first);
}

#[tokio::test]
async fn test_fetch_questions_rejects_malformed_json() {
    // Setup a server that serves malformed quiz data
    let test_name = "test_fetch_questions_rejects_malformed_json";
    let mut server = mockito::Server::new_async().await;
    let mock = mock_quiz_data(&mut server, test_name, 200, r#"[{"title": "question1"}"#, 1).await;

    // Run the questions fetch
    let Err(err) = fetch_questions(landscape_url(&server, test_name)).await else {
        panic!("expected error");
    };

    // Check the parsing error is reported
    mock.assert_async().await;
    assert_eq!(
        err,
        "invalid quiz data: missing field `options` at line 1 column 23"
    );
}

#[tokio::test]
async fn test_fetch_questions_rejects_not_found() {
    // Setup a server without quiz data
    let test_name = "test_fetch_questions_rejects_not_found";
    let mut server = mockito::Server::new_async().await;
    let mock = mock_quiz_data(&mut server, test_name, 404, "", 1).await;

    // Run the questions fetch
    let Err(err) = fetch_questions(landscape_url(&server, test_name)).await else {
        panic!("expected error");
    };

    // Check the error reports the status code alone, without quotes
    mock.assert_async().await;
    assert_eq!(err, "unexpected status code getting quiz data: 404");
}

#[tokio::test]
async fn test_fetch_questions_retries_after_error() {
    // Setup a server that fails once and then serves the quiz data
    let test_name = "test_fetch_questions_retries_after_error";
    let mut server = mockito::Server::new_async().await;
    let failing_mock = mock_quiz_data(&mut server, test_name, 500, "", 1).await;
    let mock = mock_quiz_data(&mut server, test_name, 200, &read_fixture("quiz2.json"), 1).await;

    // Run the first questions fetch
    let Err(err) = fetch_questions(landscape_url(&server, test_name)).await else {
        panic!("expected error");
    };

    // Check the first fetch failed
    assert_eq!(err, "unexpected status code getting quiz data: 500");

    // Run the second questions fetch
    let questions = fetch_questions(landscape_url(&server, test_name)).await.unwrap();

    // Check the error was not cached and the second fetch succeeded
    failing_mock.assert_async().await;
    mock.assert_async().await;
    assert_eq!(questions, questions_from_fixture("quiz2.json"));
}

#[tokio::test]
async fn test_fetch_questions_returns_questions() {
    // Setup a server that serves the quiz data
    let test_name = "test_fetch_questions_returns_questions";
    let mut server = mockito::Server::new_async().await;
    let mock = mock_quiz_data(&mut server, test_name, 200, &read_fixture("quiz2.json"), 1).await;

    // Run the questions fetch
    let questions = fetch_questions(landscape_url(&server, test_name)).await.unwrap();

    // Check the questions served were returned
    mock.assert_async().await;
    assert_eq!(questions, questions_from_fixture("quiz2.json"));
}

#[tokio::test]
async fn test_fetch_questions_trims_trailing_slash() {
    // Setup a server that serves the quiz data
    let test_name = "test_fetch_questions_trims_trailing_slash";
    let mut server = mockito::Server::new_async().await;
    let mock = mock_quiz_data(&mut server, test_name, 200, &read_fixture("quiz2.json"), 1).await;

    // Run the questions fetch with a landscape url ending with a slash
    let landscape_url = format!("{}/", landscape_url(&server, test_name));
    let questions = fetch_questions(landscape_url).await.unwrap();

    // Check the quiz data was requested without a double slash
    mock.assert_async().await;
    assert_eq!(questions, questions_from_fixture("quiz2.json"));
}

// Helpers.

/// Return the index of the correct option of the quiz current question.
fn correct_option(quiz: &Quiz) -> usize {
    quiz.current_question().options.iter().position(|option| option.correct).unwrap()
}

/// Return the landscape url of the server provided, under a path prefix
/// unique to the test so that the global fetch cache cannot share results
/// between tests when mockito reuses pooled servers.
fn landscape_url(server: &ServerGuard, test_name: &str) -> String {
    format!("{}/{test_name}", server.url())
}

/// Mock the quiz data file of the test's landscape url on the server
/// provided, expecting the number of hits provided.
async fn mock_quiz_data(
    server: &mut ServerGuard,
    test_name: &str,
    status: usize,
    body: &str,
    hits: usize,
) -> Mock {
    server
        .mock(
            "GET",
            format!("/{test_name}/{DATASETS_PATH}/{QUIZ_DATASET_FILE}").as_str(),
        )
        .with_status(status)
        .with_body(body)
        .expect(hits)
        .create_async()
        .await
}

/// Parse the questions in the testdata file provided.
fn questions_from_fixture(file: &str) -> Vec<Question> {
    parse_questions(&read_fixture(file)).unwrap()
}

/// Create a quiz from the questions in the testdata file provided, using a
/// seeded random generator.
fn quiz_from_fixture(file: &str) -> Quiz {
    Quiz::from_questions(questions_from_fixture(file), &mut rng()).unwrap()
}

/// Read the testdata file provided.
fn read_fixture(file: &str) -> String {
    fs::read_to_string(format!("src/testdata/{file}")).unwrap()
}

/// Return a seeded random generator, so that shuffles are deterministic.
fn rng() -> StdRng {
    StdRng::seed_from_u64(0)
}

/// Return the index of a wrong option of the quiz current question.
fn wrong_option(quiz: &Quiz) -> usize {
    quiz.current_question().options.iter().position(|option| !option.correct).unwrap()
}
