import groupBy from 'lodash/groupBy';
import isNumber from 'lodash/isNumber';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import moment from 'moment';
import { SolidApexCharts } from 'solid-apexcharts';
import { createSignal, onMount, Show } from 'solid-js';

interface Props {
  data: { [key: string]: number };
  running_total: { [key: string]: number };
  name: string;
}

interface HeatMapData {
  name: string;
  data: number[];
}

interface AreaData {
  x: string;
  y: number;
}

interface DistributionData {
  month: number;
  total: number;
  year: number;
}

const REGEX_RGBA = /^rgba?\(|\s+|\)$/g;

const rgba2hex = (rgba: string): string => {
  return (
    '#' +
    rgba
      .replace(REGEX_RGBA, '')
      .split(',')
      .filter((_string, index) => index !== 3)
      .map((string) => parseFloat(string))
      .map((number, index) => (index === 3 ? Math.round(number * 255) : number))
      .map((number) => number.toString(16))
      .map((string) => (string.length === 1 ? '0' + string : string))
      .join('')
  );
};

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

  const prepareHeatMapData = () => {
    const distribution: DistributionData[] = [];

    Object.keys(props.data).forEach((d: string) => {
      const date = moment(d, 'YYYY-MM');
      distribution.push({
        year: date.get('year'),
        month: date.get('month'),
        total: props.data[d],
      });
    });

    const series: HeatMapData[] = [];
    const groupedByYear = groupBy(distribution, 'year');

    // We use 10 by default and add 10 to the rest of values
    // due to a bug displaying proper bg color in heatmap
    Object.keys(groupedByYear).forEach((year: string) => {
      const currentData = new Array(12).fill(0);
      groupedByYear[year].forEach((i: DistributionData) => {
        currentData[i.month - 1] = i.total;
      });
      series.push({ name: year, data: currentData });
    });

    return series;
  };

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

  const getHeatMapChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        height: 250,
        type: 'heatmap',
        redrawOnWindowResize: true,
        redrawOnParentResize: true,
        toolbar: {
          show: false,
        },
      },
      grid: { borderColor: 'var(--bs-gray-200)' },
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      dataLabels: {
        enabled: false,
      },
      legend: { show: false },
      colors:
        window.baseDS.colors && window.baseDS.colors.color1 ? [rgba2hex(window.baseDS.colors.color1)] : ['#0086FF'], // Using css var breaks heat range
      xaxis: {
        labels: {
          style: {
            colors: 'var(--color-font)',
            fontSize: '10px',
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
      tooltip: {
        y: {
          formatter: (val: number): string => {
            return isNumber(val) ? val.toString() : val;
          },
        },
      },
      states: {
        hover: {
          filter: {
            type: 'darken',
            value: 0.8,
          },
        },
      },
    };
  };

  return (
    <Show when={areaSeries().length > 0}>
      <div class="py-4">
        <div class="row g-4 g-xxl-5 justify-content-center">
          <div class="col-12 col-md-6 col-xl-8">
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

          <div class="col-12 col-md-6 col-xl-4">
            <div class="card rounded-0">
              <div class="card-body">
                <SolidApexCharts
                  options={getHeatMapChartConfig()}
                  series={prepareHeatMapData()}
                  type="heatmap"
                  height={250}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default ChartsGroup;
