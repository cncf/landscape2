import isUndefined from 'lodash/isUndefined';
import { createSignal, onMount, Show } from 'solid-js';

import { Item } from '../../../types';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import Image from '../Image';
import styles from './ProjectParent.module.css';

interface Props {
  parent?: string;
  projectName: string;
  class: string;
  mobileVersion: boolean;
}

const ParentProject = (props: Props) => {
  const [parentInfo, setParentInfo] = createSignal<Item>();

  const content = () => (
    <>
      <div class="d-flex flex-row align-items-center">
        <div class={`d-flex align-items-center justify-content-center ${styles.logoWrapper}`}>
          <Image name={parentInfo()!.name} class={`m-auto ${styles.logo}`} logo={parentInfo()!.logo} />
        </div>
        <div class={`ms-3 ${styles.content}`}>
          <div class={`fw-semibold ${styles.parentTitle}`}>{parentInfo()!.name}</div>
          <div class="text-truncate">
            <small class="text-muted">
              {props.projectName} is a subproject of {parentInfo()!.name}
              <Show when={!isUndefined(parentInfo()!.maturity)} fallback={<>.</>}>
                , a {window.baseDS.foundation} project.
              </Show>
            </small>
          </div>
        </div>
      </div>
    </>
  );

  onMount(() => {
    if (!isUndefined(props.parent)) {
      setParentInfo(itemsDataGetter.getItemByName(props.parent));
    }
  });

  return (
    <Show when={!isUndefined(parentInfo())}>
      <Show
        when={!isUndefined(props.mobileVersion) && props.mobileVersion}
        fallback={
          <div class={`position-relative border ${props.class}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Parent project</div>
            {content()}
          </div>
        }
      >
        <div class={`text-uppercase mt-3 fw-semibold border-bottom ${props.class}`}>Parent project</div>
        <div class="position-relative my-2">{content()}</div>
      </Show>
    </Show>
  );
};

export default ParentProject;
