import { For, Match, Switch } from 'solid-js';
import { styled } from 'solid-styled-components';

import { BaseItem, Size, Style } from '../types';
import GridItem from './GridItem';

interface Props {
  style: Style;
  size: Size;
  items: BaseItem[];
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

  display: grid;
  grid-template-columns: repeat(auto-fit, var(--card-size-width));
  grid-auto-rows: var(--card-size-height);
  gap: ${(props: GridProps) => CARD_SIZES[props.size].gap};
`;

const StyleView = (props: Props) => {
  return (
    <Switch>
      <Match when={props.style === Style.Basic}>
        <Grid size={props.size}>
          <For each={props.items}>
            {(item: BaseItem) => {
              return <GridItem item={item} size={props.size} borderless />;
            }}
          </For>
        </Grid>
      </Match>
      <Match when={props.style === Style.BorderedBasic}>
        <Grid size={props.size}>
          <For each={props.items}>
            {(item: BaseItem) => {
              return <GridItem item={item} size={props.size} borderless={false} />;
            }}
          </For>
        </Grid>
      </Match>
      <Match when={props.style === Style.ShadowedBasic}>
        <Grid size={props.size}>
          <For each={props.items}>
            {(item: BaseItem) => {
              return <GridItem item={item} size={props.size} borderless={false} withShadow />;
            }}
          </For>
        </Grid>
      </Match>
    </Switch>
  );
};

export default StyleView;
