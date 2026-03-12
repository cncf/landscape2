import { useSearchParams } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import { createSignal, JSXElement, onMount, Show } from 'solid-js';

import { ITEM_PARAM, VIEW_PARAM } from '../data';
import ItemModal from './common/itemModal';
import ZoomModal from './common/zoomModal';
import KioskView from './kiosk';
import styles from './Layout.module.css';
import Header from './navigation/Header';
import MobileHeader from './navigation/MobileHeader';
import { ActiveItemProvider } from './stores/activeItem';
import { FinancesDataProvider } from './stores/financesData';
import { FullDataProvider, useFullDataReady } from './stores/fullData';
import { GridWidthProvider } from './stores/gridWidth';
import { GroupActiveProvider } from './stores/groupActive';
import { GuideFileProvider } from './stores/guideFile';
import { MobileTOCProvider } from './stores/mobileTOC';
import { EventsProvider } from './stores/upcomingEventData';
import { ViewModeProvider } from './stores/viewMode';
import { VisibleZoomSectionProvider } from './stores/visibleZoomSection';
import { ZoomProvider } from './stores/zoom';
import UpcomingEvents from './upcomingEvents';

interface Props {
  children?: JSXElement;
}

// Inner wrapper so useFullDataReady() is called inside FullDataProvider
const KioskWrapper = (props: { itemId: string }) => {
  const fullDataReady = useFullDataReady();
  return <KioskView itemId={props.itemId} fullDataReady={fullDataReady()} />;
};

const Layout = (props: Props) => {
  const [searchParams] = useSearchParams();
  const [statsVisible, setStatsVisible] = createSignal<boolean>(true);

  const isKioskView = () => searchParams[VIEW_PARAM] === 'kiosk' && !!searchParams[ITEM_PARAM];
  const kioskItemId = (): string => {
    const val = searchParams[ITEM_PARAM];
    if (Array.isArray(val)) return val[0] || '';
    return val || '';
  };

  onMount(() => {
    // Check if statsDS is empty, if so, hide the stats link
    if (isEmpty(window.statsDS)) {
      setStatsVisible(false);
    }
  });

  return (
    <FullDataProvider>
      <Show
        when={!isKioskView()}
        fallback={<KioskWrapper itemId={kioskItemId()} />}
      >
        <ActiveItemProvider>
          <ViewModeProvider>
            <GroupActiveProvider>
              <VisibleZoomSectionProvider>
                <ZoomProvider>
                  <GridWidthProvider>
                    <MobileTOCProvider>
                      <GuideFileProvider>
                        <FinancesDataProvider>
                          <EventsProvider>
                            <div class={`d-flex flex-column ${styles.container}`}>
                              <MobileHeader statsVisible={statsVisible()} />
                              <Header statsVisible={statsVisible()} />
                              <div class="d-flex flex-column flex-grow-1">{props.children}</div>
                            </div>
                            <ItemModal />
                            <ZoomModal />
                            <UpcomingEvents />
                          </EventsProvider>
                        </FinancesDataProvider>
                      </GuideFileProvider>
                    </MobileTOCProvider>
                  </GridWidthProvider>
                </ZoomProvider>
              </VisibleZoomSectionProvider>
            </GroupActiveProvider>
          </ViewModeProvider>
        </ActiveItemProvider>
      </Show>
    </FullDataProvider>
  );
};

export default Layout;
