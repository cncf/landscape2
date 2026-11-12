import { For } from 'solid-js';

interface Props {
  caption: string;
  /** Column headers; the first column holds the row headers. */
  columns: string[];
  rows: (number | string)[][];
}

/** Visually hidden table of the series of a chart, its text alternative for screen readers. */
const ChartDataTable = (props: Props) => (
  <table class="visually-hidden">
    <caption>{props.caption}</caption>
    <thead>
      <tr>
        <For each={props.columns}>{(column) => <th scope="col">{column}</th>}</For>
      </tr>
    </thead>
    <tbody>
      <For each={props.rows}>
        {(row) => (
          <tr>
            <th scope="row">{row[0]}</th>
            <For each={row.slice(1)}>{(cell) => <td>{cell}</td>}</For>
          </tr>
        )}
      </For>
    </tbody>
  </table>
);

export default ChartDataTable;
