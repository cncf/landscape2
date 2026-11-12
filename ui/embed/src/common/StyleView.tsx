import { Alignment, Size, Style } from 'common/embed';
import type { EmbedItem } from 'common/types';
import { For, Show } from 'solid-js';
import { css, styled } from 'solid-styled-components';

import CardItem from './CardItem';
import GridItem from './GridItem';

interface Props {
  alignment: Alignment;
  displayName: boolean;
  foundation: string;
  itemNameSize: number;
  items: EmbedItem[];
  size: Size;
  style: Style;
  // Shows the details of an item in the item modal (items link to the landscape without it)
  onItemClick?: (itemId: string) => void;
  spacing?: number;
}

type CardSizes = {
  [key in Size]: {
    width: string;
    height: string;
    gap: string;
  };
};

interface GridProps {
  size: Size;
  alignment: Alignment;
  spacing?: number;
}

const CARD_SIZES: CardSizes = {
  [Size.XSmall]: {
    width: '55px',
    height: '50px',
    gap: '5px',
  },
  [Size.Small]: {
    width: '77px',
    height: '70px',
    gap: '8px',
  },
  [Size.Medium]: {
    width: '110px',
    height: '100px',
    gap: '10px',
  },
  [Size.Large]: {
    width: '143px',
    height: '130px',
    gap: '12px',
  },
  [Size.XLarge]: {
    width: '220px',
    height: '200px',
    gap: '15px',
  },
};

const MOBILE_CARD_SIZES: CardSizes = {
  [Size.XSmall]: {
    width: '40px',
    height: '36px',
    gap: '3px',
  },
  [Size.Small]: {
    width: '50px',
    height: '45px',
    gap: '5px',
  },
  [Size.Medium]: {
    width: '70px',
    height: '63px',
    gap: '7px',
  },
  [Size.Large]: {
    width: '90px',
    height: '81px',
    gap: '10px',
  },
  [Size.XLarge]: {
    width: '105px',
    height: '94px',
    gap: '12px',
  },
};

const Grid = styled('div')`
  --card-size-width: ${(props: GridProps) => CARD_SIZES[props.size].width};
  --card-size-height: ${(props: GridProps) => CARD_SIZES[props.size].height};

  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${(props: GridProps) =>
    typeof props.spacing !== 'undefined' ? `${props.spacing}px` : CARD_SIZES[props.size].gap};
  justify-content: ${(props: GridProps) => props.alignment};

  @media only screen and (max-width: 767.98px) {
    --card-size-width: ${(props: GridProps) => MOBILE_CARD_SIZES[props.size].width};
    --card-size-height: ${(props: GridProps) => MOBILE_CARD_SIZES[props.size].height};
    gap: ${(props: GridProps) =>
      typeof props.spacing !== 'undefined' ? `${props.spacing}px` : MOBILE_CARD_SIZES[props.size].gap};
  }
`;

const ItemClass = css`
  width: var(--card-size-width);
  height: var(--card-size-height);
`;

const CardWrapper = css`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -12px;
  margin-top: -24px;
  width: calc(100% + 24px);
  overflow: hidden;
`;

const StyleView = (props: Props) => {
  return (
    <Show
      when={props.style === Style.Card}
      fallback={
        <Grid size={props.size} alignment={props.alignment} spacing={props.spacing}>
          <For each={props.items}>
            {(item) => (
              <GridItem
                item={item}
                size={props.size}
                class={ItemClass}
                withName={props.displayName}
                itemNameSize={props.itemNameSize}
                onClick={props.onItemClick ? () => props.onItemClick?.(item.id) : undefined}
                borderless={props.style === Style.Basic}
                withShadow={props.style === Style.ShadowedBasic}
              />
            )}
          </For>
        </Grid>
      }
    >
      <div class={CardWrapper}>
        <For each={props.items}>
          {(item) => (
            <CardItem
              item={item}
              foundation={props.foundation}
              onClick={props.onItemClick ? () => props.onItemClick?.(item.id) : undefined}
            />
          )}
        </For>
      </div>
    </Show>
  );
};

export default StyleView;
