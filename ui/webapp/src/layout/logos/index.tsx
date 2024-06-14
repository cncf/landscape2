import { Image, Loading } from 'common';
import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';
import { createEffect, createSignal, For, on, Show } from 'solid-js';

import { FilterOption, Item, Option } from '../../types';
import itemsDataGetter, { LogosOptionsGroup, LogosPreviewOptions } from '../../utils/itemsDataGetter';
import Footer from '../navigation/Footer';
import { useFullDataReady } from '../stores/fullData';
import styles from './Logos.module.css';

const Logos = () => {
  const fullDataReady = useFullDataReady();
  const [options, setOptions] = createSignal<LogosOptionsGroup[]>();
  const [selectedGroup, setSelectedGroup] = createSignal<string>();
  const [selectedOptionValue, setSelectedOptionValue] = createSignal<string>();
  const [selectedSuboptionValue, setSelectedSuboptionValue] = createSignal<string>();
  const [suboptions, setSuboptions] = createSignal<Option[]>();
  const [items, setItems] = createSignal<Item[]>();
  const [hiddenNonPublicOrgs, setHiddenNonPublicOrgs] = createSignal<boolean>(false);

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

  const cleanItems = (itemsList: Item[]): Item[] => {
    let result = cleanDuplicatedItems(itemsList);

    const items = cleanDuplicatedItems(itemsList);
    if (hiddenNonPublicOrgs()) {
      const nonPublicOrgs = items.filter((item) => !item.name.startsWith('Non-Public Organization'));
      result = nonPublicOrgs;
    }

    return result;
  };

  const filterItems = () => {
    let list: Item[] = [];
    if (!isUndefined(selectedGroup())) {
      switch (selectedGroup()) {
        case LogosPreviewOptions.Maturity:
          if (!isUndefined(selectedOptionValue())) {
            list = itemsDataGetter.getItemsByMaturity(selectedOptionValue()!) || [];
          }
          break;

        case LogosPreviewOptions.Categories:
          if (!isUndefined(selectedOptionValue()) && !isUndefined(selectedSuboptionValue())) {
            list =
              itemsDataGetter.getItemsBySection({
                category: selectedOptionValue()!,
                subcategory: selectedSuboptionValue()!,
              }) || [];
          }
          break;

        case LogosPreviewOptions.Other:
          if (!isUndefined(selectedOptionValue())) {
            switch (selectedOptionValue()) {
              case 'enduser':
                list = itemsDataGetter.getItemsByEndUser() || [];
                break;

              default:
                break;
            }
          }
          break;

        default:
          break;
      }
    }
    setItems(cleanItems(list));
  };

  const getOptions = (): FilterOption[] => {
    const selectedOption = options()!.find((opt: LogosOptionsGroup) => opt.id === selectedGroup());
    return selectedOption!.options;
  };

  const getTitle = (selectPosition: number): string => {
    if (selectPosition === 1) {
      switch (selectedGroup()) {
        case LogosPreviewOptions.Maturity:
          return 'Maturity';

        case LogosPreviewOptions.Categories:
          return 'Category';

        default:
          return 'Options';
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

  createEffect(
    on(hiddenNonPublicOrgs, () => {
      if (!isUndefined(items())) {
        filterItems();
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
                <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>
                  Select items to display
                </div>

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
                          <Show when={option.id !== LogosPreviewOptions.Other} fallback={option.name}>
                            By {option.name}
                          </Show>
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
                        id="options"
                        class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                        value={selectedOptionValue()}
                        aria-label="Options"
                        onChange={(e) => {
                          setSelectedOptionValue(e.currentTarget.value);
                          setSelectedSuboptionValue();
                          setSuboptions();
                          setItems();
                          const selectedOption = getOptions().find((opt: FilterOption) => {
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
                        <For each={getOptions()}>
                          {(opt: FilterOption) => {
                            return <option value={opt.value}>{opt.name}</option>;
                          }}
                        </For>
                      </select>
                    </div>
                    <Show when={selectedGroup() === LogosPreviewOptions.Categories}>
                      <div class="col-12 col-md-6 col-lg-4 col-xxl-3">
                        <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>
                          {getTitle(2)}
                        </div>
                        <select
                          id="suboptions"
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
                <div class="mt-4">
                  <div class="form-check form-switch">
                    <input
                      onInput={() => setHiddenNonPublicOrgs(!hiddenNonPublicOrgs())}
                      checked={hiddenNonPublicOrgs()}
                      class="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="visibleNonPublicOrgs"
                    />
                    <label class="form-check-label" for="visibleNonPublicOrgs">
                      Hide non-public organizations
                    </label>
                  </div>
                </div>
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
      <Footer />
    </>
  );
};

export default Logos;
