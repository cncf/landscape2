import { Loading } from 'common';
import { lazy, Suspense } from 'solid-js';

import Footer from '../navigation/Footer';
import styles from './Games.module.css';

const Content = lazy(() => import('./Content'));

const GamesIndex = () => {
  return (
    <>
      <main class="flex-grow-1 container-fluid px-3 px-lg-4 position-relative">
        <Suspense
          fallback={
            <div class={`d-flex flex-row ${styles.loadingContent}`}>
              <Loading spinnerClass="position-fixed top-50 start-50" />
            </div>
          }
        >
          <Content />
        </Suspense>
      </main>
      <Footer />
    </>
  );
};

export default GamesIndex;
