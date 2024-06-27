import '../styles/App.css';

import { createEffect, createSignal, For, Match, on, Switch } from 'solid-js';
import { css, styled } from 'solid-styled-components';

import { Alignment, BaseItem, Size, Style } from '../types';
import itemsDataGetter from '../utils/itemsDataGetter';
import CardItem from './CardItem';
import GridItem from './GridItem';
import ItemModal from './ItemModal';

interface Props {
  key: string;
  basePath: string;
  style: Style;
  size: Size;
  foundation: string;
  items: BaseItem[];
  alignment: Alignment;
  displayName: boolean;
  itemNameSize: number;
  spacing?: number;
  displayItemModal: boolean;
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

const CardWrapper = css`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -12px;
  margin-top: -24px;
  width: calc(100% + 24px);
  overflow: hidden;
`;

const StyleView = (props: Props) => {
  const [activeItemId, setActiveItemId] = createSignal<string | null>(null);
  const [fullDataReady, setFullDataReady] = createSignal(itemsDataGetter.isReady());
  const [itemInfo, setItemInfo] = createSignal<BaseItem | null | undefined>(undefined);

  createEffect(() => {
    itemsDataGetter.subscribe({
      updateStatus: (currentStatus: boolean) => {
        setFullDataReady(currentStatus);
      },
    });
  });

  createEffect(
    on(fullDataReady, () => {
      if (fullDataReady() && activeItemId() !== null) {
        setItemInfo(itemsDataGetter.getItemById(activeItemId()!));
      }
    })
  );

  createEffect(
    on(activeItemId, () => {
      if (activeItemId() !== null) {
        if (!fullDataReady()) {
          itemsDataGetter.init(props.key, props.basePath);
        } else {
          setItemInfo(itemsDataGetter.getItemById(activeItemId()!));
        }
      }
    })
  );

  return (
    <>
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
                    onClick={props.displayItemModal ? () => setActiveItemId(item.id) : undefined}
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
                    onClick={props.displayItemModal ? () => setActiveItemId(item.id) : undefined}
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
                    onClick={props.displayItemModal ? () => setActiveItemId(item.id) : undefined}
                    withShadow
                  />
                );
              }}
            </For>
          </Grid>
        </Match>
        <Match when={props.style === Style.Card}>
          <div class={CardWrapper}>
            <For each={props.items}>
              {(item: BaseItem) => {
                return (
                  <CardItem
                    item={item}
                    foundation={props.foundation}
                    onClick={props.displayItemModal ? () => setActiveItemId(item.id) : undefined}
                  />
                );
              }}
            </For>
          </div>
        </Match>
      </Switch>
      <ItemModal
        foundation={props.foundation}
        activeItemId={activeItemId()}
        itemInfo={itemInfo()}
        onClose={() => setActiveItemId(null)}
      />
    </>
  );
};

export default StyleView;
