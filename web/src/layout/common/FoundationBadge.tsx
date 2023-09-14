import { useContext } from 'react';

import { FoundationContext, FoundationProps } from '../context/AppContext';

interface Props {
  className?: string;
}
const FoundationBadge = (props: Props) => {
  const { foundation } = useContext(FoundationContext) as FoundationProps;

  return (
    <div title={foundation} className={`badge rounded-0 bg-primary ${props.className}`}>
      {foundation}
    </div>
  );
};

export default FoundationBadge;
