import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import type { Item } from '../../types/datasets';
import { Image } from '../Image';
import { Section } from './Section';
import type { SectionVariant } from './styles';

interface Props {
  foundation: string;
  parentName: string;
  projectName: string;
  variant: SectionVariant;
  parentInfo?: Item;
}

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
  line-clamp: 2;
  word-wrap: normal;
  max-height: 38px;
  line-height: 1.15rem;

  @media only screen and (max-width: 991.98px) {
    -webkit-line-clamp: 3;
    line-clamp: 3;
    max-height: 57px;
  }
`;

/**
 * Parent project of a subproject. With the parent item it shows its logo and name; with the name only,
 * just the subproject sentence.
 */
export const ParentProject = (props: Props) => (
  <Section title="Parent project" variant={props.variant}>
    <div class={props.variant === 'mobile' ? 'position-relative my-2' : undefined}>
      <Show
        when={props.parentInfo}
        fallback={
          <small class="text-muted">
            {props.projectName} is a subproject of {props.parentName}.
          </small>
        }
      >
        {(parentInfo) => (
          <div class="d-flex flex-row align-items-start">
            <div class={`d-flex justify-content-center ${LogoWrapper}`}>
              <Image name={parentInfo().name} class={`m-auto ${Logo}`} logo={parentInfo().logo} />
            </div>
            <div class={`ms-3 ${Content}`}>
              <div class={`fw-semibold text-truncate ${ParentTitle}`}>{parentInfo().name}</div>
              <div class={Legend}>
                <small class="text-muted">
                  {props.projectName} is a subproject of {parentInfo().name}
                  <Show when={parentInfo().maturity !== undefined} fallback=".">
                    , a {props.foundation} project.
                  </Show>
                </small>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  </Section>
);
