import groupBy from 'lodash/groupBy';
import isNumber from 'lodash/isNumber';
import moment from 'moment';
import { SolidApexCharts } from 'solid-apexcharts';
import { Show } from 'solid-js';

import rgba2hex from '../../utils/rgba2hex';

interface Props {
  name?: string;
  tooltipTitle?: string;
  data: { [key: string]: number };
}

interface HeatMapData {
  name: string;
  data: number[];
}

interface DistributionData {
  month: number;
  total: number;
  year: number;
}

const HeatMapChart = (props: Props) => {
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
      title: {
        text: props.name,
        style: {
          color: 'var(--bs-gray-600)',
          fontWeight: '600',
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
          title: {
            formatter: (seriesName: string): string => {
              return `${props.tooltipTitle || seriesName}: `;
            },
          },
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
      responsive: [
        {
          breakpoint: 992,
          options: {
            chart: {
              redrawOnWindowResize: false,
              redrawOnParentResize: false,
            },
          },
        },
      ],
    };
  };

  return (
    <Show when={Object.keys(props.data).length > 0}>
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
    </Show>
  );
};

export default HeatMapChart;
