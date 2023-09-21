import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';

import prettifyNumber from '../../utils/prettifyNumber';

interface Props {
  name: string;
  tooltipTitle?: string;
  data: { [key: string]: number };
}

interface BarData {
  x: string;
  y: number;
}

const BarChart = (props: Props) => {
  const [series, setSeries] = useState<BarData[]>([]);

  useEffect(() => {
    const seriesTmp: BarData[] = [];
    if (!isUndefined(props.data)) {
      Object.keys(props.data).forEach((d: string) => {
        seriesTmp.push({ x: d, y: props.data[d] });
      });
    }
    setSeries(sortBy(seriesTmp, 'x'));
  }, [props.data]);

  const getBarChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        fontFamily: "'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif !default",
        height: 250,
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
          columnWidth: '90%',
        },
      },
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
        tickAmount: Math.max(...Object.values(props.data)) <= 2 ? 2 : 4,
        labels: {
          formatter: (val: number): string => {
            return val.toString();
          },
        },
      },
      tooltip: {
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
    };
  };

  if (series.length === 0) return null;

  return (
    <div className="card rounded-0">
      <div className="card-body">
        <ReactApexChart
          options={getBarChartConfig()}
          series={[{ name: props.name, data: series }]}
          type="bar"
          height={250}
        />
      </div>
    </div>
  );
};

export default BarChart;
