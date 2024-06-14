export const calculateAxisValues = (min: number, max: number, tickCount: number): number[] => {
  if (max <= 3) {
    return [min, max];
  }

  const span = max - min;
  let step = Math.pow(10, Math.floor(Math.log(span / tickCount) / Math.LN10));
  const err = (tickCount / span) * step;

  // Filter values to get closer to the desired count.
  if (err <= 0.15) {
    step *= 10;
  } else if (err <= 0.35) {
    step *= 5;
  } else if (err <= 0.75) {
    step *= 2;
  }

  // Round start and stop values to step interval.
  const tstart = Math.ceil(min / step) * step,
    tstop = Math.floor(max / step) * step + step * 0.5,
    values = [];

  // now generate values
  for (let i = tstart; i < tstop; i += step) {
    values.push(i);
  }

  return values;
};
