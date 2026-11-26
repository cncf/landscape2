import { parseYearMonth } from 'common';
import groupBy from 'lodash/groupBy';
import isNumber from 'lodash/isNumber';
import { SolidApexCharts } from 'solid-apexcharts';
import { Show } from 'solid-js';

import rgba2hex from '../../utils/rgba2hex';
import { CHART_FONT_FAMILY } from './chartData';
import ChartDataTable from './ChartDataTable';

interface Props {
  data: { [key: string]: number };
  /** Caption of the data table, the chart name by default. */
  caption?: string;
  name?: string;
  tooltipTitle?: string;
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
      const { year, month } = parseYearMonth(d);
      distribution.push({
        year,
        // Zero-based month, the index of the month in the series data
        month: month - 1,
        total: props.data[d],
      });
    });

    const series: HeatMapData[] = [];
    const groupedByYear = groupBy(distribution, 'year');

    Object.keys(groupedByYear).forEach((year: string) => {
      const currentData = new Array(12).fill(0);
      groupedByYear[year].forEach((i: DistributionData) => {
        currentData[i.month] = i.total;
      });
      series.push({ name: year, data: currentData });
    });

    return series;
  };

  const getHeatMapChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        fontFamily: CHART_FONT_FAMILY,
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
      colors: [rgba2hex(window.baseDS.colors.color1)], // Using css var breaks heat range
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
        <div class="card-body" aria-hidden={true}>
          <SolidApexCharts
            options={getHeatMapChartConfig()}
            series={prepareHeatMapData()}
            type="heatmap"
            height={250}
          />
        </div>
        <ChartDataTable
          caption={props.caption ?? props.name ?? 'Distribution per month'}
          columns={['Month', props.tooltipTitle ?? 'Value']}
          rows={Object.keys(props.data)
            .sort()
            .map((month) => [month, props.data[month]])}
        />
      </div>
    </Show>
  );
};

export default HeatMapChart;
