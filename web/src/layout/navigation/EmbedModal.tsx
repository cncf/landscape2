import { useLocation, useNavigate } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { batch, createEffect, createSignal, For, on, onMount, Show } from 'solid-js';

import {
  BGCOLOR_PARAM,
  DEFAULT_BG_COLOR,
  DEFAULT_DISPLAY_HEADER,
  DEFAULT_FG_COLOR,
  DEFAULT_SIZE,
  DEFAULT_STYLE_VIEW,
  DISPLAY_HEADER_PARAM,
  FGCOLOR_PARAM,
  KEY_PARAM,
  Size,
  SIZE_PARAM,
  Style,
  STYLE_PARAM,
} from '../../../../embed/src/types';
import { GROUP_PARAM, SMALL_DEVICES_BREAKPOINTS, VIEW_MODE_PARAM } from '../../data';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import { Category, Subcategory, SVGIconKind } from '../../types';
import capitalizeFirstLetter from '../../utils/capitalizeFirstLetter';
import rgba2hex from '../../utils/rgba2hex';
import CheckBox from '../common/Checkbox';
import CodeBlock from '../common/CodeBlock';
import Modal from '../common/Modal';
import SVGIcon from '../common/SVGIcon';
import { useGroupActive } from '../stores/groupActive';
import { useViewMode } from '../stores/viewMode';
import styles from './EmbedModal.module.css';

enum InputType {
  Style = STYLE_PARAM,
  Size = SIZE_PARAM,
  DisplayHeaders = DISPLAY_HEADER_PARAM,
  BgColor = BGCOLOR_PARAM,
  FgColor = FGCOLOR_PARAM,
}

const SIZES_LEGENDS = {
  [Size.XSmall]: 'Extra small',
  [Size.Small]: 'Small',
  [Size.Medium]: 'Medium',
  [Size.Large]: 'Large',
  [Size.XLarge]: 'Extra large',
};

