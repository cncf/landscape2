import { createMemo, For } from 'solid-js';
import { css } from 'solid-styled-components';

import type { Item } from '../../types/datasets';
import { ExternalLink } from '../ExternalLink';
import { SVGIcon } from '../SVGIcon';
import { getItemLinks } from './helpers';
import type { SectionVariant } from './styles';

interface Props {
  item: Item;
  variant: SectionVariant;
}

// Links the mobile header has room for
const MOBILE_LINK_KEYS = ['website', 'twitter', 'facebook', 'gitter'];

const Link: Record<SectionVariant, string> = {
  desktop: css`
    position: relative;
    color: inherit;
    height: 24px;
    line-height: 22px;
    width: auto;

    &:hover {
      color: var(--color1);
    }

    svg {
      position: relative;
      height: 18px;
      width: auto;
      margin-top: -4px;
    }
  `,
  mobile: css`
    position: relative;
    color: inherit;
    height: 24px;
    line-height: 22px;
    width: auto;

    &:hover {
      color: var(--color1);
    }

    svg {
      position: relative;
      height: 18px;
      width: auto;
      margin-top: -1px;
    }
  `,
};

/** Icon links of the item header: every available link on desktop, a reduced set on mobile. */
export const HeaderLinks = (props: Props) => {
  const links = createMemo(() => {
    const itemLinks = getItemLinks(props.item);
    return props.variant === 'mobile' ? itemLinks.filter((link) => MOBILE_LINK_KEYS.includes(link.key)) : itemLinks;
  });

  return (
    <For each={links()}>
      {(link) => (
        <ExternalLink
          title={link.label}
          label={link.label}
          class={`${props.variant === 'desktop' ? 'ms-3' : 'me-2'} ${Link[props.variant]}`}
          href={link.href}
        >
          <SVGIcon kind={link.icon} />
        </ExternalLink>
      )}
    </For>
  );
};
