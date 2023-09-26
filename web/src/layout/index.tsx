import { Outlet } from '@solidjs/router';

import { BaseData } from '../types';
import ItemModal from './common/itemModal';
import NoData from './common/NoData';
import ZoomModal from './common/zoomModal';
import Header from './navigation/Header';
import { ActiveItemProvider } from './stores/activeItem';
import { FullDataProvider } from './stores/fullData';
import { GridWidthProvider } from './stores/gridWidth';
import { GroupActiveProvider } from './stores/groupActive';
import { ViewModeProvider } from './stores/viewMode';
import { VisibleZoomSectionProvider } from './stores/visibleZoomSection';
import { ZoomProvider } from './stores/zoom';

interface Props {
  data: BaseData;
}

const Layout = (props: Props) => {
  return (
    <FullDataProvider>
      <ActiveItemProvider>
        <ViewModeProvider>
          <GroupActiveProvider>
            <VisibleZoomSectionProvider>
              <ZoomProvider>
                <GridWidthProvider>
                  <div class="h-100 d-flex flex-column">
                    <Header logo={props.data.images.header_logo} items={props.data.items} />
                    <div class="d-flex flex-column flex-grow-1">
                      <div class="d-block d-lg-none mx-5">
                        <NoData>
                          <div class="d-flex flex-column">
                            <div class="fs-6 fw-semibold">
                              This prototype hasn't been optimized for mobile devices yet.
                            </div>
                            <small class="my-3">But we are working on it and it'll be ready soon 😊</small>
                          </div>
                        </NoData>
                      </div>

                      <Outlet />
                    </div>
                  </div>
                  <ItemModal />
                  <ZoomModal />
                </GridWidthProvider>
              </ZoomProvider>
            </VisibleZoomSectionProvider>
          </GroupActiveProvider>
        </ViewModeProvider>
      </ActiveItemProvider>
    </FullDataProvider>
  );
};

export default Layout;
