import { useLocation } from '@solidjs/router';
import isNull from 'lodash/isNull';
import { createContext, createMemo, createSignal, ParentComponent, useContext } from 'solid-js';

import getActiveEvent from '../../utils/getActiveEvent';
import isExploreSection from '../../utils/isExploreSection';

function useUpcomingEventProvider() {
  // The event doesn't change while the app runs, so it is resolved once
  const event = getActiveEvent(window.baseDS.upcoming_event, new Date());
  // Set when the user closes the banner (and from the start when there is no active event)
  const [hiddenEvent, setHiddenEvent] = createSignal<boolean>(isNull(event));
  const location = useLocation();
  // The upcoming event is only visible on the Explore section
  const isExploreActive = createMemo(() => isExploreSection(location.pathname));

  return {
    event: () => event,
    eventsVisible: () => !hiddenEvent() && isExploreActive(),
    setHiddenEvent,
  };
}

type ContextUpcomingEventType = ReturnType<typeof useUpcomingEventProvider>;

const UpcomingEventContext = createContext<ContextUpcomingEventType | undefined>(undefined);

export const UpcomingEventProvider: ParentComponent = (props) => {
  const value = useUpcomingEventProvider();
  return <UpcomingEventContext.Provider value={value}>{props.children}</UpcomingEventContext.Provider>;
};

function useUpcomingEventContext() {
  const context = useContext(UpcomingEventContext);
  if (context === undefined) {
    throw new Error(`useUpcomingEventContext must be used within an UpcomingEventProvider`);
  }
  return context;
}

/** Returns the active upcoming event accessor. */
export function useEventContent() {
  return useUpcomingEventContext().event;
}

/** Returns the accessor that tells whether the upcoming event banner is visible. */
export function useEventVisibleContent() {
  return useUpcomingEventContext().eventsVisible;
}

/** Returns the setter that hides the upcoming event banner. */
export function useSetEventHiddenContent() {
  return useUpcomingEventContext().setHiddenEvent;
}
