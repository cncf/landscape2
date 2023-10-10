interface Props {
  class?: string;
}
const FoundationBadge = (props: Props) => {
  const foundation = window.baseDS.foundation;

  return (
    <div title={foundation} class={`badge rounded-0 bg-primary ${props.class}`}>
      {foundation}
    </div>
  );
};

export default FoundationBadge;
