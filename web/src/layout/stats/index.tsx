import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { useContext } from 'react';

import prettifyBytes from '../../utils/prettifyBytes';
import prettifyNumber from '../../utils/prettifyNumber';
import sortObjectByValue from '../../utils/sortObjectByValue';
import { StatsContext, StatsProps } from '../context/AppContext';
import Footer from '../navigation/Footer';
import BarChart from './BarChart';
import Box from './Box';
import ChartsGroup from './ChartsGroup';
import HorizontalBarChart from './HorizontalBarChart';
import styles from './Stats.module.css';
import TimestampLineChart from './TimestampLineChart';

const Stats = () => {
  const { stats } = useContext(StatsContext) as StatsProps;

  return (
    <>
      <main className="flex-grow-1 container-fluid d-none d-lg-block px-4 position-relative">
        <div className="container-lg py-5 position-relative">
          {/* Projects */}
          {!isUndefined(stats.projects) && (
            <div className="mb-5">
              <div className={`text-dark fw-bold text-uppercase text-center mb-4 ${styles.title}`}>Projects</div>
              <div className={`text-dark text-center mb-4 fw-bold ${styles.subtitle}`}>Distribution by maturity</div>
              <div className="d-flex flex-row justify-content-center flex-wrap w-100 pt-4">
                <Box data={stats.projects.projects} label="Total" />

                {!isEmpty(stats.projects.maturity) && (
                  <>
                    {sortObjectByValue(stats.projects.maturity, 'asc').map((maturity: string) => {
                      const num = stats.projects?.maturity[maturity];
                      const total = stats.projects?.projects;
                      if (isUndefined(num) || isUndefined(total)) return null;

                      return (
                        <Box
                          key={`mat_${maturity}`}
                          data={num}
                          legend={`(${((num * 100) / total).toFixed(2)}%)`}
                          label={maturity}
                        />
                      );
                    })}
                  </>
                )}
              </div>

              {!isEmpty(stats.projects.accepted_at) && (
                <>
                  <div className={`text-dark text-center mb-4 fw-bold ${styles.subtitle}`}>Accepted over time</div>
                  <ChartsGroup
                    name="Projects"
                    data={stats.projects.accepted_at}
                    running_total={stats.projects.accepted_at_rt}
                  />
                </>
              )}

              {(!isEmpty(stats.projects.sandbox_to_incubating) || !isEmpty(stats.projects.incubating_to_graduated)) && (
                <>
                  <div className={`text-dark text-center my-4 fw-bold ${styles.subtitle}`}>Promotions</div>
                  <div className="py-4">
                    <div className="row gx-4 gx-xxl-5 justify-content-center">
                      {!isEmpty(stats.projects.sandbox_to_incubating) && (
                        <div className="col-12 col-md-6">
                          <BarChart
                            name="From Sandbox to Incubating"
                            tooltipTitle="Projects"
                            data={stats.projects.sandbox_to_incubating}
                          />
                        </div>
                      )}

                      {!isEmpty(stats.projects.incubating_to_graduated) && (
                        <div className="col-12 col-md-6">
                          <BarChart
                            name="From Incubating to Graduated"
                            tooltipTitle="Prjects"
                            data={stats.projects.incubating_to_graduated}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {!isEmpty(stats.projects.audits) && (
                <>
                  <div className={`text-dark text-center my-4 fw-bold ${styles.subtitle}`}>Security audits</div>
                  <ChartsGroup name="Projects" data={stats.projects.audits} running_total={stats.projects.audits_rt} />
                </>
              )}
            </div>
          )}

          {/* Members */}
          {!isUndefined(stats.members) && (
            <div className="mb-5">
              <div className={`text-dark fw-bold text-uppercase text-center mb-4 ${styles.title}`}>Members</div>
              <div className={`text-dark text-center mb-4 fw-bold ${styles.subtitle}`}>Distribution by category</div>
              <div className="d-flex flex-row justify-content-center flex-wrap w-100 pt-4">
                <Box data={stats.members.members} label="Total" />

                {!isEmpty(stats.members.subcategories) && (
                  <>
                    {sortObjectByValue(stats.members.subcategories, 'asc').map((subcategory: string) => {
                      const num = stats.members?.subcategories[subcategory];
                      const total = stats.members?.members;
                      if (isUndefined(num) || isUndefined(total)) return null;

                      return (
                        <Box
                          key={`subcat_${subcategory}`}
                          data={num}
                          legend={`(${((num * 100) / total).toFixed(2)}%)`}
                          label={subcategory}
                        />
                      );
                    })}
                  </>
                )}
              </div>

              {!isEmpty(stats.members.joined_at) && (
                <>
                  <div className={`text-dark text-center mb-4 fw-bold ${styles.subtitle}`}>Memberships over time</div>
                  <ChartsGroup
                    name="Members"
                    data={stats.members.joined_at}
                    running_total={stats.members.joined_at_rt}
                  />
                </>
              )}
            </div>
          )}

          {/* Repositories */}
          {!isUndefined(stats.repositories) && (
            <>
              <div className={`text-dark fw-bold text-uppercase text-center mb-4 ${styles.title}`}>Repositories</div>
              <div className="d-flex flex-row justify-content-center flex-wrap w-100 pt-4">
                <Box data={stats.repositories.repositories} label="Repositories" />
                <Box data={prettifyNumber(stats.repositories.contributors, 1)} label="Contributors" />
                <Box data={prettifyNumber(stats.repositories.stars, 1)} label="Stars" />
                <Box data={prettifyBytes(stats.repositories.bytes, 1)} label="Source code" />
              </div>

              {(!isEmpty(stats.repositories.languages) || !isEmpty(stats.repositories.languages_bytes)) && (
                <>
                  <div className={`text-dark text-center mb-4 fw-bold ${styles.subtitle}`}>Most popular languages</div>
                  <div className="py-4">
                    <div className="row gx-4 gx-xxl-5 justify-content-center">
                      {!isEmpty(stats.repositories.languages) && (
                        <div className="col-12 col-md-6">
                          <HorizontalBarChart
                            name="By number of repositories"
                            data={stats.repositories.languages}
                            total={stats.repositories.repositories}
                          />
                        </div>
                      )}

                      {!isEmpty(stats.repositories.languages_bytes) && (
                        <div className="col-12 col-md-6">
                          <HorizontalBarChart
                            name="By amount of source code"
                            data={stats.repositories.languages_bytes}
                            total={stats.repositories.bytes}
                            dataType="bytes"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {!isEmpty(stats.repositories.participation_stats) && (
                <>
                  <div className={`text-dark text-center my-4 fw-bold ${styles.subtitle}`}>Activity</div>
                  <div className="py-4">
                    <div className="row gx-4 gx-xxl-5 justify-content-center">
                      <div className="col-12">
                        <TimestampLineChart
                          tooltipTitle="Commits number"
                          name="Number of weekly commits during the last year"
                          data={stats.repositories.participation_stats}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!isEmpty(stats.repositories.licenses) && (
                <>
                  <div className={`text-dark text-center my-4 fw-bold ${styles.subtitle}`}>Licenses</div>

                  <div className="row gx-4 gx-xxl-5 justify-content-center pt-4">
                    <div className="col-12">
                      <table className={`table table-bordered table-striped ${styles.table}`}>
                        <thead>
                          <tr>
                            <th className="text-center" scope="col">
                              License
                            </th>
                            <th className="text-center" scope="col">
                              Repositories
                            </th>
                            <th className="text-center" scope="col">
                              Percentage
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortObjectByValue(stats.repositories.licenses).map((license: string) => {
                            const num = stats.repositories?.licenses[license];
                            const total = stats.repositories?.repositories;

                            if (isUndefined(num) || isUndefined(total)) return null;

                            return (
                              <tr key={`license_${license}`}>
                                <td>{license}</td>
                                <td className="text-end">{stats.repositories?.licenses[license]}</td>
                                <td className="fw-semibold text-end">
                                  <small>{((num * 100) / total).toFixed(2)}%</small>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer logo={window.baseDS.images.footer_logo} />
    </>
  );
};

export default Stats;
