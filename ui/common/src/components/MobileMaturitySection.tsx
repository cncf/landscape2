import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { Item } from '../types/types';

interface Props {
  item: Item;
  titleClass: string;
}

const Wrapper = css`
  .incubatingLine::after {
    right: 50%;
  }

  .sandboxLine::after {
    display: none;
  }
`;

const MaturityBadge = css`
  width: 80px;
  font-size: 0.65rem !important;
  line-height: 1rem !important;
  background-color: var(--bs-gray-500);
`;

const ActiveMaturityBadge = css`
  position: relative;
  background-color: var(--color-stats-1) !important;
`;

const StatusLegend = css`
  font-size: 0.6rem;
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

export const MobileMaturitySection = (props: Props) => {
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
      <div class={`text-uppercase mt-3 fw-semibold border-bottom ${props.titleClass}`}>Maturity</div>

      <div class={`position-relative my-2 ${Wrapper}`}>
        <div class="d-flex flex-row justify-content-between">
          <div class="d-flex flex-column align-items-center">
            <div class={`badge rounded-0 ${MaturityBadge} ${ActiveMaturityBadge}`}>
              <Show when={props.item.accepted_at} fallback={'-'}>
                <>
                  {props.item.accepted_at === props.item.incubating_at ||
                  props.item.accepted_at === props.item.graduated_at
                    ? '-'
                    : props.item.accepted_at}
                </>
              </Show>
            </div>
            <small class={`text-uppercase fw-semibold text-muted mt-1 ${StatusLegend}`}>Sandbox</small>
          </div>

          <div class="d-flex flex-column align-items-center">
            <div
              class={`badge rounded-0 ${MaturityBadge}`}
              classList={{
                [ActiveMaturityBadge]: ['incubating', 'graduated', 'archived'].includes(props.item.maturity!),
              }}
            >
              {props.item.incubating_at || '-'}
            </div>
            <small class={`text-uppercase fw-semibold text-muted mt-1 ${StatusLegend}`}>Incubating</small>
          </div>

          <div class="d-flex flex-column align-items-center">
            <div
              class={`badge rounded-0 ${MaturityBadge}`}
              classList={{
                [ActiveMaturityBadge]: ['graduated', 'archived'].includes(props.item.maturity!),
              }}
            >
              {props.item.graduated_at || '-'}
            </div>
            <small class={`text-uppercase fw-semibold text-muted mt-1 ${StatusLegend}`}>Graduated</small>
          </div>
        </div>
        <div class={`${Line} ${props.item.maturity}Line`} />
      </div>
    </Show>
  );
};
