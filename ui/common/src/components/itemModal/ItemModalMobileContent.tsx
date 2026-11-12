// Mobile item details keep a reduced field set compared to desktop:
// - header links: Website, X, Facebook and Gitter only;
// - full summary text instead of `CollapsableText`;
// - no TAG, accepted/joined or End-user badges;
// - a two-column audits table (date, linking to the report, and vendor).

import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { DEFAULT_ITEM_DESCRIPTION } from '../../data/data';
import type { Item } from '../../types/datasets';
import { cutString } from '../../utils/cutString';
import { FoundationBadge } from '../FoundationBadge';
import { Image } from '../Image';
import { MaturityBadge } from '../MaturityBadge';
import { RepositoriesSection } from '../RepositoriesSection';
import { AdditionalCategories } from './AdditionalCategories';
import { AuditsSection } from './AuditsSection';
import { ClomonitorSection } from './ClomonitorSection';
import { HeaderLinks } from './HeaderLinks';
import { MaturitySection } from './MaturitySection';
import { OrganizationSection } from './OrganizationSection';
import { OtherLinks } from './OtherLinks';
import { ParentProject } from './ParentProject';
import { BadgeOutlineDark, SectionTitle } from './styles';
import { SummarySection } from './SummarySection';

interface Props {
  foundation: string;
  item: Item;
  hideOrganizationSection?: boolean;
  parentInfo?: Item;
}

// Maximum length of the maturity badge text
const MAX_MATURITY_LENGTH = 16;

const LogoWrapper = css`
  height: 55px;
  width: 55px;
  min-width: 55px;
`;

const Logo = css`
  font-size: 3rem;
  max-width: 100%;
  max-height: 100%;
  height: auto;
`;

const Title = css`
  font-size: 1.05rem;
  line-height: 1.5;
  /* Close button - modal */
  padding-right: 1.75rem;
`;

const Badges = css`
  font-size: 85% !important;
  height: 22px;

  .badge:not(.badgeOutlineDark) {
    height: 18px;
    line-height: 19px;
    font-size: 10.25px !important;
    padding: 0 0.65rem;
  }
`;

const ItemInfo = css`
  background-color: #f8f9fa;
  width: calc(100% - 45px - 1rem);
  height: 85px;
`;

const Description = css`
  font-size: 0.9rem;
`;

const Categories = css`
  font-size: 0.8rem !important;

  small {
    font-size: 80%;
    opacity: 0.5;
  }
`;

/** Item details for the mobile item modal. */
export const ItemModalMobileContent = (props: Props) => {
  const description = () => props.item.description ?? DEFAULT_ITEM_DESCRIPTION;

  return (
    <div class="d-flex flex-column mw-100">
      <div class="d-flex flex-column">
        <div class="d-flex flex-row align-items-center justify-content-between">
          <div class={`d-flex align-items-center justify-content-center ${LogoWrapper}`}>
            <Image class={`m-auto ${Logo}`} logo={props.item.logo} enableLazyLoad />
          </div>

          <div class={`p-3 ${ItemInfo}`}>
            <div class={`fw-semibold text-truncate mb-1 ${Title}`}>{props.item.name}</div>

            <div class={`d-flex flex-row flex-wrap overflow-hidden align-items-center ${Badges}`}>
              <Show
                when={props.item.maturity}
                fallback={
                  <Show when={props.item.member_subcategory}>
                    {(memberSubcategory) => (
                      <div
                        title={`${memberSubcategory()} member`}
                        class={`badge rounded-0 text-truncate text-uppercase me-2 ${BadgeOutlineDark} badgeOutlineDark`}
                      >
                        {memberSubcategory()} member
                      </div>
                    )}
                  </Show>
                }
              >
                {(maturity) => (
                  <>
                    <FoundationBadge class="me-2" foundation={props.foundation} />
                    <MaturityBadge level={cutString(maturity(), MAX_MATURITY_LENGTH)} class="me-2" />
                  </>
                )}
              </Show>

              <HeaderLinks item={props.item} variant="mobile" />
            </div>
          </div>
        </div>
      </div>

      <div class={`mt-4 mb-3 text-muted ${Description}`}>{description()}</div>
      <div class={`mb-2 ${Categories}`}>
        <div class="text-truncate">
          <small class="text-uppercase fw-semibold pe-1">Category:</small>
          {props.item.category}
        </div>
        <div class="text-truncate">
          <small class="text-uppercase fw-semibold pe-1">Subcategory:</small>
          {props.item.subcategory}
        </div>
      </div>

      <OtherLinks item={props.item} variant="mobile" />

      <AdditionalCategories item={props.item} variant="mobile" />

      <Show when={props.item.parent_project}>
        {(parentName) => (
          <ParentProject
            parentName={parentName()}
            parentInfo={props.parentInfo}
            projectName={props.item.name}
            foundation={props.foundation}
            variant="mobile"
          />
        )}
      </Show>

      <MaturitySection item={props.item} variant="mobile" />

      <RepositoriesSection
        repositories={props.item.repositories}
        projectMaturity={props.item.maturity}
        titleClass={`text-uppercase mt-3 mb-4 fw-semibold border-bottom lh-base ${SectionTitle}`}
        boxClass="col-6"
      />

      <AuditsSection item={props.item} variant="mobile" />

      <Show when={!props.hideOrganizationSection}>
        <OrganizationSection item={props.item} variant="mobile" />
      </Show>

      <SummarySection item={props.item} variant="mobile" />

      <ClomonitorSection item={props.item} foundation={props.foundation} variant="mobile" />
    </div>
  );
};
