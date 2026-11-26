import { prettifyNumber } from 'common';
import isUndefined from 'lodash/isUndefined';
import { SolidApexCharts } from 'solid-apexcharts';
import { createMemo, Show } from 'solid-js';

import { buildWeeklyTimestamps, CHART_FONT_FAMILY } from './chartData';
import ChartDataTable from './ChartDataTable';

interface Props {
  name: string;
  /** Date the data was collected at, the date of the last weekly value. */
  referenceDate: string;
  data?: number[];
  tooltipTitle?: string;
}

const TimestampLineChart = (props: Props) => {
  // One point per weekly value, the last one on the reference date
  const series = createMemo(() => {
    const data = props.data ?? [];
    const timestamps = buildWeeklyTimestamps(data.length, props.referenceDate);
    return data.map((value: number, index: number) => [timestamps[index], value]);
  });

  const getChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        fontFamily: CHART_FONT_FAMILY,
        height: 250,
        type: 'line',
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
      stroke: {
        curve: 'straight',
      },
      markers: {
        size: [6],
        colors: ['var(--color-stats-1)'],
        strokeWidth: 3,
        radius: 3,
      },
      grid: { borderColor: 'var(--bs-gray-200)' },
      dataLabels: {
        enabled: false,
      },
      colors: ['var(--color-stats-1)'],
      xaxis: {
        type: 'datetime',
        labels: {
          format: `dd/MM/yy`,
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
            return prettifyNumber(value);
          },
        },
      },
      tooltip: {
        fillSeriesColor: false,
        y: {
          title: {
            formatter: (): string => {
              return !isUndefined(props.tooltipTitle) ? `${props.tooltipTitle}: ` : '';
            },
          },
          formatter: (val: number): string => {
            return prettifyNumber(val);
          },
        },
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            chart: {
              toolbar: {
                show: false,
              },
            },
            markers: {
              size: [3],
              strokeWidth: 1,
            },
            stroke: {
              width: [2],
            },
            yaxis: {
              labels: {
                formatter: (val: number): string => {
                  return prettifyNumber(val);
                },
              },
            },
          },
        },
      ],
    };
  };

  return (
    <Show when={series().length > 0}>
      <div class="card rounded-0">
        <div class="card-body" aria-hidden={true}>
          <SolidApexCharts
            options={getChartConfig()}
            series={[{ name: props.name, data: series() }]}
            type="line"
            height={250}
          />
        </div>
        <ChartDataTable
          caption={props.name}
          columns={['Week', props.tooltipTitle ?? 'Value']}
          rows={series().map(([timestamp, value]) => [new Date(timestamp).toISOString().slice(0, 10), value])}
        />
      </div>
    </Show>
  );
};

export default TimestampLineChart;
