import { useLocation } from '@solidjs/router';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { createContext, createEffect, createMemo, createSignal, on, ParentComponent, useContext } from 'solid-js';

import { Event } from '../../types';
import isExploreSection from '../../utils/isExploreSection';

const validateEvent = (): Event | null => {
  let validEvent: Event | null = null;
  if (!isUndefined(window.baseDS.upcoming_event)) {
    const endData = moment(window.baseDS.upcoming_event.end, 'YYYY/MM/DD');
    // If event is not past
    if (moment().diff(endData) < 0) {
      validEvent = window.baseDS.upcoming_event!;
    }
  }

  return validEvent;
};

function useUpcomingEventProvider() {
  const validEvent = () => validateEvent();
  const [event] = createSignal<Event | null>(validEvent());
  const [eventVisible, setEventVisible] = createSignal<boolean>(!isNull(validEvent()));
  // This parameter is updated by user to click close upcoming event button
  const [hiddenEvent, setHiddenEvent] = createSignal<boolean>(isNull(validEvent()));
  const location = useLocation();
  // Upcoming event is only visible on EXPLORE section
  const isExploreActive = createMemo(() => isExploreSection(location.pathname));

  createEffect(
    on(isExploreActive, () => {
      if (isExploreActive()) {
        setEventVisible(true);
      } else {
        setEventVisible(false);
      }
    })
  );

  return {
    event: event,
    eventsVisible: () => !hiddenEvent() && eventVisible(),
    setHiddenEvent: setHiddenEvent,
  };
}

export type ContextEventsType = ReturnType<typeof useUpcomingEventProvider>;

const EventsContext = createContext<ContextEventsType | undefined>(undefined);

export const EventsProvider: ParentComponent = (props) => {
  const value = useUpcomingEventProvider();
  return <EventsContext.Provider value={value}>{props.children}</EventsContext.Provider>;
};

export function useUpcomingEvent() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error(`useUpcomingEventProvider must be used within a EventsProvider`);
  }
  return context;
}

export function useEventContent() {
  return useUpcomingEvent().event;
}

export function useEventVisibleContent() {
  return useUpcomingEvent().eventsVisible;
}

export function useSetEventHiddenContent() {
  return useUpcomingEvent().setHiddenEvent;
}
