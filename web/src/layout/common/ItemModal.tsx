import { Item, Repository } from '../../types';
import Modal from './Modal';
import styles from './ItemModal.module.css';
import { useEffect, useState } from 'react';
import itemsDataGetter from '../../utils/itemsDataGetter';
import cleanEmojis from '../../utils/cleanEmojis';
import MaturityBadge from './MaturityBadge';
import Image from './Image';
import ExternalLink from './ExternalLink';
import prettifyNumber from '../../utils/prettifyNumber';
import moment from 'moment';
import classNames from 'classnames';

interface Props {
  activeItemId?: string;
  removeActiveItem: () => void;
}

const ItemModal = (props: Props) => {
  const [itemInfo, setItemInfo] = useState<Item | null | undefined>(undefined);
  let description = 'This item does not have a description available yet';
  let stars: number | undefined;
  let mainRepo: Repository | undefined;
  let websiteUrl: string | undefined = itemInfo ? itemInfo.homepage_url : undefined;

  if (
    itemInfo &&
    itemInfo.crunchbase_data &&
    itemInfo.crunchbase_data.description &&
    itemInfo.crunchbase_data.description !== ''
  ) {
    description = cleanEmojis(itemInfo.crunchbase_data.description);
  }

  if (itemInfo && itemInfo.repositories) {
    const primaryRepo = itemInfo.repositories.find((repo: Repository) => repo.primary);

    if (
      primaryRepo &&
      primaryRepo.github_data &&
      primaryRepo.github_data.description &&
      primaryRepo.github_data.description !== ''
    ) {
      description = cleanEmojis(primaryRepo.github_data.description);
    }

    itemInfo.repositories.forEach((repo: Repository) => {
      if (repo.primary) {
        mainRepo = repo;
      }

      if (repo.github_data) {
        stars = stars || 0 + repo.github_data.stars;
      }
    });
  }

  // If homepage_url is undefined or is equal to main repository url
  // and project field is undefined,
  // we use the homepage_url fron crunchbase
  if (itemInfo && (websiteUrl === undefined || (mainRepo && websiteUrl === mainRepo.url))) {
    if (itemInfo.crunchbase_data && itemInfo.crunchbase_data.homepage_url) {
      websiteUrl = itemInfo.crunchbase_data.homepage_url;
    }
  }

  const formatDate = (date: string): string => {
    return moment(date).format("MMM 'YY");
  };

  useEffect(() => {
    async function fetchItemInfo() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        setItemInfo(await itemsDataGetter.get(props.activeItemId!));
      } catch {
        setItemInfo(null);
      }
    }

    if (props.activeItemId) {
      fetchItemInfo();
    } else {
      setItemInfo(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.activeItemId]);

  if (itemInfo === undefined || itemInfo === null) return null;

  return (
    <Modal size="xl" open onClose={() => props.removeActiveItem()}>
      <div className="d-flex flex-column p-3">
        <div className="d-flex flex-row align-items-center">
          <div className={`d-flex align-items-center justify-content-center ${styles.logoWrapper}`}>
            <Image name={itemInfo.name} className={`m-auto ${styles.logo}`} logo={itemInfo.logo} />
          </div>

          <div className={`d-flex flex-column justify-content-between ms-3 ${styles.itemInfo}`}>
            <div className="d-flex flex-row align-items-center">
              <div className={`fw-semibold text-truncate pe-2 ${styles.title}`}>{itemInfo.name}</div>
              <div className={`d-flex flex-row align-items-center ms-2 ${styles.extra}`}>
                {itemInfo.project !== undefined ? (
                  <>
                    <div title="CNCF" className="badge rounded-0 bg-primary">
                      CNCF
                    </div>
                    <MaturityBadge level={itemInfo.project} className="mx-2" />

                    {itemInfo.accepted_at !== undefined && (
                      <div
                        title={`Accepted at ${itemInfo.accepted_at}`}
                        className="d-flex flex-row align-items-center accepted-date me-3"
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
                          <small>{itemInfo.accepted_at.split('-')[0]}</small>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {itemInfo.member_subcategory !== undefined && (
                      <div
                        title={`${itemInfo.member_subcategory} member`}
                        className={`badge rounded-0 text-uppercase me-2 ${styles.badge}`}
                      >
                        {itemInfo.member_subcategory} member
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {itemInfo.crunchbase_data && itemInfo.crunchbase_data.name && (
              <div className={`text-muted text-truncate ${styles.name}`}>
                <small>{itemInfo.crunchbase_data.name}</small>
              </div>
            )}
            <div className="d-flex flex-row align-items-center mb-1">
              <div className={`badge border rounded-0 ${styles.badgeOutlineDark}`}>{itemInfo.category}</div>
              <div className={`badge border ms-2 me-3 rounded-0 ${styles.badgeOutlineDark}`}>
                {itemInfo.subcategory}
              </div>
              <div className="ms-auto">
                <div className={`d-flex flex-row align-items-center ${styles.extra}`}>
                  {websiteUrl && (
                    <ExternalLink title="Website" className={`ms-3 ${styles.link}`} href={websiteUrl}>
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

                  {mainRepo !== undefined && (
                    <ExternalLink title="Repository" className={`ms-3 ${styles.link}`} href={mainRepo.url}>
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

                  {itemInfo.devstats_url !== undefined && (
                    <ExternalLink title="Devstats" className={`ms-3 ${styles.link}`} href={itemInfo.devstats_url}>
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

                  {itemInfo.twitter_url !== undefined && (
                    <ExternalLink title="Twitter" className={`ms-3 ${styles.link}`} href={itemInfo.twitter_url}>
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

                  {itemInfo.youtube_url !== undefined && (
                    <ExternalLink title="Youtube" className={`ms-3 ${styles.link}`} href={itemInfo.youtube_url}>
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 576 512"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"></path>
                      </svg>
                    </ExternalLink>
                  )}

                  {itemInfo.slack_url !== undefined && (
                    <ExternalLink title="Slack" className={`ms-3 ${styles.link}`} href={itemInfo.slack_url}>
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 448 512"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M94.12 315.1c0 25.9-21.16 47.06-47.06 47.06S0 341 0 315.1c0-25.9 21.16-47.06 47.06-47.06h47.06v47.06zm23.72 0c0-25.9 21.16-47.06 47.06-47.06s47.06 21.16 47.06 47.06v117.84c0 25.9-21.16 47.06-47.06 47.06s-47.06-21.16-47.06-47.06V315.1zm47.06-188.98c-25.9 0-47.06-21.16-47.06-47.06S139 32 164.9 32s47.06 21.16 47.06 47.06v47.06H164.9zm0 23.72c25.9 0 47.06 21.16 47.06 47.06s-21.16 47.06-47.06 47.06H47.06C21.16 243.96 0 222.8 0 196.9s21.16-47.06 47.06-47.06H164.9zm188.98 47.06c0-25.9 21.16-47.06 47.06-47.06 25.9 0 47.06 21.16 47.06 47.06s-21.16 47.06-47.06 47.06h-47.06V196.9zm-23.72 0c0 25.9-21.16 47.06-47.06 47.06-25.9 0-47.06-21.16-47.06-47.06V79.06c0-25.9 21.16-47.06 47.06-47.06 25.9 0 47.06 21.16 47.06 47.06V196.9zM283.1 385.88c25.9 0 47.06 21.16 47.06 47.06 0 25.9-21.16 47.06-47.06 47.06-25.9 0-47.06-21.16-47.06-47.06v-47.06h47.06zm0-23.72c-25.9 0-47.06-21.16-47.06-47.06 0-25.9 21.16-47.06 47.06-47.06h117.84c25.9 0 47.06 21.16 47.06 47.06 0 25.9-21.16 47.06-47.06 47.06H283.1z"></path>
                      </svg>
                    </ExternalLink>
                  )}

                  {itemInfo.discord_url !== undefined && (
                    <ExternalLink title="Discord" className={`ms-3 ${styles.link}`} href={itemInfo.discord_url}>
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 640 512"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z"></path>
                      </svg>
                    </ExternalLink>
                  )}

                  {itemInfo.docker_url !== undefined && (
                    <ExternalLink title="Docker" className={`ms-3 ${styles.link}`} href={itemInfo.docker_url}>
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 640 512"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M349.9 236.3h-66.1v-59.4h66.1v59.4zm0-204.3h-66.1v60.7h66.1V32zm78.2 144.8H362v59.4h66.1v-59.4zm-156.3-72.1h-66.1v60.1h66.1v-60.1zm78.1 0h-66.1v60.1h66.1v-60.1zm276.8 100c-14.4-9.7-47.6-13.2-73.1-8.4-3.3-24-16.7-44.9-41.1-63.7l-14-9.3-9.3 14c-18.4 27.8-23.4 73.6-3.7 103.8-8.7 4.7-25.8 11.1-48.4 10.7H2.4c-8.7 50.8 5.8 116.8 44 162.1 37.1 43.9 92.7 66.2 165.4 66.2 157.4 0 273.9-72.5 328.4-204.2 21.4.4 67.6.1 91.3-45.2 1.5-2.5 6.6-13.2 8.5-17.1l-13.3-8.9zm-511.1-27.9h-66v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm78.1 0h-66.1v59.4h66.1v-59.4zm-78.1-72.1h-66.1v60.1h66.1v-60.1z"></path>
                      </svg>
                    </ExternalLink>
                  )}

                  {itemInfo.stack_overflow_url !== undefined && (
                    <ExternalLink
                      title="Stack overflow"
                      className={`ms-3 ${styles.link}`}
                      href={itemInfo.stack_overflow_url}
                    >
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        version="1.1"
                        viewBox="0 0 16 16"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M16 10v6h-16v-6h2v4h12v-4zM3 11h10v2h-10zM3.237 8.835l0.433-1.953 9.763 2.164-0.433 1.953zM4.37 4.821l0.845-1.813 9.063 4.226-0.845 1.813zM15.496 5.648l-1.218 1.587-7.934-6.088 0.88-1.147h0.91z"></path>
                      </svg>
                    </ExternalLink>
                  )}

                  {itemInfo.project === undefined && itemInfo.crunchbase_url !== undefined && (
                    <ExternalLink title="Crunchbase" className={`ms-3 ${styles.link}`} href={itemInfo.crunchbase_url}>
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

                  {itemInfo.blog_url !== undefined && (
                    <ExternalLink title="Blog" className={`ms-3 ${styles.link}`} href={itemInfo.blog_url}>
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        stroke-width="0"
                        viewBox="0 0 512 512"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M192 32c0 17.7 14.3 32 32 32c123.7 0 224 100.3 224 224c0 17.7 14.3 32 32 32s32-14.3 32-32C512 128.9 383.1 0 224 0c-17.7 0-32 14.3-32 32zm0 96c0 17.7 14.3 32 32 32c70.7 0 128 57.3 128 128c0 17.7 14.3 32 32 32s32-14.3 32-32c0-106-86-192-192-192c-17.7 0-32 14.3-32 32zM96 144c0-26.5-21.5-48-48-48S0 117.5 0 144V368c0 79.5 64.5 144 144 144s144-64.5 144-144s-64.5-144-144-144H128v96h16c26.5 0 48 21.5 48 48s-21.5 48-48 48s-48-21.5-48-48V144z"></path>
                      </svg>
                    </ExternalLink>
                  )}

                  {itemInfo.mailing_list_url !== undefined && (
                    <ExternalLink
                      title="Mailing list"
                      className={`ms-3 ${styles.link}`}
                      href={itemInfo.mailing_list_url}
                    >
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 1024 1024"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zm-40 110.8V792H136V270.8l-27.6-21.5 39.3-50.5 42.8 33.3h643.1l42.8-33.3 39.3 50.5-27.7 21.5zM833.6 232L512 482 190.4 232l-42.8-33.3-39.3 50.5 27.6 21.5 341.6 265.6a55.99 55.99 0 0 0 68.7 0L888 270.8l27.6-21.5-39.3-50.5-42.7 33.2z"></path>
                      </svg>
                    </ExternalLink>
                  )}

                  {itemInfo.openssf_best_practices_url !== undefined && (
                    <ExternalLink
                      title="OpenSSF best practices"
                      className={`ms-3 ${styles.link}`}
                      href={itemInfo.openssf_best_practices_url}
                    >
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 24 24"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path fill="none" d="M0 0h24v24H0V0z"></path>
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"></path>
                      </svg>
                    </ExternalLink>
                  )}

                  {itemInfo.artwork_url !== undefined && (
                    <ExternalLink title="Artwork" className={`ms-3 ${styles.link}`} href={itemInfo.artwork_url}>
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 24 24"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fill="none"
                          stroke="#000"
                          stroke-width="2"
                          d="M1,1 L19,1 L19,19 L1,19 L1,1 Z M5,19 L5,23 L23,23 L23,5.97061363 L18.9998921,5.97061363 M6,8 C6.55228475,8 7,7.55228475 7,7 C7,6.44771525 6.55228475,6 6,6 C5.44771525,6 5,6.44771525 5,7 C5,7.55228475 5.44771525,8 6,8 Z M2,18 L7,12 L10,15 L14,10 L19,16"
                        ></path>
                      </svg>
                    </ExternalLink>
                  )}

                  {itemInfo.github_discussions_url !== undefined && (
                    <ExternalLink
                      title="Github discussions"
                      className={`ms-3 ${styles.link}`}
                      href={itemInfo.github_discussions_url}
                    >
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 24 24"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 14.25 14H8.061l-2.574 2.573A1.458 1.458 0 0 1 3 15.543V14H1.75A1.75 1.75 0 0 1 0 12.25v-9.5C0 1.784.784 1 1.75 1ZM1.5 2.75v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z"></path>
                        <path d="M22.5 8.75a.25.25 0 0 0-.25-.25h-3.5a.75.75 0 0 1 0-1.5h3.5c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 22.25 20H21v1.543a1.457 1.457 0 0 1-2.487 1.03L15.939 20H10.75A1.75 1.75 0 0 1 9 18.25v-1.465a.75.75 0 0 1 1.5 0v1.465c0 .138.112.25.25.25h5.5a.75.75 0 0 1 .53.22l2.72 2.72v-2.19a.75.75 0 0 1 .75-.75h2a.25.25 0 0 0 .25-.25v-9.5Z"></path>
                      </svg>
                    </ExternalLink>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Description */}
        <div className={`mb-3 mt-4 text-muted ${styles.description}`}>{description}</div>

        {/* Project status */}
        {itemInfo.project !== undefined && (
          <div className={`position-relative my-4 border ${styles.fieldset}`}>
            <div className={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Project status</div>

            <div className="position-relative mt-2">
              <div className="d-flex flex-row justify-content-between">
                <div className="d-flex flex-column align-items-center">
                  <div className={`badge rounded-1 p-2 ${styles.projectBadge} ${styles.activeProjectBadge}`}>
                    {itemInfo.accepted_at || '-'}
                  </div>
                  <small className={`text-uppercase fw-semibold text-muted mt-2 ${styles.statusLegend}`}>Sandbox</small>
                </div>

                <div className="d-flex flex-column align-items-center">
                  <div
                    className={classNames('badge rounded-1 p-2', styles.projectBadge, {
                      [styles.activeProjectBadge]: ['incubating', 'graduated', 'archived'].includes(itemInfo.project),
                    })}
                  >
                    {itemInfo.incubating_at || '-'}
                  </div>
                  <small className={`text-uppercase fw-semibold text-muted mt-2 ${styles.statusLegend}`}>
                    Incubating
                  </small>
                </div>

                <div className="d-flex flex-column align-items-center">
                  <div
                    className={classNames('badge rounded-1 p-2', styles.projectBadge, {
                      [styles.activeProjectBadge]: ['graduated', 'archived'].includes(itemInfo.project),
                    })}
                  >
                    {itemInfo.graduated_at || '-'}
                  </div>
                  <small className={`text-uppercase fw-semibold text-muted mt-2 ${styles.statusLegend}`}>
                    Graduated
                  </small>
                </div>
              </div>
              <div className={`${styles.line} ${itemInfo.project}Line`} />
            </div>
          </div>
        )}

        {/* Organization */}
        {itemInfo.crunchbase_data && (
          <div className={`position-relative my-4 border ${styles.fieldset}`}>
            <div className={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Organization</div>
            <div className="d-flex flex-row align-items-center">
              <div className={`fw-semibold text-truncate fs-6`}>{itemInfo.crunchbase_data.name}</div>

              {itemInfo.crunchbase_data.kind && (
                <div className={`ms-3 badge rounded-0 text-dark text-uppercase ${styles.badge}`}>
                  {itemInfo.crunchbase_data.kind}
                </div>
              )}
              {itemInfo.crunchbase_data.company_type && (
                <div className={`ms-3 badge rounded-0 text-dark text-uppercase ${styles.badge}`}>
                  {itemInfo.crunchbase_data.company_type.replace(/_/g, ' ')}
                </div>
              )}
            </div>
            <div className={`text-muted ${styles.location}`}>
              {itemInfo.crunchbase_data.city}, {itemInfo.crunchbase_data.country}
            </div>
            <div className="mt-3">
              <small className="text-muted">{itemInfo.crunchbase_data.description}</small>
            </div>
            <div className="row g-4 my-0 mb-2">
              <div className="col">
                <div
                  className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                >
                  {' '}
                  <div className={`fw-bold ${styles.highlightedTitle}`}>
                    {itemInfo.crunchbase_data.funding ? prettifyNumber(itemInfo.crunchbase_data.funding) : '-'}
                  </div>
                  <div className={`fw-semibold ${styles.highlightedLegend}`}>
                    <small>Funding</small>
                  </div>
                </div>
              </div>

              <div className="col">
                <div
                  className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                >
                  {itemInfo.crunchbase_data.num_employees_min && itemInfo.crunchbase_data.num_employees_max ? (
                    <div className={`fw-bold ${styles.highlightedTitle}`}>
                      {itemInfo.crunchbase_data.num_employees_min
                        ? prettifyNumber(itemInfo.crunchbase_data.num_employees_min)
                        : '-'}
                      -
                      {itemInfo.crunchbase_data.num_employees_max
                        ? prettifyNumber(itemInfo.crunchbase_data.num_employees_max)
                        : '-'}
                    </div>
                  ) : (
                    <div className={`fw-bold ${styles.highlightedTitle}`}>-</div>
                  )}
                  <div className={`fw-semibold ${styles.highlightedLegend}`}>
                    <small>Employees</small>
                  </div>
                </div>
              </div>

              <div className="col">
                <div
                  className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                >
                  <div className={`fw-bold ${styles.highlightedTitle}`}>
                    {itemInfo.crunchbase_data.stock_exchange ? itemInfo.crunchbase_data.stock_exchange : '-'}
                  </div>
                  <div className={`fw-semibold ${styles.highlightedLegend}`}>
                    <small>Stock exchange</small>
                  </div>
                </div>
              </div>

              <div className="col">
                <div
                  className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                >
                  <div className={`fw-bold ${styles.highlightedTitle}`}>
                    {itemInfo.crunchbase_data.ticker ? itemInfo.crunchbase_data.ticker : '-'}
                  </div>
                  <div className={`fw-semibold ${styles.highlightedLegend}`}>
                    <small>Ticker</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Repositories */}
        <div className={`position-relative mt-4 border ${styles.fieldset}`}>
          <div className={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Repositories</div>
          {mainRepo !== undefined && (
            <>
              <div className="d-flex flex-row align-items-center">
                <div>
                  <small className="text-muted">Primary repository:</small>
                </div>
                <div className="ms-2">{mainRepo.url}</div>
                {mainRepo.github_data && (
                  <div className={`ms-3 badge border rounded-0 ${styles.badgeOutlineDark}`}>
                    {mainRepo.github_data.license}
                  </div>
                )}
              </div>
              {mainRepo.github_data && (
                <div className="row g-4 my-0 mb-2">
                  <div className="col">
                    <div
                      className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                    >
                      <div className={`fw-bold ${styles.highlightedTitle}`}>
                        {prettifyNumber(mainRepo.github_data.stars)}
                      </div>
                      <div className={`fw-semibold ${styles.highlightedLegend}`}>
                        <small>Stars</small>
                      </div>
                    </div>
                  </div>

                  <div className="col">
                    <div
                      className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                    >
                      <div className={`fw-bold ${styles.highlightedTitle}`}>
                        {prettifyNumber(mainRepo.github_data.contributors.count)}
                      </div>
                      <div className={`fw-semibold ${styles.highlightedLegend}`}>
                        <small>Contributors</small>
                      </div>
                    </div>
                  </div>

                  <div className="col">
                    <div
                      className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                    >
                      <div className={`fw-bold ${styles.highlightedTitle}`}>
                        {formatDate(mainRepo.github_data.first_commit.ts)}
                      </div>
                      <div className={`fw-semibold ${styles.highlightedLegend}`}>
                        <small>First commit</small>
                      </div>
                    </div>
                  </div>

                  <div className="col">
                    <div
                      className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                    >
                      <div className={`fw-bold ${styles.highlightedTitle}`}>
                        {formatDate(mainRepo.github_data.latest_commit.ts)}
                      </div>
                      <div className={`fw-semibold ${styles.highlightedLegend}`}>
                        <small>Latest commit</small>
                      </div>
                    </div>
                  </div>

                  <div className="col">
                    <div
                      className={`text-center p-3 h-100 d-flex flex-column justify-content-center ${styles.highlighted}`}
                    >
                      <div className={`fw-bold ${styles.highlightedTitle}`}>
                        {mainRepo.github_data.latest_release ? formatDate(mainRepo.github_data.latest_release.ts) : '-'}
                      </div>
                      <div className={`fw-semibold ${styles.highlightedLegend}`}>
                        <small>Latest release</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {itemInfo.repositories && itemInfo.repositories.length > 1 && (
            <div className="mt-4">
              <small className="text-muted">Other repositories:</small>
              <table className="table table-sm table-striped table-bordered mt-3">
                <thead>
                  <tr>
                    <th className="text-center" scope="col">
                      URL
                    </th>
                    <th className="text-center" scope="col">
                      STARS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemInfo.repositories.map((repo: Repository) => {
                    if (repo.primary) return null;
                    return (
                      <tr className={styles.tableRepos} key={`table_${repo.url}`}>
                        <td className="px-3">{repo.url}</td>
                        <td className="px-3 text-center">
                          {repo.github_data && repo.github_data.stars ? prettifyNumber(repo.github_data.stars) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ItemModal;
