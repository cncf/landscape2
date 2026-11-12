import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { cx } from '../utils/cx';

interface Props {
  class?: string;
  legend?: string;
  legendClass?: string;
  spinnerClass?: string;
  transparentBg?: boolean;
}

const Wrapper = css`
  background-color: rgba(255, 255, 255, 0.5);
  z-index: 100;
`;

const TransparentBg = css`
  background-color: transparent;
`;

const Wave = css`
  height: 50px;
  width: 50px;
  margin-left: -25px;
  margin-top: -25px;
  border-radius: 50%;
  display: inline-block;
  position: relative;

  &:before,
  &:after {
    content: '';
    border: 2px solid var(--color2);
    border-radius: 50%;
    width: 50px;
    height: 50px;
    position: absolute;
    left: 0px;
    right: 0px;
  }

  &:before {
    transform: scale(1, 1);
    opacity: 1;
    animation: spWaveBe 0.6s infinite linear;
  }

  &:after {
    transform: scale(0, 0);
    opacity: 0;
    animation: spWaveAf 0.6s infinite linear;
  }

  @keyframes spWaveAf {
    from {
      transform: scale(0.5, 0.5);
      opacity: 0;
    }
    to {
      transform: scale(1, 1);
      opacity: 1;
    }
  }

  @keyframes spWaveBe {
    from {
      transform: scale(1, 1);
      opacity: 1;
    }
    to {
      transform: scale(1.5, 1.5);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    @keyframes spWaveAf {
      from {
        transform: scale(0.5, 0.5);
        opacity: 1;
      }
      to {
        transform: scale(0.5, 0.5);
        opacity: 0;
      }
    }

    @keyframes spWaveBe {
      from {
        transform: none;
        opacity: 0;
      }
      to {
        transform: none;
        opacity: 1;
      }
    }

    &:before {
      animation: spWaveBe 2.6s infinite linear;
    }

    &:after {
      animation: spWaveAf 2.6s infinite linear;
    }
  }
`;

/** Spinner covering its positioned parent, announced as a "Loading..." status, with an optional visible legend. */
export const Loading = (props: Props) => (
  <div
    class={cx('top-0 bottom-0 start-0 end-0 position-absolute p-5', Wrapper, props.class)}
    classList={{ [TransparentBg]: !isUndefined(props.transparentBg) && props.transparentBg }}
  >
    <div class="d-flex flex-column justify-content-center w-100 h-100">
      <div class={props.spinnerClass || 'd-flex flex-row align-items-center justify-content-center'}>
        <div class="d-flex justify-content-center">
          <div class={Wave} role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
      <Show when={!isUndefined(props.legend)}>
        <div class={cx('text-center mt-5', props.legendClass)}>{props.legend}</div>
      </Show>
    </div>
  </div>
);
