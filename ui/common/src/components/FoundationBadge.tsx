interface Props {
  foundation: string;
  class?: string;
}

export const FoundationBadge = (props: Props) => {
  return (
    <div title={props.foundation} class={`badge rounded-0 bg-primary ${props.class}`}>
      {props.foundation}
    </div>
  );
};
