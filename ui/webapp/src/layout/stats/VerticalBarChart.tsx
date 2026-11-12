import { prettifyNumber } from 'common';
import isUndefined from 'lodash/isUndefined';
import { SolidApexCharts } from 'solid-apexcharts';
import { createMemo, Show } from 'solid-js';

import { buildBarSeries, CHART_FONT_FAMILY } from './chartData';
import ChartDataTable from './ChartDataTable';

interface Props {
  name: string;
  shortName?: string;
  data?: { [key: string]: number };
  dataType?: string;
}

const VerticalBarChart = (props: Props) => {
  // One bar per year, in chronological order
  const series = createMemo(() => {
    const data = props.data ?? {};
    return buildBarSeries(data, Object.keys(data).sort());
  });

  const formatValue = (value: number): string =>
    !isUndefined(props.dataType) && props.dataType === 'money' ? `$${prettifyNumber(value)}` : `${value}`;

  const getBarChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        fontFamily: CHART_FONT_FAMILY,
        height: 350,
        type: 'bar',
        redrawOnWindowResize: true,
        redrawOnParentResize: true,
        toolbar: {
          autoSelected: 'zoom',
          tools: {
            download: false,
            pan: false,
          },
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
      plotOptions: {
        bar: {
          borderRadius: 0,
        },
      },
      dataLabels: {
        enabled: false,
      },
      colors: ['var(--color-stats-1)'],
      xaxis: {
        categories: series().categories,
        labels: {
          style: {
            colors: 'var(--color-font)',
            fontSize: '11px',
          },
        },
      },
      yaxis: {
        forceNiceScale: true,
        min: 0,
        labels: {
          formatter: (value: number): string => {
            if (!isUndefined(props.dataType) && props.dataType === 'money') {
              return `$${prettifyNumber(value)}`;
            } else {
              return value.toFixed(0);
            }
          },
        },
      },
      tooltip: {
        y: {
          title: {
            formatter: (): string => {
              return '';
            },
          },
          formatter: formatValue,
        },
      },
      responsive: [
        {
          breakpoint: 992,
          options: {
            title: {
              text: props.shortName || props.name,
            },
            xaxis: {
              tickAmount: 3,
            },
          },
        },
      ],
    };
  };

  return (
    <Show when={series().values.length > 0}>
      <div class="card rounded-0">
        <div class="card-body" aria-hidden={true}>
          <SolidApexCharts
            options={getBarChartConfig()}
            series={[{ name: props.name, data: series().values }]}
            type="bar"
            height={350}
          />
        </div>
        <ChartDataTable
          caption={props.name}
          columns={['Year', 'Value']}
          rows={series().categories.map((category, index) => [category, formatValue(series().values[index])])}
        />
      </div>
    </Show>
  );
};

export default VerticalBarChart;
