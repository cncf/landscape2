import { JSXElement } from 'solid-js';

import ItemModal from './common/itemModal';
import ZoomModal from './common/zoomModal';
import styles from './Layout.module.css';
import Header from './navigation/Header';
import MobileHeader from './navigation/MobileHeader';
import { ActiveItemProvider } from './stores/activeItem';
import { FinancesDataProvider } from './stores/financesData';
import { FullDataProvider } from './stores/fullData';
import { GridWidthProvider } from './stores/gridWidth';
import { GroupActiveProvider } from './stores/groupActive';
import { GuideFileProvider } from './stores/guideFile';
import { MobileTOCProvider } from './stores/mobileTOC';
import { ViewModeProvider } from './stores/viewMode';
import { VisibleZoomSectionProvider } from './stores/visibleZoomSection';
import { ZoomProvider } from './stores/zoom';

interface Props {
  children?: JSXElement;
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
                  <MobileTOCProvider>
                    <GuideFileProvider>
                      <FinancesDataProvider>
                        <div class={`d-flex flex-column ${styles.container}`}>
                          <MobileHeader />
                          <Header />
                          <div class="d-flex flex-column flex-grow-1">{props.children}</div>
                        </div>
                        <ItemModal />
                        <ZoomModal />
                      </FinancesDataProvider>
                    </GuideFileProvider>
                  </MobileTOCProvider>
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
