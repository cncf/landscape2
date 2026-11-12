import { For, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import type { Item } from '../../types/datasets';
import { cutString } from '../../utils/cutString';
import { cx } from '../../utils/cx';
import { ExternalLink } from '../ExternalLink';
import type { SectionVariant } from './styles';

interface Props {
  item: Item;
  variant: SectionVariant;
}

// Maximum length of a link name before it is cut
const MAX_NAME_LENGTH = 30;

const OtherLink: Record<SectionVariant, string> = {
  desktop: css`
    font-size: 0.75rem;
    color: var(--color4);
    max-width: calc(50% - 2rem - 15px);
    line-height: 1;
  `,
  mobile: css`
    max-width: calc(100% - 2rem - 15px);
    font-size: 0.65rem !important;
    color: var(--color4);
    line-height: 1;
  `,
};

const Dot = css`
  line-height: 1;
`;

/** Other links of the item (`other_links`), separated by dots. */
export const OtherLinks = (props: Props) => {
  const isMobile = () => props.variant === 'mobile';

  return (
    <Show when={props.item.other_links?.length}>
      <div class={`d-flex flex-row flex-wrap align-items-center ${isMobile() ? 'mb-3 mt-1' : 'mt-2'}`}>
        <For each={props.item.other_links}>
          {(link, index) => (
            <>
              <ExternalLink
                href={link.url}
                class={cx(
                  'fw-semibold text-nowrap d-inline-block text-truncate text-uppercase',
                  isMobile() && 'me-2 mt-2',
                  OtherLink[props.variant]
                )}
              >
                {cutString(link.name, MAX_NAME_LENGTH)}
              </ExternalLink>
              <Show when={index() !== props.item.other_links!.length - 1}>
                <div class={isMobile() ? `me-2 mt-2 ${Dot}` : 'mx-2'} aria-hidden="true">
                  ·
                </div>
              </Show>
            </>
          )}
        </For>
      </div>
    </Show>
  );
};
