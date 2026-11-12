import { For, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { DEFAULT_ITEM_DESCRIPTION } from '../../data/data';
import type { Item } from '../../types/datasets';
import { SVGIconKind } from '../../types/types';
import { formatTAGName } from '../../utils/formatTAGName';
import { getMainTag } from '../../utils/getMainTag';
import { FoundationBadge } from '../FoundationBadge';
import { Image } from '../Image';
import { ItemDropdown } from '../ItemDropdown';
import { MaturityBadge } from '../MaturityBadge';
import { RepositoriesSection } from '../RepositoriesSection';
import { SVGIcon } from '../SVGIcon';
import { AdditionalCategories } from './AdditionalCategories';
import { AuditsSection } from './AuditsSection';
import { ClomonitorSection } from './ClomonitorSection';
import { HeaderLinks } from './HeaderLinks';
import { MaturitySection } from './MaturitySection';
import { OrganizationSection } from './OrganizationSection';
import { OtherLinks } from './OtherLinks';
import { ParentProject } from './ParentProject';
import { BadgeOutlineDark, Fieldset, FieldsetTitle, TitleInSection } from './styles';
import { SummarySection } from './SummarySection';

interface Props {
  foundation: string;
  item: Item;
  basePath?: string;
  hideOrganizationSection?: boolean;
  parentInfo?: Item;
}

const LogoWrapper = css`
  height: 120px;
  width: 100px;
  min-width: 100px;
`;

const Logo = css`
  font-size: 3rem;
  max-width: 100%;
  max-height: 100%;
  height: auto;
`;

// The box grows when the header links need more than one row
const ItemInfo = css`
  background-color: #f8f9fa;
  width: calc(100% - 100px - 1rem);
  min-height: 140px;
  padding: 1rem 1.5rem;
`;

// Links wrap to the next row instead of overflowing the header box
const Links = css`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  justify-content: flex-end;
  row-gap: 0.5rem;
`;

const Title = css`
  font-size: 1.5rem;
  line-height: 1.75rem;
`;

const Name = css`
  padding-bottom: 5px;
`;

const Description = css`
  font-size: 0.9rem !important;
`;

const TagBadge = css`
  height: 20px;
`;

/** Item details for the desktop item modal. */
export const ItemModalContent = (props: Props) => {
  const description = () => props.item.description ?? DEFAULT_ITEM_DESCRIPTION;
  const tags = () => props.item.tag ?? [];

  return (
    <>
      {/* The base path is empty when the landscape is served from the root */}
      <Show when={props.basePath !== undefined}>
        <ItemDropdown itemId={props.item.id} foundation={props.foundation} basePath={props.basePath!} />
      </Show>
      <div class="d-flex flex-column p-3">
        <div class="d-flex flex-row align-items-center">
          <div class={`d-flex align-items-center justify-content-center ${LogoWrapper}`}>
            <Image class={`m-auto ${Logo}`} logo={props.item.logo} />
          </div>

          <div class={`d-flex flex-column justify-content-between ms-3 ${ItemInfo}`}>
            <div class="d-flex flex-row align-items-center me-5">
              <div class={`fw-semibold text-truncate pe-2 ${Title}`}>{props.item.name}</div>
              <div class="d-flex flex-row align-items-center ms-2">
                <Show when={props.item.maturity}>
                  {(maturity) => (
                    <>
                      <FoundationBadge foundation={props.foundation} />
                      <MaturityBadge level={maturity()} class="mx-2" />
                    </>
                  )}
                </Show>

                <Show when={tags().length > 0}>
                  <div class={`badge text-uppercase rounded-0 me-2 ${BadgeOutlineDark} ${TagBadge}`}>
                    TAG {formatTAGName(getMainTag(tags()))}
                  </div>
                </Show>

                <Show when={props.item.maturity !== undefined && props.item.accepted_at}>
                  <YearBadge prefix="Accepted at" date={props.item.accepted_at!} class="me-3" />
                </Show>
                <Show when={props.item.accepted_at === undefined && props.item.joined_at}>
                  {(joinedAt) => <YearBadge prefix="Joined at" date={joinedAt()} class="me-3 mt-1" />}
                </Show>
              </div>
            </div>
            <Show when={props.item.crunchbase_data?.name}>
              {(name) => (
                <div class={`text-muted text-truncate ${Name}`}>
                  <small>{name()}</small>
                </div>
              )}
            </Show>
            <div class="d-flex flex-row align-items-center mb-1">
              <div class={`d-none d-xl-flex badge rounded-0 ${BadgeOutlineDark}`}>{props.item.category}</div>
              <div class={`badge ms-0 ms-xl-2 rounded-0 ${BadgeOutlineDark}`}>{props.item.subcategory}</div>
              <Show when={props.item.enduser}>
                <div class={`badge ms-0 ms-xl-2 me-3 rounded-0 ${BadgeOutlineDark}`}>End user</div>
              </Show>

              <div class={`ms-auto ${Links}`}>
                <HeaderLinks item={props.item} variant="desktop" />
              </div>
            </div>
          </div>
        </div>

        <div class={`mt-4 text-muted ${Description}`}>{description()}</div>

        <OtherLinks item={props.item} variant="desktop" />

        <AdditionalCategories item={props.item} variant="desktop" />

        {/* The main TAG is shown in the header */}
        <Show when={tags().length > 1}>
          <div class={`fw-bold text-uppercase mt-4 mb-3 ${TitleInSection.desktop}`}>Additional tags</div>
          <div class="d-flex flex-row flex-wrap align-items-center mb-2">
            <For each={tags().slice(1)}>
              {(tag) => (
                <div class={`badge rounded-0 me-2 mb-2 text-truncate text-uppercase ${BadgeOutlineDark}`}>
                  TAG {formatTAGName(tag)}
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={props.item.parent_project}>
          {(parentName) => (
            <ParentProject
              parentName={parentName()}
              parentInfo={props.parentInfo}
              projectName={props.item.name}
              foundation={props.foundation}
              variant="desktop"
            />
          )}
        </Show>

        <MaturitySection item={props.item} variant="desktop" />

        <RepositoriesSection
          repositories={props.item.repositories}
          class={`border ${Fieldset}`}
          projectMaturity={props.item.maturity}
          titleClass={`position-absolute px-2 mb-0 bg-white fw-semibold ${FieldsetTitle}`}
        />

        <AuditsSection item={props.item} variant="desktop" />

        <Show when={!props.hideOrganizationSection}>
          <OrganizationSection item={props.item} variant="desktop" />
        </Show>

        <SummarySection item={props.item} variant="desktop" />

        <ClomonitorSection item={props.item} foundation={props.foundation} variant="desktop" />
      </div>
    </>
  );
};

/** Calendar badge showing the year of a date, with the full date in its title. */
const YearBadge = (props: { class: string; date: string; prefix: string }) => (
  <div title={`${props.prefix} ${props.date}`} class={`d-flex flex-row align-items-center ${props.class}`}>
    <SVGIcon kind={SVGIconKind.Calendar} class="me-1 text-muted" />
    <div>
      <small>{props.date.split('-')[0]}</small>
    </div>
  </div>
);
