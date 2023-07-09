import { Item, Repository } from '../../../types';
import cleanEmojis from '../../../utils/cleanEmojis';
import prettifyNumber from '../../../utils/prettifyNumber';
import ExternalLink from '../../common/ExternalLink';
import Image from '../../common/Image';
import MaturityBadge from '../../common/MaturityBadge';
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
  // and project field is undefined,
  // we use the homepage_url fron crunchbase
  if (websiteUrl === undefined || websiteUrl === mainRepoUrl) {
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
            {props.item.project !== undefined ? (
              <>
                <div title="CNCF" className="badge rounded-0 bg-primary">
                  CNCF
                </div>
                <MaturityBadge level={props.item.project} className="mx-2" />
              </>
            ) : (
              <>
                {props.item.member_subcategory !== undefined && (
                  <div
                    title={`${props.item.member_subcategory} member`}
                    className={`badge rounded-0 text-uppercase me-2 ${styles.badge}`}
                  >
                    {props.item.member_subcategory} member
                  </div>
                )}
              </>
            )}

            {websiteUrl && (
              <ExternalLink title="Website" className={`me-2 ${styles.link}`} href={websiteUrl}>
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 512 512"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="none"
                    strokeMiterlimit="10"
                    strokeWidth="32"
                    d="M256 48C141.13 48 48 141.13 48 256s93.13 208 208 208 208-93.13 208-208S370.87 48 256 48z"
                  ></path>
                  <path
                    fill="none"
                    strokeMiterlimit="10"
                    strokeWidth="32"
                    d="M256 48c-58.07 0-112.67 93.13-112.67 208S197.93 464 256 464s112.67-93.13 112.67-208S314.07 48 256 48z"
                  ></path>
                  <path
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="32"
                    d="M117.33 117.33c38.24 27.15 86.38 43.34 138.67 43.34s100.43-16.19 138.67-43.34m0 277.34c-38.24-27.15-86.38-43.34-138.67-43.34s-100.43 16.19-138.67 43.34"
                  ></path>
                  <path fill="none" strokeMiterlimit="10" strokeWidth="32" d="M256 48v416m208-208H48"></path>
                </svg>
              </ExternalLink>
            )}

            {mainRepoUrl !== undefined && (
              <ExternalLink title="Repository" className={`me-2 ${styles.link}`} href={mainRepoUrl}>
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 24 24"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm3.163 21.783h-.093a.513.513 0 0 1-.382-.14.513.513 0 0 1-.14-.372v-1.406c.006-.467.01-.94.01-1.416a3.693 3.693 0 0 0-.151-1.028 1.832 1.832 0 0 0-.542-.875 8.014 8.014 0 0 0 2.038-.471 4.051 4.051 0 0 0 1.466-.964c.407-.427.71-.943.885-1.506a6.77 6.77 0 0 0 .3-2.13 4.138 4.138 0 0 0-.26-1.476 3.892 3.892 0 0 0-.795-1.284 2.81 2.81 0 0 0 .162-.582c.033-.2.05-.402.05-.604 0-.26-.03-.52-.09-.773a5.309 5.309 0 0 0-.221-.763.293.293 0 0 0-.111-.02h-.11c-.23.002-.456.04-.674.111a5.34 5.34 0 0 0-.703.26 6.503 6.503 0 0 0-.661.343c-.215.127-.405.249-.573.362a9.578 9.578 0 0 0-5.143 0 13.507 13.507 0 0 0-.572-.362 6.022 6.022 0 0 0-.672-.342 4.516 4.516 0 0 0-.705-.261 2.203 2.203 0 0 0-.662-.111h-.11a.29.29 0 0 0-.11.02 5.844 5.844 0 0 0-.23.763c-.054.254-.08.513-.081.773 0 .202.017.404.051.604.033.199.086.394.16.582A3.888 3.888 0 0 0 5.702 10a4.142 4.142 0 0 0-.263 1.476 6.871 6.871 0 0 0 .292 2.12c.181.563.483 1.08.884 1.516.415.422.915.75 1.466.964.653.25 1.337.41 2.033.476a1.828 1.828 0 0 0-.452.633 2.99 2.99 0 0 0-.2.744 2.754 2.754 0 0 1-1.175.27 1.788 1.788 0 0 1-1.065-.3 2.904 2.904 0 0 1-.752-.824 3.1 3.1 0 0 0-.292-.382 2.693 2.693 0 0 0-.372-.343 1.841 1.841 0 0 0-.432-.24 1.2 1.2 0 0 0-.481-.101c-.04.001-.08.005-.12.01a.649.649 0 0 0-.162.02.408.408 0 0 0-.13.06.116.116 0 0 0-.06.1.33.33 0 0 0 .14.242c.093.074.17.131.232.171l.03.021c.133.103.261.214.382.333.112.098.213.209.3.33.09.119.168.246.231.381.073.134.15.288.231.463.188.474.522.875.954 1.145.453.243.961.364 1.476.351.174 0 .349-.01.522-.03.172-.028.343-.057.515-.091v1.743a.5.5 0 0 1-.533.521h-.062a10.286 10.286 0 1 1 6.324 0v.005z"></path>
                </svg>
              </ExternalLink>
            )}

            {props.item.devstats_url !== undefined && (
              <ExternalLink title="Devstats" className={`me-2 ${styles.link}`} href={props.item.devstats_url}>
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 512 512"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M496 496H16V16h32v448h448v32z"></path>
                  <path d="M192 432H80V208h112zm144 0H224V160h112zm143.64 0h-112V96h112z"></path>
                </svg>
              </ExternalLink>
            )}

            {props.item.twitter_url !== undefined && (
              <ExternalLink title="Twitter" className={`me-2 ${styles.link}`} href={props.item.twitter_url}>
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 16 16"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"></path>
                </svg>
              </ExternalLink>
            )}

            {props.item.project === undefined && props.item.crunchbase_url !== undefined && (
              <ExternalLink title="Crunchbase" className={`me-2 ${styles.link}`} href={props.item.crunchbase_url}>
                <svg
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                  <path d="M3 19v-14a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"></path>
                  <path d="M10.414 11.586a2 2 0 1 0 0 2.828"></path>
                  <path d="M15 13m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
                  <path d="M13 7v6"></path>
                </svg>
              </ExternalLink>
            )}

            {props.item.accepted_at !== undefined && (
              <div
                title={`Accepted at ${props.item.accepted_at}`}
                className="d-flex flex-row align-items-center accepted-date"
              >
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 24 24"
                  className="me-1 text-muted"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M6.75 0a.75.75 0 0 1 .75.75V3h9V.75a.75.75 0 0 1 1.5 0V3h2.75c.966 0 1.75.784 1.75 1.75v16a1.75 1.75 0 0 1-1.75 1.75H3.25a1.75 1.75 0 0 1-1.75-1.75v-16C1.5 3.784 2.284 3 3.25 3H6V.75A.75.75 0 0 1 6.75 0ZM21 9.5H3v11.25c0 .138.112.25.25.25h17.5a.25.25 0 0 0 .25-.25Zm-17.75-5a.25.25 0 0 0-.25.25V8h18V4.75a.25.25 0 0 0-.25-.25Z"></path>
                </svg>
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
          {(props.item.project === undefined || props.item.crunchbase_data === undefined) && (
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
        {stars !== undefined && (
          <div className="d-flex flex-row align-items-baseline">
            <small className="me-1 text-black-50">GitHub stars:</small>
            <div className="fw-semibold">{stars ? prettifyNumber(stars) : '-'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
