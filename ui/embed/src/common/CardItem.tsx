import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { BaseItem, SVGIconKind } from '../types';
import getUrl from '../utils/getUrl';
import ExternalLink from './ExternalLink';
import Image from './Image';
import SVGIcon from './SVGIcon';

interface Props {
  item: BaseItem;
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

const LinkClass = css`
  text-decoration: none;
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

  &:hover {
    border-color: var(--bg-color);
    box-shadow: 0 0 5px 0 rgba(13, 110, 253, 0.25);
  }
`;

const CardHeaderClass = css`
  width: 100%;
  display: flex;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
`;

const ImageWrapperClass = css`
  width: 100%;
  height: 100%;
  display: flex;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
  -webkit-box-pack: center;
  -ms-flex-pack: center;
  justify-content: center;
  height: 90px;
  width: 70px;
  min-width: 70px;
`;

const ImageClass = css`
  margin: auto;
  font-size: calc(var(--card-size-height) / 1.5);
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
  word-wrap: normal;
  max-height: 36px;
`;

const CardItem = (props: Props) => {
  return (
    <div class={ColClass}>
      <ExternalLink href={`${getUrl()}?item=${props.item.id}`} class={LinkClass}>
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
                      <div
                        title={`${props.item.member_subcategory} member`}
                        class={`${BadgeClass} ${MemberBadgeClass}`}
                      >
                        {props.item.member_subcategory} member
                      </div>
                    </Show>
                  }
                >
                  <>
                    <div title={props.item.maturity} class={`${BadgeClass} ${FoundationBadgeClass}`}>
                      {props.foundation}
                    </div>
                    <div title={props.item.maturity} class={`${BadgeClass} ${MaturityBadgeClass}`}>
                      {props.item.maturity}
                    </div>
                  </>
                </Show>
                <Show when={props.item.website}>
                  <ExternalLink title="Website" class={IconClass} href={props.item.website!}>
                    <SVGIcon kind={SVGIconKind.World} />
                  </ExternalLink>
                </Show>
                <Show when={props.item.primary_repository_url}>
                  <ExternalLink title="Repository" class={IconClass} href={props.item.primary_repository_url!}>
                    <SVGIcon kind={SVGIconKind.GitHubCircle} />
                  </ExternalLink>
                </Show>
              </div>
            </div>
          </div>
          <div class={DescriptionClass}>
            {props.item.description || 'This item does not have a description available yet'}
          </div>
        </div>
      </ExternalLink>
    </div>
  );
};

export default CardItem;
