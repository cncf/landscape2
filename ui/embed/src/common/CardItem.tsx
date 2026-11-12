import { GitHubCircle, World } from 'common/icons';
import type { EmbedItem } from 'common/types';
import { cx, DEFAULT_ITEM_DESCRIPTION } from 'common/utils';
import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import getUrl from '../utils/getUrl';
import ExternalLink from './ExternalLink';
import Image from './Image';

interface Props {
  item: EmbedItem;
  foundation: string;
  onClick?: () => void;
}

const ColClass = css`
  flex: 0 0 auto;
  margin-top: 24px;
  padding: 0 12px;
  width: 100%;

  @media (min-width: 768px) {
    width: 50%;
  }

  @media (min-width: 992px) {
    width: 33.333333%;
  }

  @media (min-width: 1400px) {
    width: 25%;
  }

  @media (min-width: 1920px) {
    width: 20%;
  }
`;

const CardClass = css`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 192px;
  border: 1px solid #d2d2d2;
  padding: 1rem;
  font-size: 90%;
`;

// The details button or link covers the card as a sibling, so the hover style
// lives on the wrapper. The icon links sit above it (z-index 2).
const CardWrapperClass = css`
  position: relative;

  &:hover > .${CardClass} {
    border-color: var(--bg-color);
    box-shadow: 0 0 5px 0 rgba(13, 110, 253, 0.25);
  }
`;

const CardOverlayClass = css`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
`;

const CardHeaderClass = css`
  width: 100%;
  display: flex;
  align-items: center;
`;

const ImageWrapperClass = css`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 90px;
  width: 70px;
  min-width: 70px;
`;

const ImageClass = css`
  margin: auto;
  width: 100%;
  max-height: 100%;
  height: auto;
`;

const CardItemContentClass = css`
  background-color: #f8f9fa;
  padding: 1rem;
  width: calc(100% - 70px - 1rem);
  height: 105px;
  margin-left: 1rem;
`;

const ItemNameClass = css`
  font-size: 1.15rem;
  line-height: 1.15;
  font-weight: 600;
  padding-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OrgNameClass = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(33, 37, 41, 0.75);
  font-size: 0.875em;
  height: 15px;
`;

const ItemInfoWrapper = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  overflow: hidden;
  height: 26px;
`;

const BadgeClass = css`
  margin-top: 0.5rem;
  border: 1px solid transparent;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  line-height: 0.5rem;
  padding: 0.2rem 0.5rem;
  margin-right: 0.5rem;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MemberBadgeClass = css`
  border-color: rgb(73, 80, 87) !important;
  color: rgb(73, 80, 87);
`;

const MaturityBadgeClass = css`
  border-color: rgb(108, 117, 125) !important;
  background-color: rgb(108, 117, 125);
  color: #fff;
  max-width: calc(50% - 0.5rem) !important;
`;

const FoundationBadgeClass = css`
  border-color: var(--bg-color) !important;
  background-color: var(--bg-color);
  color: #fff;
  max-width: calc(50% - 0.5rem) !important;
`;

const IconClass = css`
  margin-top: 0.5rem;
  position: relative;
  z-index: 2;
  color: inherit;
  height: 18px;
  line-height: 22px;
  width: auto;
  margin-right: 0.5rem;

  &:hover {
    color: var(--bg-color);
  }

  svg {
    height: 15px;
    width: 15px;
  }
`;

// Line clamping still needs the `-webkit-box` display and its prefixed properties
const DescriptionClass = css`
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(33, 37, 41, 0.75);
  margin-top: 1rem;
  overflow: hidden;
  text-overflow: unset;
  white-space: inherit;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  word-wrap: normal;
  max-height: 36px;
`;

const CardItem = (props: Props) => {
  const cardContent = () => (
    <div class={CardClass}>
      <div class={CardHeaderClass}>
        <div class={ImageWrapperClass}>
          <Image name={props.item.name} class={ImageClass} logo={props.item.logo} />
        </div>
        <div class={CardItemContentClass}>
          <div class={ItemNameClass}>{props.item.name}</div>
          <div class={OrgNameClass}>
            <Show when={props.item.organization_name}>{props.item.organization_name}</Show>
          </div>
          <div class={ItemInfoWrapper}>
            <Show
              when={props.item.maturity}
              fallback={
                <Show when={props.item.member_subcategory}>
                  <div title={`${props.item.member_subcategory} member`} class={cx(BadgeClass, MemberBadgeClass)}>
                    {props.item.member_subcategory} member
                  </div>
                </Show>
              }
            >
              <>
                <div title={props.foundation} class={cx(BadgeClass, FoundationBadgeClass)}>
                  {props.foundation}
                </div>
                <div title={props.item.maturity} class={cx(BadgeClass, MaturityBadgeClass)}>
                  {props.item.maturity}
                </div>
              </>
            </Show>
            <Show when={props.item.website}>
              <ExternalLink title="Website" label="Website" class={IconClass} href={props.item.website}>
                <World />
              </ExternalLink>
            </Show>
            <Show when={props.item.primary_repository_url}>
              <ExternalLink
                title="Repository"
                label="Repository"
                class={IconClass}
                href={props.item.primary_repository_url!}
              >
                <GitHubCircle />
              </ExternalLink>
            </Show>
          </div>
        </div>
      </div>
      <div class={DescriptionClass}>{props.item.description ?? DEFAULT_ITEM_DESCRIPTION}</div>
    </div>
  );

  return (
    <div class={ColClass}>
      <div class={CardWrapperClass}>
        <Show
          when={props.onClick}
          fallback={
            <ExternalLink
              href={`${getUrl()}?item=${props.item.id}`}
              class={CardOverlayClass}
              label={`${props.item.name} details`}
            />
          }
        >
          <button class={CardOverlayClass} onClick={() => props.onClick?.()} aria-label={`${props.item.name} info`} />
        </Show>
        {cardContent()}
      </div>
    </div>
  );
};

export default CardItem;
