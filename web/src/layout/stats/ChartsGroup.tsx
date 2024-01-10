import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import moment from 'moment';
import { SolidApexCharts } from 'solid-apexcharts';
import { createSignal, onMount, Show } from 'solid-js';

import rgba2hex from '../../utils/rgba2hex';
import HeatMapChart from './HeatMapChart';

interface Props {
  data: { [key: string]: number };
  running_total: { [key: string]: number };
  name: string;
}

interface AreaData {
  x: string;
  y: number;
}

const ChartsGroup = (props: Props) => {
  const [areaSeries, setAreaSeries] = createSignal<AreaData[]>([]);

  onMount(() => {
    const seriesTmp: AreaData[] = [];
    if (!isUndefined(props.running_total)) {
      Object.keys(props.running_total).forEach((d: string) => {
        seriesTmp.push({ x: d, y: props.running_total[d] });
      });
      setAreaSeries(sortBy(seriesTmp, 'x'));
    }
  });

  const getAreaChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        fontFamily: "'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif !default",
        height: 250,
        type: 'area',
        redrawOnWindowResize: true,
        redrawOnParentResize: true,
        zoom: {
          type: 'x',
          enabled: true,
          autoScaleYaxis: true,
          zoomedArea: {
            fill: {
              color: 'rgba(0, 0, 0, 0.15)',
              opacity: 0.4,
            },
            stroke: {
              color: 'var(--color-stats-1)',
              opacity: 0.8,
              width: 1,
            },
          },
        },
        // Temporary solution -> https://github.com/apexcharts/apexcharts.js/issues/4154 and https://github.com/apexcharts/Blazor-ApexCharts/issues/376
        animations: {
          enabled: false,
        },
        toolbar: {
          autoSelected: 'zoom',
          tools: {
            download: false,
            pan: false,
          },
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          beforeZoom: (chartContext: any, opt: any) => {
            const minDate = chartContext.ctx.data.twoDSeriesX[0];
            const maxDate = chartContext.ctx.data.twoDSeriesX[chartContext.ctx.data.twoDSeriesX.length - 1];
            let newMinDate = parseInt(opt.xaxis.min);
            let newMaxDate = parseInt(opt.xaxis.max);
            // Min range 1 week
            if (newMinDate > chartContext.minX) {
              const maxRange = moment(newMinDate).add(1, 'w').valueOf();
              if (moment(newMaxDate).isBefore(maxRange) && moment(maxRange).isBefore(maxDate)) {
                newMaxDate = maxRange;
              } else {
                const minRange = moment(newMaxDate).subtract(1, 'w').valueOf();
                if (moment(newMinDate).isAfter(minRange)) {
                  newMinDate = minRange;
                }
              }
            }
            return {
              xaxis: {
                min: newMinDate < minDate ? minDate : newMinDate,
                max: newMaxDate > maxDate ? maxDate : newMaxDate,
              },
            };
          },
        },
      },
      grid: { borderColor: 'var(--bs-gray-200)' },
      dataLabels: {
        enabled: false,
      },
      colors: ['var(--color-stats-1)'],
      stroke: {
        curve: 'smooth',
      },
      fill: {
        opacity: 0.5,
        colors:
          window.baseDS.colors && window.baseDS.colors.color1 ? [rgba2hex(window.baseDS.colors.color1)] : ['#0086FF'], // Using css var breaks gradient
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeFormatter: {
            year: 'yyyy',
            month: "MMM'yy",
            day: 'dd MMM',
            hour: 'dd MMM',
          },
          style: {
            colors: 'var(--color-font)',
            fontSize: '11px',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: ['var(--color-font)'],
          },
        },
      },
      markers: {
        size: 0,
      },
    };
  };

  return (
    <Show when={areaSeries().length > 0}>
      <div class="py-4">
        <div class="row g-3 g-lg-4 g-xxl-5 justify-content-center">
          <div class="col-12 col-sm-6 col-xl-8">
            <div class="card rounded-0">
              <div class="card-body">
                <SolidApexCharts
                  options={getAreaChartConfig()}
                  series={[{ name: props.name, data: areaSeries() }]}
                  type="area"
                  height={250}
                />
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-xl-4">
            <HeatMapChart data={props.data} />
          </div>
        </div>
      </div>
    </Show>
  );
};

export default ChartsGroup;
