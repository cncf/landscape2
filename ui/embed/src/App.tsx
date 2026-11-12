import {
  Alignment,
  buildMultiCategoryKey,
  buildShowItemDetailsMessage,
  DEFAULT_TITLE_BG_COLOR,
  DEFAULT_TITLE_FG_COLOR,
  DEFAULT_TITLE_FONT_FAMILY,
  type EmbedConfig,
  FontFamily,
  parseEmbedConfig,
} from 'common/embed';
import type { Category, EmbedItem, EmbedView } from 'common/types';
import { capitalizeFirstLetter, formatTAGName } from 'common/utils';
import { createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
import { css, styled } from 'solid-styled-components';

import ExternalLink from './common/ExternalLink';
import Loading from './common/Loading';
import NoData from './common/NoData';
import StyleView from './common/StyleView';
import {
  dedupeItemsById,
  filterBySelectedSubcategories,
  filterItemsBySubcategory,
  getCategoryClassification,
  sortItemsByName,
} from './utils/categoryView';
import { getDataOrigin } from './utils/dataOrigin';
import getUrl from './utils/getUrl';

/** Load status of the embed view: `invalid` is an invalid embed url, `error` a fetch or parse failure. */
type LoadStatus = 'loading' | 'ready' | 'invalid' | 'error';

/** Titled group of sections (a category, or the whole view for maturity and TAG views). */
interface SectionGroup {
  sections: Section[];
  title?: string;
}

/** Items listed under a subtitle. */
interface Section {
  items: EmbedItem[];
  name: string;
  categoryName?: string;
}

/** Loaded embed view, ready to be rendered. */
interface LoadedView {
  config: EmbedConfig;
  foundation: string;
  groups: SectionGroup[];
  // Items shown when the headers are hidden
  items: EmbedItem[];
  // Embed key sent in the item details messages
  key: string;
  // Categories of a multi-category view that could be loaded
  categories?: string[];
}

/** Category of a multi-category view and its items. */
interface CategoryEntry {
  category: Category;
  foundation: string;
  items: EmbedItem[];
  key: string;
}

interface HeadingProps {
  alignment: Alignment;
  isBgTransparent: boolean;
  size: number;
  uppercase: boolean;
  firstTitle?: boolean;
  spacing?: number;
}

interface ContentProps {
  fontFamily: FontFamily;
}

interface ViewContentProps {
  view: LoadedView;
  onShowItemDetails: (itemId: string) => void;
}

// Minimum vertical space around the titles, in pixels
const MIN_HEADING_MARGIN = 16;

const FONT_FAMILY_OPTIONS: Record<FontFamily, string> = {
  [FontFamily.Serif]: `Times, "Times New Roman", Georgia, Palatino, serif`,
  [FontFamily.SansSerif]: `"Clarity City", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, Roboto, "Noto Sans", Ubuntu, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
  [FontFamily.Monospace]: `Courier, Consolas, "Andale Mono", monospace`,
};

// `all: initial` isolates the view from the host page styles, so it goes first
// and the declarations after it set the intended values
const Content = styled('div')`
  all: initial;
  display: block;
  isolation: isolate;
  overflow: hidden;
  margin: 0;
  padding: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;

  *,
  *::before,
  *::after {
    font-family: ${(props: ContentProps) => FONT_FAMILY_OPTIONS[props.fontFamily]};
    box-sizing: border-box;
  }
`;

// Base styles shared by the titles and subtitles
const headingStyles = (heading: HeadingProps) => `
  background-color: var(--bg-color);
  color: var(--fg-color);
  padding: ${heading.isBgTransparent ? '0.5rem 0' : '0.5rem 0.75rem'};
  font-size: ${heading.size}px;
  font-weight: 500;
  line-height: 1.5;
  text-align: ${heading.alignment};
  text-transform: ${heading.uppercase ? 'uppercase' : 'none'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// Category titles after the first one get twice the space above them
const Title = styled('div')`
  ${headingStyles}
  margin: ${(props: HeadingProps) =>
    props.firstTitle
      ? `0 0 ${getHeadingMargin(props.spacing)}px 0`
      : `${getHeadingMargin(props.spacing) * 2}px 0 ${getHeadingMargin(props.spacing)}px 0`};
`;

const Subtitle = styled('div')`
  ${headingStyles}
  margin: ${(props: HeadingProps) =>
    props.firstTitle
      ? `0 0 ${getHeadingMargin(props.spacing)}px 0`
      : `${getHeadingMargin(props.spacing)}px 0 ${getHeadingMargin(props.spacing)}px 0`};
`;

const RetryButtonClass = css`
  margin-top: 1rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid currentColor;
  background-color: transparent;
  color: inherit;
  font-size: 0.875rem;
  cursor: pointer;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;

const MessageClass = css`
  margin: 0;
`;

const App = () => {
  const config = parseEmbedConfig(location.search);
  const [status, setStatus] = createSignal<LoadStatus>(config ? 'loading' : 'invalid');
  const [view, setView] = createSignal<LoadedView>();

  const load = async () => {
    if (!config) return;
    setStatus('loading');
    try {
      setView(await loadView(config));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  // The host page origin is unknown; embed-item validates the message and loads the data itself
  const showItemDetails = (itemId: string) => {
    const loadedView = view();
    if (!loadedView) return;
    window.parent.postMessage(
      buildShowItemDetailsMessage({
        categories: loadedView.categories,
        classifyBy: loadedView.config.classifyBy,
        foundation: loadedView.foundation,
        hideOrganizationSection: loadedView.config.hideOrganizationSection,
        itemId,
        key: loadedView.key,
      }),
      '*'
    );
  };

  onMount(() => {
    load();
  });

  return (
    <Content
      fontFamily={config?.titleFontFamily ?? DEFAULT_TITLE_FONT_FAMILY}
      style={{
        '--bg-color': config?.titleBgColor ?? DEFAULT_TITLE_BG_COLOR,
        '--fg-color': config?.titleFgColor ?? DEFAULT_TITLE_FG_COLOR,
      }}
    >
      <Switch>
        <Match when={status() === 'loading'}>
          <Loading isBgTransparent={config?.isBgTransparent ?? false} />
        </Match>
        <Match when={status() === 'invalid'}>
          <NoData>
            <p class={MessageClass}>
              <strong>Invalid embed url</strong>
            </p>
            <p>
              Please visit: <ExternalLink href={`${getUrl()}/embed-setup`}>{getUrl()}/embed-setup</ExternalLink>
            </p>
          </NoData>
        </Match>
        <Match when={status() === 'error'}>
          <NoData>
            <p class={MessageClass}>
              <strong>This view could not be loaded.</strong>
            </p>
            <button type="button" class={RetryButtonClass} onClick={() => load()}>
              Try again
            </button>
          </NoData>
        </Match>
        <Match when={status() === 'ready' && view()}>
          {(loadedView) => <ViewContent view={loadedView()} onShowItemDetails={showItemDetails} />}
        </Match>
      </Switch>
    </Content>
  );
};

export default App;

/** Renders the items of a loaded view, under their titles when the headers are displayed. */
const ViewContent = (props: ViewContentProps) => {
  const config = () => props.view.config;
  const headingProps = () => ({
    alignment: config().titleAlignment,
    isBgTransparent: config().isBgTransparent,
    size: config().titleSize,
    spacing: config().itemsSpacing,
    uppercase: config().uppercaseTitle,
  });
  const styleViewProps = () => ({
    alignment: config().itemsAlignment,
    displayName: config().displayItemName,
    foundation: props.view.foundation,
    itemNameSize: config().itemNameSize,
    onItemClick: config().displayItemModal ? props.onShowItemDetails : undefined,
    size: config().itemsSize,
    spacing: config().itemsSpacing,
    style: config().itemsStyle,
  });

  return (
    <Show when={config().displayHeader} fallback={<StyleView {...styleViewProps()} items={props.view.items} />}>
      <For each={props.view.groups}>
        {(group, groupIndex) => (
          <>
            <Show when={config().displayCategoryTitle && group.title}>
              {(title) => (
                <Title {...headingProps()} firstTitle={groupIndex() === 0}>
                  {title()}
                </Title>
              )}
            </Show>
            <For each={group.sections}>
              {(section, sectionIndex) => (
                <>
                  <Subtitle {...headingProps()} firstTitle={groupIndex() === 0 && sectionIndex() === 0}>
                    <Show when={config().displayCategoryInSubcategory && section.categoryName}>
                      {(categoryName) => <>{categoryName()} - </>}
                    </Show>
                    {section.name} ({section.items.length})
                  </Subtitle>
                  <StyleView {...styleViewProps()} items={section.items} />
                </>
              )}
            </For>
          </>
        )}
      </For>
    </Show>
  );
};

/** Builds the group of a category: one section per subcategory with items. */
const buildCategoryGroup = (category: Category, items: EmbedItem[]): SectionGroup => ({
  sections: category.subcategories
    .map((subcategory) => ({
      categoryName: category.name,
      items: sortItemsByName(filterItemsBySubcategory(items, category.name, subcategory.name)),
      name: subcategory.name,
    }))
    .filter((section) => section.items.length > 0),
  title: category.name,
});

/** Builds the group of a maturity or TAG view: one section per option, items with no option left out. */
const buildOptionsGroup = (view: EmbedView): SectionGroup => {
  const { classification, items } = view;
  if ('maturity' in classification) {
    return {
      sections: classification.maturity.map((option) => ({
        items: sortItemsByName(items.filter((item) => item.maturity === option.name)),
        name: capitalizeFirstLetter(option.name),
      })),
    };
  }
  if ('tag' in classification) {
    return {
      sections: classification.tag.map((option) => ({
        items: sortItemsByName(items.filter((item) => item.tag?.includes(option.name))),
        name: formatTAGName(option.name),
      })),
    };
  }
  return { sections: [] };
};

/** Fetches an embed view dataset, failing on an error response or invalid JSON. */
const fetchEmbedView = async (basePath: string, key: string): Promise<EmbedView> => {
  const response = await fetch(`${getDataOrigin(basePath)}/data/embed_${key}.json`);
  if (!response.ok) {
    throw new Error(`Unable to load the embed view ${key}: ${response.status}`);
  }
  return (await response.json()) as EmbedView;
};

/** Returns the minimum space around a title for the items spacing given. */
const getHeadingMargin = (spacing?: number): number =>
  spacing !== undefined && spacing > MIN_HEADING_MARGIN ? spacing : MIN_HEADING_MARGIN;

/** Returns the items of every section once, sorted by name. */
const getSectionsItems = (groups: SectionGroup[]): EmbedItem[] =>
  sortItemsByName(dedupeItemsById(groups.flatMap((group) => group.sections.flatMap((section) => section.items))));

/** Loads the categories of a multi-category view, leaving out the ones that cannot be loaded. */
const loadCategoryEntries = async (config: EmbedConfig): Promise<CategoryEntry[]> => {
  const results = await Promise.allSettled(
    config.categories.map((category) => fetchEmbedView(config.basePath, `category_${category}`))
  );
  return results.flatMap((result, index) => {
    if (result.status === 'rejected') return [];
    const classification = getCategoryClassification(result.value);
    if (!classification) return [];
    const { category } = classification;
    return [
      {
        category,
        foundation: result.value.foundation,
        items: result.value.items,
        key: category.normalized_name || config.categories[index],
      },
    ];
  });
};

/** Loads the data of an embed view and prepares it for rendering. */
const loadView = async (config: EmbedConfig): Promise<LoadedView> => {
  if (config.categories.length > 1) {
    const entries = await loadCategoryEntries(config);
    if (entries.length === 0) {
      throw new Error('Unable to load any category of the embed view');
    }
    const groups = entries
      .map((entry) => buildCategoryGroup(entry.category, entry.items))
      .filter((group) => group.sections.length > 0);
    const categories = entries.map((entry) => entry.key);
    return {
      categories,
      config,
      foundation: entries.find((entry) => entry.foundation !== '')?.foundation ?? '',
      groups,
      items: getSectionsItems(groups),
      key: buildMultiCategoryKey(categories),
    };
  }

  const data = filterBySelectedSubcategories(
    await fetchEmbedView(config.basePath, `${config.classifyBy}_${config.key}`),
    config.subcategories
  );
  const classification = getCategoryClassification(data);
  if (classification) {
    const groups = [buildCategoryGroup(classification.category, data.items)];
    return { config, foundation: data.foundation, groups, items: getSectionsItems(groups), key: config.key };
  }
  return {
    config,
    foundation: data.foundation,
    groups: [buildOptionsGroup(data)],
    items: sortItemsByName(data.items),
    key: config.key,
  };
};
