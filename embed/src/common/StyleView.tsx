import { For, Match, Switch } from 'solid-js';
import { css, styled } from 'solid-styled-components';

import { Alignment, BaseItem, Size, Style } from '../types';
import GridItem from './GridItem';

interface Props {
  style: Style;
  size: Size;
  items: BaseItem[];
  alignment: Alignment;
  displayName: boolean;
  itemNameSize: number;
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

const Grid = styled('div')`
  --card-size-width: ${(props: GridProps) => CARD_SIZES[props.size].width};
  --card-size-height: ${(props: GridProps) => CARD_SIZES[props.size].height};

  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${(props: GridProps) =>
    typeof props.spacing !== 'undefined' ? `${props.spacing}px` : CARD_SIZES[props.size].gap};
  justify-content: ${(props: GridProps) => props.alignment};
`;

const ItemClass = css`
  width: var(--card-size-width);
  height: var(--card-size-height);
`;

const StyleView = (props: Props) => {
  return (
    <Switch>
      <Match when={props.style === Style.Basic}>
        <Grid size={props.size} alignment={props.alignment} spacing={props.spacing}>
          <For each={props.items}>
            {(item: BaseItem) => {
              return (
                <GridItem
                  item={item}
                  size={props.size}
                  class={ItemClass}
                  withName={props.displayName}
                  itemNameSize={props.itemNameSize}
                  borderless
                />
              );
            }}
          </For>
        </Grid>
      </Match>
      <Match when={props.style === Style.BorderedBasic}>
        <Grid size={props.size} alignment={props.alignment} spacing={props.spacing}>
          <For each={props.items}>
            {(item: BaseItem) => {
              return (
                <GridItem
                  item={item}
                  size={props.size}
                  class={ItemClass}
                  withName={props.displayName}
                  itemNameSize={props.itemNameSize}
                  borderless={false}
                />
              );
            }}
          </For>
        </Grid>
      </Match>
      <Match when={props.style === Style.ShadowedBasic}>
        <Grid size={props.size} alignment={props.alignment} spacing={props.spacing}>
          <For each={props.items}>
            {(item: BaseItem) => {
              return (
                <GridItem
                  item={item}
                  size={props.size}
                  class={ItemClass}
                  withName={props.displayName}
                  itemNameSize={props.itemNameSize}
                  borderless={false}
                  withShadow
                />
              );
            }}
          </For>
        </Grid>
      </Match>
    </Switch>
  );
};

export default StyleView;
