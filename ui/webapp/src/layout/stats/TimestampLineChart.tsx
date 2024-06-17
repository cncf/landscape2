import { prettifyNumber } from 'common';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { SolidApexCharts } from 'solid-apexcharts';
import { createSignal, onMount, Show } from 'solid-js';

interface Props {
  name: string;
  tooltipTitle?: string;
  data?: number[];
}

const TimestampLineChart = (props: Props) => {
  const [series, setSeries] = createSignal<number[][]>([]);

  onMount(() => {
    if (!isUndefined(props.data)) {
      const values: number[][] = [];
      const data = props.data || [];

      data.forEach((v: number, index: number) => {
        const timestamp = moment()
          .subtract(data.length - index - 1, 'weeks')
          .format('x');
        values.push([parseInt(timestamp), v]);
      });

      setSeries(values);
    }
  });

  const getChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        fontFamily: "'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif !default",
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
      tooltip: {
        fillSeriesColor: false,
        y: {
          title: {
            formatter: (): string => {
              return !isUndefined(props.tooltipTitle) ? `${props.tooltipTitle}: ` : '';
            },
          },
          formatter: (val: number): string => {
            return prettifyNumber(val) as string;
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
                  return prettifyNumber(val) as string;
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
        <div class="card-body">
          <SolidApexCharts
            options={getChartConfig()}
            series={[{ name: props.name, data: series() }]}
            type="line"
            height={250}
          />
        </div>
      </div>
    </Show>
  );
};

export default TimestampLineChart;
