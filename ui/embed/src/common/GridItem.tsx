import { Size } from 'common/embed';
import type { EmbedItem } from 'common/types';
import { cx } from 'common/utils';
import { Show } from 'solid-js';
import { css, styled } from 'solid-styled-components';

import getUrl from '../utils/getUrl';
import ExternalLink from './ExternalLink';
import Image from './Image';

interface Props {
  borderless: boolean;
  item: EmbedItem;
  itemNameSize: number;
  size: Size;
  withName: boolean;
  class?: string;
  onClick?: () => void;
  withShadow?: boolean;
}

interface ItemProps {
  borderless: boolean;
  size: Size;
  withShadow: boolean;
}

interface ItemNameProps {
  borderless: boolean;
  itemNameSize: number;
}

const BORDER = '1px solid rgba(0, 0, 0, 0.175)';

const PADDINGS_SIZES: Record<Size, string> = {
  [Size.XSmall]: '0.25rem',
  [Size.Small]: '0.35rem',
  [Size.Medium]: '0.5rem',
  [Size.Large]: '0.75rem',
  [Size.XLarge]: '1rem',
};

const Item = styled('div')`
  border: ${(props: ItemProps) => (props.borderless ? 'none' : BORDER)};
  box-shadow: ${(props: ItemProps) => (props.withShadow ? '0 .125rem .25rem rgba(0,0,0,.075)' : 'none')};
  padding: ${(props: ItemProps) => PADDINGS_SIZES[props.size]};
  background-color: ${(props: ItemProps) => (props.borderless ? 'transparent' : '#fff')};
`;

const ItemClass = css`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LinkClass = css`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
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
  max-width: 100%;
  max-height: 100%;
  height: auto;
`;

// The item name size is limited to 10-40px by the embed config
const ItemName = styled('div')`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: ${(props: ItemNameProps) => `${props.itemNameSize}px`};
  line-height: ${(props: ItemNameProps) => `${props.itemNameSize - 2}px`};
  padding: ${(props: ItemNameProps) => (props.borderless ? '0.35rem 0' : '0.35rem 0.25rem')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-top: ${(props: ItemNameProps) => (props.borderless ? 'none' : BORDER)};
`;

const GridItem = (props: Props) => {
  const paddingBottom = () => (props.withName ? props.itemNameSize + 8 : 0);
  const content = () => (
    <>
      <Image name={props.item.name} class={ImageClass} logo={props.item.logo} size={props.size} />
      <Show when={props.withName}>
        <ItemName borderless={props.borderless} itemNameSize={props.itemNameSize}>
          {props.item.name}
        </ItemName>
      </Show>
    </>
  );

  return (
    <Item
      class={cx(ItemClass, props.class)}
      borderless={props.borderless}
      withShadow={props.withShadow ?? false}
      size={props.size}
    >
      <Show
        when={props.onClick !== undefined}
        fallback={
          <ExternalLink
            href={`${getUrl()}?item=${props.item.id}`}
            paddingBottom={paddingBottom()}
            class={LinkClass}
            label={`${props.item.name} details`}
          >
            {content()}
          </ExternalLink>
        }
      >
        <button
          onClick={() => props.onClick?.()}
          style={{ 'padding-bottom': `${paddingBottom()}px` }}
          class={cx(LinkClass, ButtonClass)}
          aria-label={`${props.item.name} info`}
        >
          {content()}
        </button>
      </Show>
    </Item>
  );
};

export default GridItem;
