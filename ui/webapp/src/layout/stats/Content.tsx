import { useLocation } from '@solidjs/router';
import { prettifyNumber, sortObjectByValue } from 'common';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createMemo, createSignal, For, onMount, Show } from 'solid-js';

import { StateContent, Stats } from '../../types';
import prettifyBytes from '../../utils/prettifyBytes';
import scrollToTop from '../../utils/scrollToTop';
import Box from './Box';
import ChartsGroup from './ChartsGroup';
import CollapsableTable from './CollapsableTable';
import HeatMapChart from './HeatMapChart';
import HorizontalBarChart from './HorizontalBarChart';
import styles from './Stats.module.css';
import TimestampLineChart from './TimestampLineChart';
import VerticalBarChart from './VerticalBarChart';

const Content = () => {
  const location = useLocation();
  const state = createMemo(() => location.state || {});
  const [stats, setStats] = createSignal<Stats>();
  const from = () => (state() as StateContent).from || undefined;

  const sumValues = (numbers: number[]): number => {
    return numbers.reduce((a, b) => a + b, 0);
  };

  onMount(() => {
    setStats(window.statsDS);
    if (from() === 'header') {
      scrollToTop(false);
    }
  });

  return (
    <Show when={!isUndefined(stats())}>
      <div class="d-flex flex-row">
        <div class="container-lg py-3 py-lg-5 position-relative">
          {/* Projects */}
          <Show when={!isUndefined(stats()!.projects)}>
            <div class="mb-2 mb-lg-5">
              <div class={`text-dark fw-bold text-uppercase text-center mb-3 mb-lg-4 ${styles.title}`}>Projects</div>
              <div class={`text-dark text-center mb-2 mb-lg-4 fw-bold ${styles.subtitle}`}>
                Distribution by maturity
              </div>
              <div class="d-flex flex-row justify-content-center flex-wrap w-100 pt-4">
                <Box data={stats()!.projects!.projects} label="Total" />

                <Show when={!isEmpty(stats()!.projects!.maturity)}>
                  <For each={sortObjectByValue(stats()!.projects!.maturity, 'asc')}>
                    {(maturity: string) => {
                      const num = stats()!.projects!.maturity[maturity];
                      const total = stats()!.projects!.projects;

                      return (
                        <Show when={!isUndefined(num) && !isUndefined(total)}>
                          <Box data={num} legend={`(${((num * 100) / total).toFixed(2)}%)`} label={maturity} />
                        </Show>
                      );
                    }}
                  </For>
                </Show>
              </div>

              <Show when={!isEmpty(stats()!.projects!.accepted_at)}>
                <div class={`text-dark text-center mt-3 mt-lg-0 mb-2 mb-lg-4 fw-bold ${styles.subtitle}`}>
                  Accepted over time
                </div>
                <ChartsGroup
                  name="Projects"
                  data={stats()!.projects!.accepted_at}
                  running_total={stats()!.projects!.accepted_at_rt}
                />
              </Show>

              <Show
                when={
                  !isEmpty(stats()!.projects!.sandbox_to_incubating) ||
                  !isEmpty(stats()!.projects!.incubating_to_graduated)
                }
              >
                <div class={`text-dark text-center my-0 my-lg-4 fw-bold ${styles.subtitle}`}>Promotions</div>
                <div class="py-4">
                  <div class="row g-3 g-lg-4 g-xxl-5 justify-content-center">
                    <Show when={!isEmpty(stats()!.projects!.sandbox_to_incubating)}>
                      <div class="col-12 col-sm-6">
                        <HeatMapChart
                          name="From Sandbox to Incubating"
                          tooltipTitle="Projects"
                          data={stats()!.projects!.sandbox_to_incubating}
                        />
                      </div>
                    </Show>

                    <Show when={!isEmpty(stats()!.projects!.incubating_to_graduated)}>
                      <div class="col-12 col-sm-6">
                        <HeatMapChart
                          name="From Incubating to Graduated"
                          tooltipTitle="Projects"
                          data={stats()!.projects!.incubating_to_graduated}
                        />
                      </div>
                    </Show>
                  </div>
                </div>
              </Show>

              <Show when={!isEmpty(stats()!.projects!.audits) && !isEmpty(stats()!.projects!.audits_rt)}>
                <div class={`text-dark text-center my-0 my-lg-4 fw-bold ${styles.subtitle}`}>Security audits</div>
                <ChartsGroup
                  name="Projects"
                  data={stats()!.projects!.audits}
                  running_total={stats()!.projects!.audits_rt}
                />
              </Show>
              <div class={`text-dark text-center my-0 my-lg-4 fw-bold ${styles.subtitle}`}>
                <Show when={!isEmpty(stats()!.projects!.tag)} fallback="Distribution by category and subcategory">
                  Distribution by category, subcategory and TAG
                </Show>
              </div>
              <div class="py-4">
                <div class="row g-3 g-lg-4 g-xxl-5 justify-content-center">
                  <div class="col-12 col-sm-6">
                    <CollapsableTable data={stats()!.projects!.category} />
                  </div>

                  <Show when={!isEmpty(stats()!.projects!.tag)}>
                    <div class="col-12 col-sm-6">
                      <table class={`table table-bordered table-striped mb-0 mb-lg-2 ${styles.table}`}>
                        <thead>
                          <tr>
                            <th class="text-center" scope="col">
                              TAG
                            </th>
                            <th class={`text-center ${styles.projectsCol}`} scope="col">
                              Projects
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={Object.keys(stats()!.projects!.tag!).sort()}>
                            {(tag: string) => {
                              return (
                                <tr>
                                  <td>TAG {tag}</td>
                                  <td class="text-end">{stats()!.projects!.tag![tag]}</td>
                                </tr>
                              );
                            }}
                          </For>
                          <tr>
                            <td class="fw-semibold text-uppercase">Total</td>
                            <td class="text-end fw-semibold">{sumValues(Object.values(stats()!.projects!.tag!))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Show>
                </div>
              </div>
            </div>
          </Show>

          {/* Members */}
          <Show when={!isUndefined(stats()!.members)}>
            <div class="mb-2 mb-lg-5">
              <div class={`text-dark fw-bold text-uppercase text-center mb-3 mb-lg-4 ${styles.title}`}>Members</div>
              <div class={`text-dark text-center mb-2 mb-lg-4 fw-bold ${styles.subtitle}`}>
                Distribution by category
              </div>
              <div class="d-flex flex-row justify-content-center flex-wrap w-100 pt-4">
                <Box data={stats()!.members!.members} label="Total" />

                <Show when={!isEmpty(stats()!.members!.subcategories)}>
                  <For each={sortObjectByValue(stats()!.members!.subcategories, 'asc')}>
                    {(subcategory: string) => {
                      const num = stats()!.members!.subcategories[subcategory];
                      const total = stats()!.members!.members;

                      return (
                        <Show when={!isUndefined(num) && !isUndefined(total)}>
                          <Box data={num} legend={`(${((num * 100) / total).toFixed(2)}%)`} label={subcategory} />
                        </Show>
                      );
                    }}
                  </For>
                </Show>
              </div>

              <Show when={!isEmpty(stats()!.members!.joined_at)}>
                <div class={`text-dark text-center mt-3 mt-lg-0 mb-2 mb-lg-4 fw-bold ${styles.subtitle}`}>
                  Memberships over time
                </div>
                <ChartsGroup
                  name="Members"
                  data={stats()!.members!.joined_at}
                  running_total={stats()!.members!.joined_at_rt}
                />
              </Show>
            </div>
          </Show>

          {/* Repositories */}
          <Show when={!isUndefined(stats()!.repositories)}>
            <div
              classList={{
                'mb-2 mb-lg-5': !isUndefined(stats()!.organizations),
              }}
            >
              <div class={`text-dark fw-bold text-uppercase text-center mb-2 mb-lg-4 ${styles.title}`}>
                Repositories
              </div>
              <div class="d-flex flex-row justify-content-center flex-wrap w-100 pt-4">
                <Box data={stats()!.repositories!.repositories} label="Repositories" />
                <Box data={prettifyNumber(stats()!.repositories!.contributors, 1)} label="Contributors" />
                <Box data={prettifyNumber(stats()!.repositories!.stars, 1)} label="Stars" />
                <Box data={prettifyBytes(stats()!.repositories!.bytes, 0)} label="Source code" />
              </div>

              <Show
                when={!isEmpty(stats()!.repositories!.languages) || !isEmpty(stats()!.repositories!.languages_bytes)}
              >
                <div class={`text-dark text-center mt-2 mt-lg-0 mb-0 mb-lg-4 fw-bold ${styles.subtitle}`}>
                  Most popular languages
                </div>
                <div class="py-4">
                  <div class="row g-3 g-lg-4 g-xxl-5 justify-content-center">
                    <Show when={!isEmpty(stats()!.repositories!.languages)}>
                      <div class="col-12 col-sm-6">
                        <HorizontalBarChart
                          name="By number of repositories"
                          data={stats()!.repositories!.languages}
                          total={stats()!.repositories!.repositories}
                        />
                      </div>
                    </Show>

                    <Show when={!isEmpty(stats()!.repositories!.languages_bytes)}>
                      <div class="col-12 col-sm-6">
                        <HorizontalBarChart
                          name="By amount of source code"
                          data={stats()!.repositories!.languages_bytes}
                          total={stats()!.repositories!.bytes}
                          dataType="bytes"
                        />
                      </div>
                    </Show>
                  </div>
                </div>
              </Show>

              <Show when={!isEmpty(stats()!.repositories!.participation_stats)}>
                <div class={`text-dark text-center my-0 my-lg-4 fw-bold ${styles.subtitle}`}>Activity</div>
                <div class="py-4">
                  <div class="row gx-3 gx-lg-4 gx-xxl-5 justify-content-center">
                    <div class="col-12">
                      <TimestampLineChart
                        tooltipTitle="Commits number"
                        name="Number of weekly commits during the last year"
                        data={stats()!.repositories!.participation_stats}
                      />
                    </div>
                  </div>
                </div>
              </Show>

              <Show when={!isEmpty(stats()!.repositories!.licenses)}>
                <div class={`text-dark text-center my-0 my-lg-4 fw-bold ${styles.subtitle}`}>Licenses</div>
                <div class="row gx-3 gx-lg-4 gx-xxl-5 justify-content-center py-4">
                  <div class="col-12">
                    <table class={`table table-bordered table-striped mb-0 mb-lg-2 ${styles.table}`}>
                      <thead>
                        <tr>
                          <th class="text-center" scope="col">
                            License
                          </th>
                          <th class="text-center" scope="col">
                            Repositories
                          </th>
                          <th class="text-center" scope="col">
                            Percentage
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={sortObjectByValue(stats()!.repositories!.licenses)}>
                          {(license: string) => {
                            const num = stats()!.repositories!.licenses[license];
                            const total = stats()!.repositories!.repositories;

                            return (
                              <Show when={!isUndefined(num) && !isUndefined(total)}>
                                <tr>
                                  <td>{license}</td>
                                  <td class="text-end">{stats()!.repositories!.licenses[license]}</td>
                                  <td class="fw-semibold text-end">
                                    <small>{((num * 100) / total).toFixed(2)}%</small>
                                  </td>
                                </tr>
                              </Show>
                            );
                          }}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          {/* ORGANIZATIONS */}
          <Show
            when={
              !isUndefined(stats()!.organizations) &&
              (!isEmpty(stats()!.organizations!.acquisitions) ||
                !isEmpty(stats()!.organizations!.acquisitions_price) ||
                !isEmpty(stats()!.organizations!.funding_rounds) ||
                !isEmpty(stats()!.organizations!.funding_rounds_money_raised))
            }
          >
            <div class={`text-dark fw-bold text-uppercase text-center mb-3 mb-lg-4 ${styles.title}`}>Organizations</div>

            <div class={`text-dark text-center my-0 my-lg-4 fw-bold ${styles.subtitle}`}>Funding rounds</div>

            <div class="py-4">
              <div class="row g-3 g-lg-4 g-xxl-5 justify-content-center">
                <Show when={!isEmpty(stats()!.organizations!.funding_rounds)}>
                  <div class="col-12 col-sm-6">
                    <VerticalBarChart
                      name="Number of funding rounds per year"
                      data={stats()!.organizations!.funding_rounds}
                    />
                  </div>
                </Show>

                <Show when={!isEmpty(stats()!.organizations!.funding_rounds_money_raised)}>
                  <div class="col-12 col-sm-6">
                    <VerticalBarChart
                      name="Amount raised in funding rounds per year (excluding undisclosed)"
                      shortName="Amount raised in funding rounds per year"
                      data={stats()!.organizations!.funding_rounds_money_raised}
                      dataType="money"
                    />
                  </div>
                </Show>
              </div>
            </div>

            <div class={`text-dark text-center my-0 my-lg-4 fw-bold ${styles.subtitle}`}>Acquisitions</div>

            <div class="pt-4">
              <div class="row g-3 g-lg-4 g-xxl-5 justify-content-center">
                <Show when={!isEmpty(stats()!.organizations!.acquisitions)}>
                  <div class="col-12 col-sm-6">
                    <VerticalBarChart
                      name="Number of acquisitions per year"
                      data={stats()!.organizations!.acquisitions}
                    />
                  </div>
                </Show>

                <Show when={!isEmpty(stats()!.organizations!.acquisitions_price)}>
                  <div class="col-12 col-sm-6">
                    <VerticalBarChart
                      name="Acquisitions cost per year (excluding undisclosed)"
                      shortName="Acquisitions cost per year"
                      data={stats()!.organizations!.acquisitions_price}
                      dataType="money"
                    />
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default Content;
