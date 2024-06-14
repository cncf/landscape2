import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { Item } from '../types/types';
import { Image } from './Image';

interface Props {
  parentInfo: Item;
  projectName: string;
  class: string;
  mobileVersion: boolean;
  foundation: string;
}

const FieldsetTitle = css`
  font-size: 0.8rem !important;
  line-height: 0.8rem !important;
  color: var(--color4);
  top: -0.35rem;
  left: 1rem;
`;

const LogoWrapper = css`
  height: 50px;
  width: 40px;
  min-width: 40px;
`;

const Logo = css`
  font-size: 3rem;
  max-width: 100%;
  max-height: 100%;
  height: auto;
`;

const ParentTitle = css`
  font-size: 1.15rem;
`;

const Content = css`
  width: calc(100% - 40px - 1rem);
`;

const Legend = css`
  overflow: hidden;
  text-overflow: unset;
  white-space: inherit;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  word-wrap: normal;
  max-height: 38px;
  line-height: 1.15rem;

  @media only screen and (max-width: 991.98px) {
    -webkit-line-clamp: 3;
    max-height: 57px;
  }
`;

export const ParentProject = (props: Props) => {
  const parentInfo = () => props.parentInfo;

  const content = () => (
    <>
      <div class="d-flex flex-row align-items-start">
        <div class={`d-flex justify-content-center ${LogoWrapper}`}>
          <Image name={parentInfo()!.name} class={`m-auto ${Logo}`} logo={parentInfo()!.logo} />
        </div>
        <div class={`ms-3 ${Content}`}>
          <div class={`fw-semibold text-truncate ${ParentTitle}`}>{parentInfo()!.name}</div>
          <div class={Legend}>
            <small class="text-muted">
              {props.projectName} is a subproject of {parentInfo()!.name}
              <Show when={!isUndefined(parentInfo()!.maturity)} fallback={<>.</>}>
                , a {props.foundation} project.
              </Show>
            </small>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <Show when={!isUndefined(parentInfo())}>
      <Show
        when={!isUndefined(props.mobileVersion) && props.mobileVersion}
        fallback={
          <div class={`position-relative border ${props.class}`}>
            <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>Parent project</div>
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
