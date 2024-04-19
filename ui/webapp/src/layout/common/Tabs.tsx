import { createEffect, createSignal, For, JSXElement, Show } from 'solid-js';

import NoData from './NoData';
import styles from './Tabs.module.css';

interface TabsProps {
  tabs: TabProps[];
  initialActive: string;
  noDataContent: string;
  className?: string;
}

interface TabProps {
  name: string;
  title: string;
  shortTitle?: string;
  content: JSXElement;
}

const Tabs = (props: TabsProps) => {
  const [activeTab, setActiveTab] = createSignal(props.initialActive);
  const [visibleContent, setVisibleContent] = createSignal<JSXElement | undefined>();

  createEffect(() => {
    const currentActiveTab = props.tabs.find((tab: TabProps) => tab.name === activeTab());
    if (currentActiveTab) {
      setVisibleContent(currentActiveTab.content);
    }
  });

  return (
    <>
      <div class={props.className}>
        <ul class={`nav nav-tabs ${styles.tabs}`}>
          <For each={props.tabs}>
            {(tab: TabProps) => (
              <li class="nav-item">
                <button
                  class={`btn nav-item rounded-0 ${styles.btn}`}
                  classList={{
                    [`active btn-dark ${styles.active}`]: tab.name === activeTab(),
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(tab.name);
                    setVisibleContent(tab.content);
                  }}
                  aria-label={`Open tab ${tab.name}`}
                >
                  <span class="d-none d-sm-block">{tab.title}</span>
                  <span class="d-block d-sm-none">{tab.shortTitle || tab.title}</span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>

      <div class="tab-content mt-4">
        <div class="tab-pane fade show active">
          <Show when={visibleContent()} fallback={<NoData>{props.noDataContent}</NoData>}>
            <>{visibleContent()}</>
          </Show>
        </div>
      </div>
    </>
  );
};

export default Tabs;
