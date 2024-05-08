import { styled } from 'solid-styled-components';

interface Props {
  bgColor: string;
}

const Wrapper = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 3rem;
  background-color: transparent;
  z-index: 100;
`;

const SpinnerWrapper = styled('div')`
  display: flex;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  -webkit-box-pack: center;
  -ms-flex-pack: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

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
    border: 2px solid var(--color2);
    border: ${(props: Props) =>
      props.bgColor === 'transparent' ? '2px solid rgba(0,0,0,0.25)' : `2px solid ${props.bgColor}`};
    border-radius: 50%;
    width: 50px;
    height: 50px;
    position: absolute;
    left: 0px;
    right: 0px;
  }

  &::before {
    -webkit-transform: scale(1, 1);
    -ms-transform: scale(1, 1);
    transform: scale(1, 1);
    opacity: 1;
    -webkit-animation: spWaveBe 0.6s infinite linear;
    animation: spWaveBe 0.6s infinite linear;
  }

  &::after {
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
`;

const Loading = (props: Props) => {
  return (
    <Wrapper>
      <SpinnerWrapper>
        <div>
          <Spinner bgColor={props.bgColor} />
        </div>
      </SpinnerWrapper>
    </Wrapper>
  );
};

export default Loading;
