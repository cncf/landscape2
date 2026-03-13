import {
  ExternalLink,
  FoundationBadge,
  getItemDescription,
  Image,
  Loading,
  MaturityBadge,
  prettifyNumber,
  SVGIcon,
  SVGIconKind,
} from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, For, Match, Show, Switch } from 'solid-js';

import { FOUNDATION } from '../../data';
import { GithubRepository, Item, Repository } from '../../types';
import itemsDataGetter from '../../utils/itemsDataGetter';
import styles from './KioskView.module.css';

interface Props {
  itemId: string;
  fullDataReady: boolean;
}

interface LinkEntry {
  label: string;
  url: string;
  icon: SVGIconKind;
}

const KioskView = (props: Props) => {
  // undefined = still loading, null = not found, Item = found
  const [itemInfo, setItemInfo] = createSignal<Item | null | undefined>(undefined);
  const [primaryRepo, setPrimaryRepo] = createSignal<Repository | undefined>(undefined);

  createEffect(() => {
    if (props.itemId && props.fullDataReady) {
      const item = itemsDataGetter.getItemById(props.itemId);
      setItemInfo(item || null);

      if (!isUndefined(item) && !isUndefined(item.repositories)) {
        const primary = item.repositories.find((r: Repository) => r.primary);
        setPrimaryRepo(primary);
      }
    }
  });

  const githubData = (): GithubRepository | undefined => {
    const repo = primaryRepo();
    if (!isUndefined(repo)) {
      return repo.github_data;
    }
    return undefined;
  };

  const goodFirstIssuesUrl = (): string | undefined => {
    const repo = primaryRepo();
    if (!isUndefined(repo)) {
      return `${repo.url}/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22`;
    }
    return undefined;
  };

  const gitjobsUrl = (): string | undefined => {
    const item = itemInfo();
    if (!isUndefined(item) && item !== null) {
      return `https://gitjobs.dev/jobs?query=${encodeURIComponent(item.name)}`;
    }
    return undefined;
  };

  const description = (): string => {
    const item = itemInfo();
    if (!isUndefined(item) && item !== null) {
      return getItemDescription(item);
    }
    return '';
  };

  const getLinkedInUrl = (): string | undefined => {
    const item = itemInfo();
    if (!isUndefined(item) && item !== null) {
      if (!isUndefined(item.linkedin_url)) {
        return item.linkedin_url;
      }
      if (!isUndefined(item.crunchbase_data) && !isUndefined(item.crunchbase_data.linkedin_url)) {
        return item.crunchbase_data.linkedin_url;
      }
    }
    return undefined;
  };

  const communityLinks = (): LinkEntry[] => {
    const item = itemInfo();
    if (isUndefined(item) || item === null) return [];

    const links: LinkEntry[] = [];
    if (!isUndefined(item.slack_url)) {
      links.push({ label: 'Slack', url: item.slack_url, icon: SVGIconKind.Slack });
    }
    if (!isUndefined(item.discord_url)) {
      links.push({ label: 'Discord', url: item.discord_url, icon: SVGIconKind.Discord });
    }
    if (!isUndefined(item.mailing_list_url)) {
      links.push({ label: 'Mailing List', url: item.mailing_list_url, icon: SVGIconKind.MailingList });
    }
    if (!isUndefined(item.github_discussions_url)) {
      links.push({ label: 'GitHub Discussions', url: item.github_discussions_url, icon: SVGIconKind.Discussions });
    }
    if (!isUndefined(item.stack_overflow_url)) {
      links.push({ label: 'Stack Overflow', url: item.stack_overflow_url, icon: SVGIconKind.StackOverflow });
    }
    return links;
  };

  const socialLinks = (): LinkEntry[] => {
    const item = itemInfo();
    if (isUndefined(item) || item === null) return [];

    const links: LinkEntry[] = [];
    if (!isUndefined(item.twitter_url)) {
      links.push({ label: 'Twitter / X', url: item.twitter_url, icon: SVGIconKind.Twitter });
    }
    if (!isUndefined(item.youtube_url)) {
      links.push({ label: 'YouTube', url: item.youtube_url, icon: SVGIconKind.Youtube });
    }
    const linkedIn = getLinkedInUrl();
    if (!isUndefined(linkedIn)) {
      links.push({ label: 'LinkedIn', url: linkedIn, icon: SVGIconKind.LinkedIn });
    }
    if (!isUndefined(item.bluesky_url)) {
      links.push({ label: 'Bluesky', url: item.bluesky_url, icon: SVGIconKind.Bluesky });
    }
    if (!isUndefined(item.blog_url)) {
      links.push({ label: 'Blog', url: item.blog_url, icon: SVGIconKind.Blog });
    }
    return links;
  };

  const codeLinks = (): LinkEntry[] => {
    const item = itemInfo();
    if (isUndefined(item) || item === null) return [];

    const links: LinkEntry[] = [];
    const repo = primaryRepo();
    if (!isUndefined(repo)) {
      links.push({ label: 'Repository', url: repo.url, icon: SVGIconKind.GitHub });
    }
    if (!isUndefined(item.docker_url)) {
      links.push({ label: 'Docker', url: item.docker_url, icon: SVGIconKind.Docker });
    }
    if (!isUndefined(item.package_manager_url)) {
      links.push({ label: 'Package Manager', url: item.package_manager_url, icon: SVGIconKind.PackageManager });
    }
    return links;
  };

  return (
    <Switch>
      {/* Loading state: data not yet fetched */}
      <Match when={isUndefined(itemInfo())}>
        <div class="d-flex justify-content-center align-items-center" style={{ 'min-height': '100vh' }}>
          <Loading noWrapper />
        </div>
      </Match>

      {/* Not found state: data loaded but item doesn't exist */}
      <Match when={itemInfo() === null}>
        <div class={styles.kioskContainer}>
          <div class={styles.notFound}>
            <div class={styles.notFoundTitle}>Project not found</div>
            <div class={styles.notFoundMessage}>The requested project could not be found in the landscape.</div>
            <div class={styles.poweredBy}>
              <ExternalLink href="https://landscape.cncf.io">Browse the CNCF Landscape</ExternalLink>
            </div>
          </div>
        </div>
      </Match>

      {/* Found state: render kiosk content */}
      <Match when={itemInfo()}>
        {(item) => {
          const i = item();
          return (
            <div class={styles.kioskContainer}>
              {/* Header */}
              <div class={styles.header}>
                <div class={styles.logoWrapper}>
                  <Image name={i.name} logo={i.logo} class={styles.logo} />
                </div>
                <div class={styles.projectName}>{i.name}</div>
                <div class={`${styles.badges} mt-2 mb-3`}>
                  <Show when={!isUndefined(FOUNDATION) && FOUNDATION !== ''}>
                    <FoundationBadge foundation={FOUNDATION} />
                  </Show>
                  <Show when={!isUndefined(i.maturity)}>
                    <MaturityBadge level={i.maturity!} />
                  </Show>
                </div>
                <Show when={description() !== ''}>
                  <div class={styles.description}>{description()}</div>
                </Show>
              </div>

              {/* Stats Bar */}
              <Show when={githubData()}>
                {(gh) => (
                  <div class={styles.statsBar}>
                    <Show when={!isUndefined(gh().stars)}>
                      <div class={styles.statItem}>
                        <div class={styles.statValue}>{prettifyNumber(gh().stars)}</div>
                        <div class={styles.statLabel}>Stars</div>
                      </div>
                    </Show>
                    <Show when={!isUndefined(gh().contributors)}>
                      <div class={styles.statItem}>
                        <div class={styles.statValue}>{prettifyNumber(gh().contributors.count)}</div>
                        <div class={styles.statLabel}>Contributors</div>
                      </div>
                    </Show>
                    <Show when={!isUndefined(gh().license)}>
                      <div class={styles.statItem}>
                        <div class={styles.statValue}>{gh().license}</div>
                        <div class={styles.statLabel}>License</div>
                      </div>
                    </Show>
                    <Show when={!isUndefined(gh().latest_release)}>
                      <div class={styles.statItem}>
                        <div class={styles.statValue}>{new Date(gh().latest_release!.ts).toLocaleDateString()}</div>
                        <div class={styles.statLabel}>Latest Release</div>
                      </div>
                    </Show>
                  </div>
                )}
              </Show>

              {/* Action Cards Grid */}
              <div class={styles.cardsGrid}>
                {/* Get Started */}
                <Show when={!isUndefined(i.website) || !isUndefined(i.documentation_url)}>
                  <div class={styles.actionCard}>
                    <div class={styles.cardTitle}>Get Started</div>
                    <Show when={!isUndefined(i.website)}>
                      <ExternalLink href={i.website!} class={styles.cardLink}>
                        <SVGIcon kind={SVGIconKind.World} class={styles.cardLinkIcon} />
                        <span>Website</span>
                      </ExternalLink>
                    </Show>
                    <Show when={!isUndefined(i.documentation_url)}>
                      <ExternalLink href={i.documentation_url!} class={styles.cardLink}>
                        <SVGIcon kind={SVGIconKind.Documentation} class={styles.cardLinkIcon} />
                        <span>Documentation</span>
                      </ExternalLink>
                    </Show>
                  </div>
                </Show>

                {/* Contribute */}
                <Show when={goodFirstIssuesUrl()}>
                  {(url) => (
                    <div class={styles.actionCard}>
                      <div class={styles.cardTitle}>Contribute</div>
                      <ExternalLink href={url()} class={styles.cardLink}>
                        <SVGIcon kind={SVGIconKind.GitHub} class={styles.cardLinkIcon} />
                        <span>Good First Issues</span>
                      </ExternalLink>
                    </div>
                  )}
                </Show>

                {/* Jobs */}
                <Show when={gitjobsUrl()}>
                  {(url) => (
                    <div class={styles.actionCard}>
                      <div class={styles.cardTitle}>Jobs</div>
                      <ExternalLink href={url()} class={styles.cardLink}>
                        <SVGIcon kind={SVGIconKind.Link} class={styles.cardLinkIcon} />
                        <span>Find jobs on GitJobs</span>
                      </ExternalLink>
                    </div>
                  )}
                </Show>

                {/* Community */}
                <Show when={communityLinks().length > 0}>
                  <div class={styles.actionCard}>
                    <div class={styles.cardTitle}>Community</div>
                    <For each={communityLinks()}>
                      {(link) => (
                        <ExternalLink href={link.url} class={styles.cardLink}>
                          <SVGIcon kind={link.icon} class={styles.cardLinkIcon} />
                          <span>{link.label}</span>
                        </ExternalLink>
                      )}
                    </For>
                  </div>
                </Show>

                {/* Social */}
                <Show when={socialLinks().length > 0}>
                  <div class={styles.actionCard}>
                    <div class={styles.cardTitle}>Social</div>
                    <For each={socialLinks()}>
                      {(link) => (
                        <ExternalLink href={link.url} class={styles.cardLink}>
                          <SVGIcon kind={link.icon} class={styles.cardLinkIcon} />
                          <span>{link.label}</span>
                        </ExternalLink>
                      )}
                    </For>
                  </div>
                </Show>

                {/* Code */}
                <Show when={codeLinks().length > 0}>
                  <div class={styles.actionCard}>
                    <div class={styles.cardTitle}>Code</div>
                    <For each={codeLinks()}>
                      {(link) => (
                        <ExternalLink href={link.url} class={styles.cardLink}>
                          <SVGIcon kind={link.icon} class={styles.cardLinkIcon} />
                          <span>{link.label}</span>
                        </ExternalLink>
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              {/* Footer */}
              <div class={styles.poweredBy}>
                Powered by <ExternalLink href="https://landscape.cncf.io">CNCF Landscape</ExternalLink>
              </div>
            </div>
          );
        }}
      </Match>
    </Switch>
  );
};

export default KioskView;