const EmbedModal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedGroup = useGroupActive();
  const viewMode = useViewMode();
  const { point } = useBreakpointDetect();
  const BG_COLOR =
    !isUndefined(window.baseDS.colors) && !isUndefined(window.baseDS.colors!.color5)
      ? rgba2hex(window.baseDS.colors.color5)
      : DEFAULT_BG_COLOR;
  // Icon is only visible when Explore section is loaded
  const isVisible = () => ['/', '/embed-setup'].includes(location.pathname);
  const isEmbedSetupActive = () => location.pathname === '/embed-setup';
  const [visibleModal, setVisibleModal] = createSignal<boolean>(isEmbedSetupActive());
  const categoriesList = () => sortBy(window.baseDS.categories, ['name']);
  const [subcategoriesList, setSubcategoriesList] = createSignal<Subcategory[]>(
    sortBy(categoriesList()[0].subcategories, ['name'])
  );
  const [key, setKey] = createSignal<string>(
    // eslint-disable-next-line solid/reactivity
    `${categoriesList()[0].normalized_name}--${subcategoriesList()[0].normalized_name}`
  );
  const [selectedCategory, setSelectedCategory] = createSignal<string>(categoriesList()[0].normalized_name);
  // eslint-disable-next-line solid/reactivity
  const [selectedSubcategory, setSelectedSubcategory] = createSignal<string>(subcategoriesList()[0].normalized_name);
  const [selectedStyle, setSelectedStyle] = createSignal<Style>(DEFAULT_STYLE_VIEW);
  const [selectedSize, setSelectedSize] = createSignal<Size>(DEFAULT_SIZE);
  const [displayHeader, setDisplayHeader] = createSignal<boolean>(DEFAULT_DISPLAY_HEADER);
  const [bgColor, setBgColor] = createSignal<string>(BG_COLOR);
  const [fgColor, setFgColor] = createSignal<string>(DEFAULT_FG_COLOR);
  const [url, setUrl] = createSignal<string>();
  const [prevHash, setPrevHash] = createSignal<string>('');

  const getUrl = () => {
    return `${
      import.meta.env.MODE === 'development' ? 'http://localhost:8000' : window.location.origin
    }/embed/embed.html?${KEY_PARAM}=${key() || categoriesList()[0].normalized_name}&${DISPLAY_HEADER_PARAM}=${
      displayHeader() ? 'true' : 'false'
    }&${STYLE_PARAM}=${selectedStyle()}&${SIZE_PARAM}=${selectedSize()}&${BGCOLOR_PARAM}=${encodeURIComponent(
      bgColor()
    )}&${FGCOLOR_PARAM}=${encodeURIComponent(fgColor())}`;
  };

  const onChange = (type: InputType, value: string, checked?: boolean) => {
    switch (type) {
      case InputType.Style:
        setSelectedStyle(value as Style);
        break;
      case InputType.Size:
        setSelectedSize(value as Size);
        break;
      case InputType.DisplayHeaders:
        setDisplayHeader(checked!);
        break;
      case InputType.BgColor:
        setBgColor(value);
        break;
      case InputType.FgColor:
        setFgColor(value);
        break;
      default:
        break;
    }
  };

  const updateCategory = (category: string) => {
    const selectedCat = categoriesList().find((cat: Category) => cat.normalized_name === category);
    if (selectedCat) {
      const subcategories = sortBy(selectedCat.subcategories, ['name']);
      const firstSubcategory = subcategories[0].normalized_name;

      batch(() => {
        setSubcategoriesList(subcategories);
        setSelectedCategory(category);
        setSelectedSubcategory(firstSubcategory);
        setKey(`${selectedCategory()}--${firstSubcategory}`);
      });
    }
  };

  const onClose = () => {
    const updatedSearchParams = new URLSearchParams();
    updatedSearchParams.set(GROUP_PARAM, selectedGroup() || 'default');
    updatedSearchParams.set(VIEW_MODE_PARAM, viewMode());

    navigate(`/?${updatedSearchParams.toString()}${prevHash()}`, {
      replace: true,
    });
    setVisibleModal(false);

    // Reset settings
    batch(() => {
      const subcategories = sortBy(categoriesList()[0].subcategories, ['name']);
      setSubcategoriesList(subcategories);
      setSelectedCategory(categoriesList()[0].normalized_name);
      setSelectedSubcategory(subcategories[0].normalized_name);
      setKey(`${categoriesList()[0].normalized_name}--${subcategories[0].normalized_name}`);
      setSelectedSize(DEFAULT_SIZE);
      setSelectedStyle(DEFAULT_STYLE_VIEW);
      setDisplayHeader(DEFAULT_DISPLAY_HEADER);
      setBgColor(BG_COLOR);
      setFgColor(DEFAULT_FG_COLOR);
    });
  };

  onMount(() => {
    setUrl(getUrl());
  });

  createEffect(() => {
    setUrl(getUrl());
  });

  createEffect(
    on(point, () => {
      if (visibleModal() && !isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!)) {
        onClose();
      }
    })
  );

  createEffect(
    on(visibleModal, () => {
      if (visibleModal()) {
        setPrevHash(location.hash);
        setUrl(getUrl());
      }
    })
  );

  return (
    <Show when={isVisible()}>
      <div class="me-2 position-relative">
        <button
          type="button"
          class={`btn btn-md p-0 rounded-0 lh-1 ${styles.btn}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVisibleModal(true);
            navigate('embed-setup', {
              replace: true,
            });
          }}
        >
          <SVGIcon kind={SVGIconKind.Embed} />
        </button>
      </div>
      <Show when={visibleModal()}>
        <Modal
          size="xxl"
          open
          bodyClass={styles.modalBody}
          onClose={onClose}
          header="Embeddable view setup"
          footer={
            <div class="d-flex flex-row justify-content-end w-100">
              <div>
                <button
                  type="button"
                  title="Close modal"
                  class="btn btn-sm btn-secondary text-uppercase fw-semibold text-white rounded-0"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div class="d-flex flex-column">
            <div class="row g-0">
              <div class="col-4 col-xxl-3">
                <div class={`p-4 ${styles.configWrapper}`}>
                  <div>
                    <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>Category</div>
                    <select
                      id="categories"
                      class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                      value={selectedCategory()}
                      aria-label="Categories"
                      onChange={(e) => {
                        updateCategory(e.currentTarget.value);
                      }}
                    >
                      <For each={categoriesList()}>
                        {(cat: Category) => {
                          return <option value={cat.normalized_name}>{cat.name}</option>;
                        }}
                      </For>
                    </select>
                  </div>
                  <div class="mt-4">
                    <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>Subcategory</div>
                    <select
                      id="subcategories"
                      class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                      value={selectedSubcategory() || subcategoriesList()[0].normalized_name}
                      aria-label="Subcategories"
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setSelectedSubcategory(value);
                        setKey(`${selectedCategory()}${value !== 'all' ? `--${value}` : ''}`);
                      }}
                    >
                      <option value="all">All</option>
                      <For each={sortBy(subcategoriesList(), ['name'])}>
                        {(subcat: Subcategory) => {
                          return <option value={subcat.normalized_name}>{subcat.name}</option>;
                        }}
                      </For>
                    </select>
                  </div>
                  <div class="mt-4">
                    <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>Header</div>
                    <div class="form-check">
                      <CheckBox
                        name={InputType.DisplayHeaders}
                        value="true"
                        class="ps-0"
                        labelClass={`mw-100 text-muted ${styles.label}`}
                        label="Visible"
                        checked={displayHeader()}
                        onChange={(value: string, checked: boolean) =>
                          onChange(InputType.DisplayHeaders, value, checked)
                        }
                      />
                    </div>
                    <div class="form-check ps-0">
                      <div class="d-flex flex-row align-items-center mt-3">
                        <input
                          class={styles.inputColor}
                          type="color"
                          id={InputType.BgColor}
                          name={InputType.BgColor}
                          value={bgColor()}
                          onInput={(e) => {
                            onChange(InputType.BgColor, e.currentTarget.value);
                          }}
                        />
                        <label class={`mw-100 text-muted ms-2 ${styles.label}`} for={InputType.BgColor}>
                          Background color
                        </label>
                      </div>
                    </div>
                    <div class="form-check ps-0">
                      <div class="d-flex flex-row align-items-center mt-3">
                        <input
                          class={styles.inputColor}
                          type="color"
                          id={InputType.FgColor}
                          name={InputType.FgColor}
                          value={fgColor()}
                          onInput={(e) => {
                            onChange(InputType.FgColor, e.currentTarget.value);
                          }}
                        />
                        <label class={`mw-100 text-muted ms-2 ${styles.label}`} for={InputType.FgColor}>
                          Foreground color
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="mt-4">
                    <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>Item Style</div>
                    <select
                      id="styles"
                      class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                      value={selectedStyle()}
                      aria-label="Styles"
                      onChange={(e) => {
                        setSelectedStyle(e.currentTarget.value as Style);
                      }}
                    >
                      <For each={Object.values(Style)}>
                        {(s: Style) => {
                          return <option value={s}>{capitalizeFirstLetter(s)}</option>;
                        }}
                      </For>
                    </select>
                  </div>
                  <div class="mt-4">
                    <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>Item size</div>
                    <select
                      id="sizes"
                      class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                      value={selectedSize()}
                      aria-label="Sizes"
                      onChange={(e) => {
                        setSelectedSize(e.currentTarget.value as Size);
                      }}
                    >
                      <For each={Object.values(Size)}>
                        {(s: Size) => {
                          return <option value={s}>{SIZES_LEGENDS[s]}</option>;
                        }}
                      </For>
                    </select>
                  </div>
                </div>
              </div>
              <div class="col-8 col-xxl-9 border-start">
                <div class="h-100 d-flex flex-column">
                  <div class={`text-uppercase text-muted fw-semibold ${styles.labelSelect} ${styles.previewTitle}`}>
                    Preview
                  </div>
                  <Show when={!isUndefined(url())}>
                    <div class="p-4 pt-2 flex-grow-1">
                      <iframe src={url()} class="d-block w-100 h-100 border-0 scroll-auto" />
                    </div>
                  </Show>
                </div>
              </div>
            </div>
            <div class={`border-top p-4 ${styles.codeWrapper}`}>
              <div class={`text-uppercase text-muted fw-semibold mb-2 ${styles.labelSelect}`}>Embed code</div>
              <CodeBlock
                language="html"
                content={
                  !isUndefined(url())
                    ? `<iframe src="${url()}" style="width:100%;height:100%;display:block;border:none;"></iframe>`
                    : ''
                }
                codeClass={`bg-dark text-white ${styles.code}`}
                btnWrapperClass="ms-2"
                withCopyBtn
                visibleBtnText
              />
            </div>
          </div>
        </Modal>
      </Show>
    </Show>
  );
};

export default EmbedModal;
