import { css, styled } from 'solid-styled-components';

import { BaseItem, Size } from '../types';
import getUrl from '../utils/getUrl';
import ExternalLink from './ExternalLink';
import Image from './Image';

interface Props {
  item: BaseItem;
  size: Size;
  borderless: boolean;
  withShadow?: boolean;
  class?: string;
}

interface ItemProps {
  borderless: boolean;
  withShadow: boolean;
  size: Size;
}

type PaddingSize = {
  [key in Size]: string;
};

const PADDINGS_SIZES: PaddingSize = {
  [Size.XSmall]: '0.25rem',
  [Size.Small]: '0.35rem',
  [Size.Medium]: '0.5rem',
  [Size.Large]: '0.75rem',
  [Size.XLarge]: '1rem',
};

const Item = styled('div')`
  border: ${(props: ItemProps) => (!props.borderless ? '1px solid rgba(0, 0, 0, 0.175)' : '')};
  box-shadow: ${(props: ItemProps) => (props.withShadow ? '0 .125rem .25rem rgba(0,0,0,.075)' : 'none')};
  padding: ${(props: ItemProps) => PADDINGS_SIZES[props.size]};
`;

const ItemClass = css`
  display: flex;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  -webkit-box-pack: center;
  -ms-flex-pack: center;
  justify-content: center;
`;

const LinkClass = css`
  width: 100%;
  height: 100%;
  display: flex;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  -webkit-box-pack: center;
  -ms-flex-pack: center;
  justify-content: center;
`;

const ImageClass = css`
  margin: auto;
  font-size: calc(var(--card-size-height) / 1.5);
  width: 100%;
  max-height: 100%;
  height: auto;
`;

const GridItem = (props: Props) => {
  return (
    <Item
      class={`${ItemClass} ${props.class}`}
      borderless={props.borderless}
      withShadow={typeof props.withShadow !== 'undefined' && props.withShadow}
      size={props.size}
    >
      <ExternalLink href={`${getUrl()}?item=${props.item.id}`} class={LinkClass}>
        <Image name={props.item.name} class={ImageClass} logo={props.item.logo} />
      </ExternalLink>
    </Item>
  );
};

export default GridItem;
