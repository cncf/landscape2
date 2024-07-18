import { sortObjectByValue } from 'common';
import isUndefined from 'lodash/isUndefined';
import { SolidApexCharts } from 'solid-apexcharts';
import { createSignal, onMount, Show } from 'solid-js';

import prettifyBytes from '../../utils/prettifyBytes';
import styles from './HorizontalBarChart.module.css';

interface Props {
  name: string;
  tooltipTitle?: string;
  total: number;
  data?: { [key: string]: number };
  dataType?: string;
}

const HorizontalBarChart = (props: Props) => {
  const [sortedKeys, setSortedKeys] = createSignal<string[]>([]);
  const [series, setSeries] = createSignal<number[]>([]);
  const [maxValue, setMaxValue] = createSignal<number>();

  onMount(() => {
    if (props.data) {
      const keys = sortObjectByValue(props.data);
      setMaxValue(props.data[keys[0]]);
      setSortedKeys(keys);
      const values: number[] = [];
      keys.forEach((k: string) => {
        if (props.data && props.data[k]) {
          values.push(props.data[k]);
        }
      });
      setSeries(values);
    }
  });

  const getBarChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        fontFamily: "'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif !default",
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
        categories: sortedKeys(),
        labels: {
          style: {
            colors: 'var(--color-font)',
            fontSize: '11px',
          },
          formatter: (value: string): string => {
            if (!isUndefined(props.dataType) && props.dataType === 'bytes') {
              return prettifyBytes(parseInt(value));
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
          formatter: (val: number): string => {
            if (!isUndefined(props.dataType) && props.dataType === 'bytes') {
              return `${prettifyBytes(val)} (${((val * 100) / props.total).toFixed(2)}%)`;
            } else {
              return `${val} (${((val * 100) / props.total).toFixed(2)}%)`;
            }
          },
        },
      },
      responsive: [
        {
          breakpoint: 992,
          options: {
            xaxis: {
              tickAmount: 3,
              max: maxValue(),
            },
          },
        },
      ],
    };
  };

  return (
    <Show when={series().length > 0}>
      <div class="card rounded-0">
        <div class={`card-body ${styles.chart}`}>
          <SolidApexCharts
            options={getBarChartConfig()}
            series={[{ name: props.name, data: series() }]}
            type="bar"
            height={350}
          />
        </div>
      </div>
    </Show>
  );
};

export default HorizontalBarChart;
