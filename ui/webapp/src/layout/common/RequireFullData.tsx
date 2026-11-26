import { NoData } from 'common';
import { JSXElement, Show } from 'solid-js';

import { useFullDataStatus, useRetryFullData } from '../stores/fullData';

interface Props {
  children: JSXElement;
}

interface FullDataErrorProps {
  message: string;
}

/**
 * Renders its children unless the full dataset failed to load. In that case it shows
 * the error with a "Try again" button that retries the load, in place of the page.
 */
const RequireFullData = (props: Props) => {
  const fullDataStatus = useFullDataStatus();

  return (
    <Show
      when={fullDataStatus() !== 'error'}
      fallback={
        <main class="flex-grow-1 container-fluid px-3 px-lg-4 py-5">
          <FullDataError message="We couldn't load the landscape data." />
        </main>
      }
    >
      {props.children}
    </Show>
  );
};

export default RequireFullData;

/** Full dataset load error, with a "Try again" button that retries the load. */
export const FullDataError = (props: FullDataErrorProps) => {
  const retryFullData = useRetryFullData();

  return (
    <NoData>
      <div class="d-flex flex-column align-items-center">
        <div class="fs-5">{props.message}</div>
        <button type="button" class="btn btn-secondary mt-3" onClick={() => retryFullData()}>
          Try again
        </button>
      </div>
    </NoData>
  );
};
