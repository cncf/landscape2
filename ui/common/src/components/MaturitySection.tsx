import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { Item } from '../types/types';

interface Props {
  item: Item;
  class: string;
}

const Wrapper = css`
  .incubatingLine::after {
    right: 50%;
  }

  .sandboxLine::after {
    display: none;
  }
`;

const FieldsetTitle = css`
  font-size: 0.8rem !important;
  line-height: 0.8rem !important;
  color: var(--color4);
  top: -0.35rem;
  left: 1rem;
`;

const MaturityBadge = css`
  width: 100px;
  background-color: var(--bs-gray-500);
`;

const ActiveMaturityBadge = css`
  position: relative;
  background-color: var(--color-stats-1) !important;
`;

const StatusLegend = css`
  font-size: 0.7rem;
`;

const Line = css`
  &::after {
    position: absolute;
    content: '';
    top: 0.7rem;
    left: 0;
    right: 0;
    height: 4px;
    background-color: var(--color-stats-1);
    z-index: -1;
  }

  &::before {
    position: absolute;
    content: '';
    top: 0.7rem;
    left: 0;
    right: 0;
    height: 4px;
    background-color: var(--bs-gray-200);
    z-index: -1;
  }
`;

export const MaturitySection = (props: Props) => {
  return (
    <Show
      when={
        !isUndefined(props.item.maturity) &&
        ['sandbox', 'incubating', 'graduated'].includes(props.item.maturity) &&
        (!isUndefined(props.item.accepted_at) ||
          !isUndefined(props.item.incubating_at) ||
          !isUndefined(props.item.graduated_at))
      }
    >
      <div class={`position-relative border ${Wrapper} ${props.class}`}>
        <div class={`position-absolute px-2 bg-white fw-semibold ${FieldsetTitle}`}>Maturity</div>

        <div class="position-relative mt-2">
          <div class="d-flex flex-row justify-content-between">
            <div class="d-flex flex-column align-items-center">
              <div class={`badge rounded-0 p-2 ${MaturityBadge} ${ActiveMaturityBadge}`}>
                <Show when={props.item.accepted_at} fallback={'-'}>
                  <>
                    {props.item.accepted_at === props.item.incubating_at ||
                    props.item.accepted_at === props.item.graduated_at
                      ? '-'
                      : props.item.accepted_at}
                  </>
                </Show>
              </div>
              <small class={`text-uppercase fw-semibold text-muted mt-2 ${StatusLegend}`}>Sandbox</small>
            </div>

            <div class="d-flex flex-column align-items-center">
              <div
                class={`badge rounded-0 p-2 ${MaturityBadge}`}
                classList={{
                  [ActiveMaturityBadge]: ['incubating', 'graduated', 'archived'].includes(props.item.maturity!),
                }}
              >
                {props.item.incubating_at || '-'}
              </div>
              <small class={`text-uppercase fw-semibold text-muted mt-2 ${StatusLegend}`}>Incubating</small>
            </div>

            <div class="d-flex flex-column align-items-center">
              <div
                class={`badge rounded-0 p-2 ${MaturityBadge}`}
                classList={{
                  [ActiveMaturityBadge]: ['graduated', 'archived'].includes(props.item.maturity!),
                }}
              >
                {props.item.graduated_at || '-'}
              </div>
              <small class={`text-uppercase fw-semibold text-muted mt-2 ${StatusLegend}`}>Graduated</small>
            </div>
          </div>
          <div class={`${Line} ${props.item.maturity}Line`} />
        </div>
      </div>
    </Show>
  );
};
