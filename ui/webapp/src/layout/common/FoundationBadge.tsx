import { FOUNDATION } from '../../data';

interface Props {
  class?: string;
}
const FoundationBadge = (props: Props) => {
  const foundation = FOUNDATION;

  return (
    <div title={foundation} class={`badge rounded-0 bg-primary ${props.class}`}>
      {foundation}
    </div>
  );
};

export default FoundationBadge;
