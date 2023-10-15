import { lazy, Suspense } from 'solid-js';

import { Loading } from '../common/Loading';
import Footer from '../navigation/Footer';
import styles from './Stats.module.css';

const Content = lazy(() => import('./Content'));

const StatsIndex = () => {
  return (
    <>
      <main class="flex-grow-1 container-fluid d-none d-lg-block px-4 position-relative">
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
      <Footer logo={window.baseDS.images.footer_logo} />
    </>
  );
};

export default StatsIndex;
