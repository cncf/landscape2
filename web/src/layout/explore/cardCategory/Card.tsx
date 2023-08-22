import { isUndefined } from 'lodash';

import { Item, Repository, SVGIconKind } from '../../../types';
import cleanEmojis from '../../../utils/cleanEmojis';
import prettifyNumber from '../../../utils/prettifyNumber';
import ExternalLink from '../../common/ExternalLink';
import Image from '../../common/Image';
import MaturityBadge from '../../common/MaturityBadge';
import SVGIcon from '../../common/SVGIcon';
import styles from './Card.module.css';
import CardTitle from './CardTitle';

interface Props {
  item: Item;
  className?: string;
}

const Card = (props: Props) => {
  let description = 'This item does not have a description available yet';
  let stars: number | undefined;
  let mainRepoUrl: string | undefined;
  let websiteUrl: string | undefined = props.item.homepage_url;

  if (
    props.item.crunchbase_data &&
    props.item.crunchbase_data.description &&
    props.item.crunchbase_data.description !== ''
  ) {
    description = cleanEmojis(props.item.crunchbase_data.description);
  }

  if (props.item.repositories) {
    const primaryRepo = props.item.repositories.find((repo: Repository) => repo.primary);

    if (
      primaryRepo &&
      primaryRepo.github_data &&
      primaryRepo.github_data.description &&
      primaryRepo.github_data.description !== ''
    ) {
      description = cleanEmojis(primaryRepo.github_data.description);
    }

    props.item.repositories.forEach((repo: Repository) => {
      if (repo.primary) {
        mainRepoUrl = repo.url;
      }

      if (repo.github_data) {
        stars = stars || 0 + repo.github_data.stars;
      }
    });
  }

  // If homepage_url is undefined or is equal to main repository url
  // and maturity field is undefined,
  // we use the homepage_url fron crunchbase
  if (isUndefined(websiteUrl) || websiteUrl === mainRepoUrl) {
    if (props.item.crunchbase_data && props.item.crunchbase_data.homepage_url) {
      websiteUrl = props.item.crunchbase_data.homepage_url;
    }
  }

  return (
    <div className={`d-flex flex-column ${props.className}`}>
      <div className="d-flex flex-row align-items-center">
        <div className={`d-flex align-items-center justify-content-center ${styles.logoWrapper}`}>
          <Image name={props.item.name} className={`m-auto ${styles.logo}`} logo={props.item.logo} />
        </div>

        <div className={`p-3 ms-2 ${styles.itemInfo}`}>
          <CardTitle title={props.item.name} />
          {props.item.crunchbase_data && props.item.crunchbase_data.name && (
            <div className={`text-muted text-truncate ${styles.name}`}>
              <small>{props.item.crunchbase_data.name}</small>
            </div>
          )}

          <div className={`d-flex flex-row flex-wrap overflow-hidden align-items-center mt-2 ${styles.extra}`}>
            {!isUndefined(props.item.maturity) ? (
              <>
                <div title="CNCF" className="badge rounded-0 bg-primary">
                  CNCF
                </div>
                <MaturityBadge level={props.item.maturity} className="mx-2" />
              </>
            ) : (
              <>
                {!isUndefined(props.item.member_subcategory) && (
                  <div
                    title={`${props.item.member_subcategory} member`}
                    className={`badge rounded-0 text-uppercase me-2 border ${styles.badgeOutlineDark}`}
                  >
                    {props.item.member_subcategory} member
                  </div>
                )}
              </>
            )}

            {websiteUrl && (
              <ExternalLink title="Website" className={`me-2 ${styles.link}`} href={websiteUrl}>
                <SVGIcon kind={SVGIconKind.World} />
              </ExternalLink>
            )}

            {!isUndefined(mainRepoUrl) && (
              <ExternalLink title="Repository" className={`me-2 ${styles.link}`} href={mainRepoUrl}>
                <SVGIcon kind={SVGIconKind.GitHubCircle} />
              </ExternalLink>
            )}

            {!isUndefined(props.item.devstats_url) && (
              <ExternalLink title="Devstats" className={`me-2 ${styles.link}`} href={props.item.devstats_url}>
                <SVGIcon kind={SVGIconKind.Stats} />
              </ExternalLink>
            )}

            {!isUndefined(props.item.twitter_url) && (
              <ExternalLink title="Twitter" className={`me-2 ${styles.link}`} href={props.item.twitter_url}>
                <SVGIcon kind={SVGIconKind.Twitter} />
              </ExternalLink>
            )}

            {isUndefined(props.item.maturity) && !isUndefined(props.item.crunchbase_url) && (
              <ExternalLink title="Crunchbase" className={`me-2 ${styles.link}`} href={props.item.crunchbase_url}>
                <SVGIcon kind={SVGIconKind.Crunchbase} />
              </ExternalLink>
            )}

            {!isUndefined(props.item.accepted_at) && (
              <div
                title={`Accepted at ${props.item.accepted_at}`}
                className="d-flex flex-row align-items-center accepted-date"
              >
                <SVGIcon kind={SVGIconKind.Calendar} className="me-1 text-muted" />
                <div>
                  <small>{props.item.accepted_at.split('-')[0]}</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={`my-3 text-muted ${styles.description}`}>{description}</div>
      <div
        className={`d-flex flex-row justify-content-between align-items-baseline text-muted mt-auto pt-1 ${styles.additionalInfo}`}
      >
        <div className="d-flex flex-row align-items-baseline">
          {(isUndefined(props.item.maturity) || isUndefined(props.item.crunchbase_data)) && (
            <>
              <small className="me-1 text-black-50">Funding:</small>
              <div className="fw-semibold">
                {props.item.crunchbase_data &&
                props.item.crunchbase_data.funding &&
                props.item.crunchbase_data.funding > 0 ? (
                  <>${prettifyNumber(props.item.crunchbase_data.funding)}</>
                ) : (
                  <>-</>
                )}
              </div>
            </>
          )}
        </div>
        {!isUndefined(stars) && (
          <div className="d-flex flex-row align-items-baseline">
            <small className="me-1 text-black-50">GitHub stars:</small>
            <div className="fw-semibold">{stars ? prettifyNumber(stars, 1) : '-'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
