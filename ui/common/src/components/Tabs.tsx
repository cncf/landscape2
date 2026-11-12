import { createMemo, createSignal, createUniqueId, For, JSXElement, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { NoData } from './NoData';

interface TabsProps {
  initialActive: string;
  noDataContent: string;
  tabs: TabProps[];
  class?: string;
}

interface TabProps {
  // Called only while the tab is active, so inactive tabs render nothing
  content: () => JSXElement;
  name: string;
  title: string;
  shortTitle?: string;
}

const TabsClass = css`
  border-bottom-color: var(--bs-dark) !important;
`;

const Btn = css`
  margin-bottom: -1px;

  &:hover {
    text-decoration: none;
  }
`;

const Active = css`
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  border-color: var(--bs-dark) !important;
  border-bottom: 1px solid var(--bs-dark) !important;
`;

/** Tabbed panels with tab roles; only the active tab's `content` function is called, and `NoData` shows when no tab matches. */
export const Tabs = (props: TabsProps) => {
  const id = createUniqueId();
  const panelId = `${id}-panel`;
  const [activeTab, setActiveTab] = createSignal(props.initialActive);
  const active = createMemo(() => props.tabs.find((tab) => tab.name === activeTab()));
  const tabId = (name: string) => `${id}-tab-${name}`;

  return (
    <>
      <div class={props.class}>
        <ul class={`nav nav-tabs ${TabsClass}`} role="tablist">
          <For each={props.tabs}>
            {(tab: TabProps) => (
              <li class="nav-item" role="presentation">
                <button
                  id={tabId(tab.name)}
                  type="button"
                  role="tab"
                  class={`btn nav-item rounded-0 ${Btn}`}
                  classList={{
                    [`active btn-dark ${Active}`]: tab.name === activeTab(),
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(tab.name);
                  }}
                  aria-controls={panelId}
                  aria-selected={tab.name === activeTab()}
                >
                  <Show when={tab.shortTitle} fallback={tab.title}>
                    {(shortTitle) => (
                      <>
                        <span class="d-none d-sm-block">{tab.title}</span>
                        <span class="d-block d-sm-none">{shortTitle()}</span>
                      </>
                    )}
                  </Show>
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>

      <div class="tab-content mt-4">
        <div
          id={panelId}
          class="tab-pane fade show active"
          role="tabpanel"
          aria-labelledby={active() ? tabId(activeTab()) : undefined}
        >
          <Show when={active()} fallback={<NoData>{props.noDataContent}</NoData>}>
            {active()?.content()}
          </Show>
        </div>
      </div>
    </>
  );
};
