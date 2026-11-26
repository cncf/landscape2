// Local copy of the common `Loading` component: the common one depends on
// Bootstrap, which the third-party embed deliberately does not load.
import { css, keyframes, styled } from 'solid-styled-components';

interface Props {
  isBgTransparent: boolean;
}

const waveIn = keyframes`
  from {
    transform: scale(0.5, 0.5);
    opacity: 0;
  }
  to {
    transform: scale(1, 1);
    opacity: 1;
  }
`;

const waveOut = keyframes`
  from {
    transform: scale(1, 1);
    opacity: 1;
  }
  to {
    transform: scale(1.5, 1.5);
    opacity: 0;
  }
`;

const WrapperClass = css`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: transparent;
  z-index: 100;
`;

// The ring takes the titles background color (a neutral one when it is transparent)
const Spinner = styled('div')`
  height: 50px;
  width: 50px;
  margin-left: -25px;
  margin-top: -25px;
  border-radius: 50%;
  display: inline-block;
  position: relative;

  &::before,
  &::after {
    content: '';
    border: ${(props: Props) =>
      props.isBgTransparent ? '2px solid rgba(0, 0, 0, 0.25)' : '2px solid var(--bg-color)'};
    border-radius: 50%;
    width: 50px;
    height: 50px;
    position: absolute;
    left: 0;
    right: 0;
  }

  &::before {
    transform: scale(1, 1);
    opacity: 1;
    animation: ${waveOut} 0.6s infinite linear;
  }

  &::after {
    transform: scale(0, 0);
    opacity: 0;
    animation: ${waveIn} 0.6s infinite linear;
  }
`;

const VisuallyHiddenClass = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const Loading = (props: Props) => (
  <div role="status" class={WrapperClass}>
    <Spinner isBgTransparent={props.isBgTransparent} aria-hidden="true" />
    <span class={VisuallyHiddenClass}>Loading…</span>
  </div>
);

export default Loading;
