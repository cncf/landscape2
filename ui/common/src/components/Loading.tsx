import isUndefined from 'lodash/isUndefined';
import { JSXElement, Show } from 'solid-js';
import { css } from 'solid-styled-components';

interface Props {
  class?: string;
  spinnerClass?: string;
  smallSize?: boolean;
  position?: 'fixed' | 'absolute' | 'relative';
  transparentBg?: boolean;
  noWrapper?: boolean;
  legend?: string;
  legendClass?: string;
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
    -webkit-transform: scale(1, 1);
    -ms-transform: scale(1, 1);
    transform: scale(1, 1);
    opacity: 1;
    -webkit-animation: spWaveBe 0.6s infinite linear;
    animation: spWaveBe 0.6s infinite linear;
  }

  &:after {
    -webkit-transform: scale(0, 0);
    -ms-transform: scale(0, 0);
    transform: scale(0, 0);
    opacity: 0;
    -webkit-animation: spWaveAf 0.6s infinite linear;
    animation: spWaveAf 0.6s infinite linear;
  }

  @-webkit-keyframes spWaveAf {
    from {
      -webkit-transform: scale(0.5, 0.5);
      transform: scale(0.5, 0.5);
      opacity: 0;
    }
    to {
      -webkit-transform: scale(1, 1);
      transform: scale(1, 1);
      opacity: 1;
    }
  }
  @keyframes spWaveAf {
    from {
      -webkit-transform: scale(0.5, 0.5);
      transform: scale(0.5, 0.5);
      opacity: 0;
    }
    to {
      -webkit-transform: scale(1, 1);
      transform: scale(1, 1);
      opacity: 1;
    }
  }

  @-webkit-keyframes spWaveBe {
    from {
      -webkit-transform: scale(1, 1);
      transform: scale(1, 1);
      opacity: 1;
    }
    to {
      -webkit-transform: scale(1.5, 1.5);
      transform: scale(1.5, 1.5);
      opacity: 0;
    }
  }
  @keyframes spWaveBe {
    from {
      -webkit-transform: scale(1, 1);
      transform: scale(1, 1);
      opacity: 1;
    }
    to {
      -webkit-transform: scale(1.5, 1.5);
      transform: scale(1.5, 1.5);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    @-webkit-keyframes spWaveAf {
      from {
        -webkit-transform: scale(0.5, 0.5);
        transform: scale(0.5, 0.5);
        opacity: 1;
      }
      to {
        -webkit-transform: scale(0.5, 0.5);
        transform: scale(0.5, 0.5);
        opacity: 0;
      }
    }

    @keyframes spWaveAf {
      from {
        -webkit-transform: scale(0.5, 0.5);
        transform: scale(0.5, 0.5);
        opacity: 1;
      }
      to {
        -webkit-transform: scale(0.5, 0.5);
        transform: scale(0.5, 0.5);
        opacity: 0;
      }
    }

    @-webkit-keyframes spWaveBe {
      from {
        -webkit-transform: none;
        transform: none;
        opacity: 0;
      }
      to {
        -webkit-transform: none;
        transform: none;
        opacity: 1;
      }
    }

    @keyframes spWaveBe {
      from {
        -webkit-transform: none;
        transform: none;
        opacity: 0;
      }
      to {
        -webkit-transform: none;
        transform: none;
        opacity: 1;
      }
    }

    &:before {
      -webkit-animation: spWaveBe 2.6s infinite linear;
      animation: spWaveBe 2.6s infinite linear;
    }

    &:after {
      -webkit-animation: spWaveAf 2.6s infinite linear;
      animation: spWaveAf 2.6s infinite linear;
    }
  }
`;

const MiniWave = css`
  height: 12px;
  width: 12px;

  &:before,
  &:after {
    width: 12px;
    height: 12px;
    border-width: 1px;
  }
`;

export const Loading = (props: Props) => {
  const getSpinner = (): JSXElement => {
    return (
      <div class="d-flex justify-content-center">
        <div
          class={`${Wave} ${props.spinnerClass}`}
          classList={{ [MiniWave]: !isUndefined(props.smallSize) && props.smallSize }}
          role="status"
        >
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  };

  return (
    <Show when={isUndefined(props.noWrapper) || !props.noWrapper} fallback={<>{getSpinner()}</>}>
      <div
        class={`top-0 bottom-0 start-0 end-0 position-absolute position-${props.position || 'absolute'} ${Wrapper} ${
          props.class
        }`}
        classList={{
          'p-5': isUndefined(props.smallSize) || !props.smallSize,
          [TransparentBg]: !isUndefined(props.transparentBg) && props.transparentBg,
        }}
      >
        <div class="d-flex flex-column justify-content-center w-100 h-100">
          <div class={props.spinnerClass || 'd-flex flex-row align-items-center justify-content-center'}>
            {getSpinner()}
          </div>
          <Show when={!isUndefined(props.legend)}>
            <div class={`text-center mt-5 ${props.legendClass}`}>{props.legend}</div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
