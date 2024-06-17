import { ExternalLink, SVGIcon, SVGIconKind } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, Show } from 'solid-js';

import { BANNER_ID } from '../../data';
import { useActiveItemId } from '../stores/activeItem';
import { useEventContent, useEventVisibleContent, useSetEventHiddenContent } from '../stores/upcomingEventData';
import styles from './UpcomingEvents.module.css';

const UpcomingEvents = () => {
  const visibleContent = useEventVisibleContent();
  const setHiddenEvent = useSetEventHiddenContent();
  const upcomingEvent = useEventContent();
  const visibleItemId = useActiveItemId();
  const [image, setImage] = createSignal<HTMLImageElement>();
  const [error, setError] = createSignal(false);
  const [loaded, setLoaded] = createSignal(false);

  createEffect(
    on(image, () => {
      if (!isUndefined(image()) && image()!.complete) {
        setLoaded(true);
      }
    })
  );

  return (
    <Show when={visibleContent() && !error()}>
      <div
        id={BANNER_ID}
        class={`position-fixed d-none d-md-block start-50 ${styles.wrapper}`}
        classList={{
          [styles.loaded]: loaded(),
        }}
        style={!isUndefined(visibleItemId()) ? { 'z-index': 1080 } : {}}
      >
        <ExternalLink
          class={`d-block border border-2 overflow-hidden ${styles.imageWrapper}`}
          href={upcomingEvent()!.details_url}
        >
          <img
            ref={setImage}
            class={`d-block pe-none ${styles.image}`}
            src={upcomingEvent()!.banner_url}
            title={upcomingEvent!.name}
            onError={() => setError(true)}
            onLoad={() => setLoaded(true)}
          />
        </ExternalLink>
        <button
          class={`position-absolute btn btn-link btn-sm border p-0 bg-white rounded-circle ${styles.closeBtn}`}
          onClick={() => setHiddenEvent(true)}
        >
          <SVGIcon class="position-relative" kind={SVGIconKind.Close} />
        </button>
      </div>
    </Show>
  );
};

export default UpcomingEvents;
