import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';
import { createEffect, createSignal, For, on, Show } from 'solid-js';

import { FilterOption, Item, Option } from '../../types';
import itemsDataGetter, { LogosOptionsGroup } from '../../utils/itemsDataGetter';
import Image from '../common/Image';
import Loading from '../common/Loading';
import Footer from '../navigation/Footer';
import { useFullDataReady } from '../stores/fullData';
import styles from './Logos.module.css';

const Logos = () => {
  const fullDataReady = useFullDataReady();
  const [options, setOptions] = createSignal<LogosOptionsGroup[]>();
  const [selectedGroup, setSelectedGroup] = createSignal<number>();
  const [selectedOptionValue, setSelectedOptionValue] = createSignal<string>();
  const [selectedSuboptionValue, setSelectedSuboptionValue] = createSignal<string>();
  const [suboptions, setSuboptions] = createSignal<Option[]>();
  const [items, setItems] = createSignal<Item[]>();

  const cleanDuplicatedItems = (itemsList: Item[]): Item[] => {
    const result: Item[] = [];
    const images: string[] = [];
    const sortedItems = orderBy(itemsList, [(item: Item) => item.name.toLowerCase().toString()], 'asc');

    sortedItems.forEach((i: Item) => {
      // Avoid duplicates checking images
      if (!images.includes(i.logo)) {
        result.push(i);
        images.push(i.logo);
      }
    });

    return result;
  };

  const filterItems = () => {
    let list: Item[] = [];
    if (!isUndefined(selectedGroup())) {
      switch (selectedGroup()) {
        case 0:
          if (!isUndefined(selectedOptionValue())) {
            list = itemsDataGetter.filterItemsByMaturity(selectedOptionValue()!) || [];
          }
          break;
        case 1:
          if (!isUndefined(selectedOptionValue()) && !isUndefined(selectedSuboptionValue())) {
            list =
              itemsDataGetter.filterItemsBySection({
                category: selectedOptionValue()!,
                subcategory: selectedSuboptionValue()!,
              }) || [];
          }
          break;

        default:
          break;
      }
    }
    setItems(cleanDuplicatedItems(list));
  };

  const getTitle = (selectPosition: number): string => {
    if (selectPosition === 1) {
      if (selectedGroup() === 0) {
        return 'Maturity';
      } else {
        return 'Category';
      }
    } else {
      return 'Subcategory';
    }
  };

  createEffect(
    on(fullDataReady, () => {
      if (fullDataReady()) {
        const optionsTmp = itemsDataGetter.prepareLogosOptions();
        setOptions(optionsTmp);
        setSelectedGroup(optionsTmp[0].id);
      }
    })
  );

  return (
    <>
      <main class="flex-grow-1 container-fluid px-3 px-lg-4 mainPadding position-relative">
        <div class="d-flex flex-column my-2 my-md-3 py-1">
          <div class="fs-4 fw-semibold text-primary text-uppercase border-bottom mb-4">Logos preview</div>

          <div class="position-relative mt-3">
            <Show when={!isUndefined(options())} fallback={<Loading />}>
              <div class="d-flex flex-column">
                <div class="d-flex flex-row">
                  <For each={options()}>
                    {(option) => (
                      <div class="form-check form-check-inline">
                        <input
                          class={`form-check-input ${styles.radio}`}
                          type="radio"
                          name="logosOptions"
                          id={option.name}
                          onInput={() => {
                            setSelectedGroup(option.id);
                            setSelectedOptionValue();
                            setSelectedSuboptionValue();
                            setSuboptions();
                            setItems();
                          }}
                          value={option.name}
                          checked={option.id === selectedGroup()}
                        />
                        <label class="form-check-label" for={option.name}>
                          By {option.name}
                        </label>
                      </div>
                    )}
                  </For>
                </div>
                <Show when={!isUndefined(selectedGroup())}>
                  <div class="row g-4 mt-0">
                    <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                      <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>
                        {getTitle(1)}
                      </div>
                      <select
                        class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                        value={selectedOptionValue()}
                        aria-label="Options"
                        onChange={(e) => {
                          setSelectedOptionValue(e.currentTarget.value);
                          setSelectedSuboptionValue();
                          setSuboptions();
                          setItems();
                          const selectedOption = options()![selectedGroup()!].options.find((opt: FilterOption) => {
                            return opt.value === e.currentTarget.value;
                          });
                          if (!isUndefined(selectedOption) && !isUndefined(selectedOption.suboptions)) {
                            setSuboptions(selectedOption.suboptions!);
                          } else {
                            filterItems();
                          }
                        }}
                      >
                        <option value="" />
                        <For each={options()![selectedGroup()!].options}>
                          {(opt: FilterOption) => {
                            return <option value={opt.value}>{opt.name}</option>;
                          }}
                        </For>
                      </select>
                    </div>
                    <Show when={selectedGroup() === 1}>
                      <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                        <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>
                          {getTitle(2)}
                        </div>
                        <select
                          class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                          value={selectedSuboptionValue()}
                          aria-label="Suboptions"
                          onChange={(e) => {
                            setSelectedSuboptionValue(e.currentTarget.value);
                            setItems();
                            filterItems();
                          }}
                          disabled={isUndefined(suboptions())}
                        >
                          <option value="" />
                          <Show when={!isUndefined(suboptions())}>
                            <For each={suboptions()}>
                              {(opt: Option) => {
                                return <option value={opt.value}>{opt.name}</option>;
                              }}
                            </For>
                          </Show>
                        </select>
                      </div>
                    </Show>
                  </div>
                </Show>
                <div class="position-relative mt-5">
                  <Show when={!isUndefined(items())}>
                    <div class={styles.grid}>
                      <For each={items()}>
                        {(item) => {
                          return (
                            <div class="d-flex align-items-center justify-content-center">
                              <Image name={item.name} class={`m-auto ${styles.logo}`} logo={item.logo} />
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </main>
      <Footer logo={window.baseDS.images.footer_logo} />
    </>
  );
};

export default Logos;
