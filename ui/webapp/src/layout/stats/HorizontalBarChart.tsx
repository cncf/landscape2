import { sortObjectByValue } from 'common';
import isUndefined from 'lodash/isUndefined';
import { SolidApexCharts } from 'solid-apexcharts';
import { createMemo, Show } from 'solid-js';

import prettifyBytes from '../../utils/prettifyBytes';
import { buildBarSeries, CHART_FONT_FAMILY, formatShare } from './chartData';
import ChartDataTable from './ChartDataTable';

interface Props {
  name: string;
  total: number;
  data?: { [key: string]: number };
  dataType?: string;
}

const HorizontalBarChart = (props: Props) => {
  // One bar per key, from the largest value to the smallest
  const series = createMemo(() => {
    const data = props.data ?? {};
    return buildBarSeries(data, sortObjectByValue(data));
  });

  const formatValue = (value: number): string =>
    !isUndefined(props.dataType) && props.dataType === 'bytes' ? prettifyBytes(value) : value.toString();

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
          horizontal: true,
        },
      },
      dataLabels: {
        enabled: false,
      },
      colors: ['var(--color-stats-1)'],
      xaxis: {
        min: 0,
        tickAmount: 6,
        categories: series().categories,
        labels: {
          style: {
            colors: 'var(--color-font)',
            fontSize: '11px',
          },
          formatter: (value: string): string => {
            if (!isUndefined(props.dataType) && props.dataType === 'bytes') {
              return prettifyBytes(parseInt(value), 1);
            } else {
              return parseInt(value).toString();
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
          formatter: (val: number): string => `${formatValue(val)} (${formatShare(val, props.total)})`,
        },
      },
      responsive: [
        {
          breakpoint: 1200,
          options: {
            xaxis: {
              tickAmount: 4,
              max: series().values[0],
              labels: {
                style: {
                  fontSize: '10px',
                },
              },
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
          columns={['Name', 'Value', 'Share']}
          rows={series().categories.map((category, index) => {
            const value = series().values[index];
            return [category, formatValue(value), formatShare(value, props.total)];
          })}
        />
      </div>
    </Show>
  );
};

export default HorizontalBarChart;
