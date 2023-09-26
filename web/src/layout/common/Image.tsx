import { createSignal } from 'solid-js';

import { SVGIconKind } from '../../types';
import SVGIcon from './SVGIcon';

interface Props {
  name: string;
  logo: string;
  class?: string;
}

const Image = (props: Props) => {
  const [error, setError] = createSignal(false);

  return (
    <>
      {error() ? (
        <SVGIcon kind={SVGIconKind.NotImage} class={`opacity-25 ${props.class}`} />
      ) : (
        <img
          alt={`${props.name} logo`}
          class={props.class}
          src={import.meta.env.MODE === 'development' ? `../../static/${props.logo}` : `${props.logo}`}
          onError={() => setError(true)}
        />
      )}
    </>
  );
};

export default Image;
