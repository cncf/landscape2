import { Show } from 'solid-js';
import { css, styled } from 'solid-styled-components';

import { BaseItem, Size } from '../types';
import getUrl from '../utils/getUrl';
import ExternalLink from './ExternalLink';
import Image from './Image';

interface Props {
  item: BaseItem;
  size: Size;
  borderless: boolean;
  withName: boolean;
  itemNameSize: number;
  withShadow?: boolean;
  class?: string;
  onClick?: () => void;
}

interface ItemProps {
  borderless: boolean;
  withShadow: boolean;
  size: Size;
}

interface ItemNameProps {
  itemNameSize: number;
  borderless: boolean;
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
  background-color: ${(props: ItemProps) => (!props.borderless ? '#fff' : 'transparent')};
`;

const ItemClass = css`
  position: relative;
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

const ButtonClass = css`
  background: transparent;
  padding: 0;
  border: none;
  cursor: pointer;
`;

const ImageClass = css`
  margin: auto;
  font-size: calc(var(--card-size-height) / 1.5);
  max-width: 100%;
  max-height: 100%;
  height: auto;
`;

const ItemName = styled('div')`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: ${(props: ItemNameProps) => (props.itemNameSize < 40 ? `${props.itemNameSize}px` : '40px')};
  line-height: ${(props: ItemNameProps) => (props.itemNameSize < 40 ? `${props.itemNameSize - 2}px` : '38px')};
  padding: ${(props: ItemNameProps) => (!props.borderless ? '0.35rem 0.25rem' : '0.35rem 0')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-top: ${(props: ItemNameProps) => (!props.borderless ? '1px solid rgba(0, 0, 0, 0.175)' : '')};
`;

const GridItem = (props: Props) => {
  return (
    <Item
      class={`${ItemClass} ${props.class}`}
      borderless={props.borderless}
      withShadow={typeof props.withShadow !== 'undefined' && props.withShadow}
      size={props.size}
    >
      <Show
        when={props.onClick !== undefined}
        fallback={
          <ExternalLink
            href={`${getUrl()}?item=${props.item.id}`}
            paddingBottom={props.withName ? props.itemNameSize + 8 : 0}
            class={LinkClass}
          >
            <Image name={props.item.name} class={ImageClass} logo={props.item.logo} />
            <Show when={props.withName}>
              <ItemName borderless={props.borderless} itemNameSize={props.itemNameSize}>
                {props.item.name}
              </ItemName>
            </Show>
          </ExternalLink>
        }
      >
        <button
          onClick={() => props.onClick!()}
          style={{ 'padding-bottom': `${props.withName ? props.itemNameSize + 8 : 0}px` }}
          class={`${LinkClass} ${ButtonClass}`}
        >
          <Image name={props.item.name} class={ImageClass} logo={props.item.logo} />
          <Show when={props.withName}>
            <ItemName borderless={props.borderless} itemNameSize={props.itemNameSize}>
              {props.item.name}
            </ItemName>
          </Show>
        </button>
      </Show>
    </Item>
  );
};

export default GridItem;
