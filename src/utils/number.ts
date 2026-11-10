const integerFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatInteger(value: number) {
  return integerFormat.format(value);
}

export function formatCount(count: number, noun: string, plural = `${noun}s`) {
  return `${formatInteger(count)} ${count === 1 ? noun : plural}`;
}

export function formatShownCount(shown: number, total: number, noun: string) {
  const all = formatCount(total, noun);
  return shown === total ? all : `${formatInteger(shown)} of ${all}`;
}

export function formatPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatRate(perSecond: number) {
  if (perSecond === 0) {
    return "0/s";
  }
  if (perSecond < 0.1) {
    return `${(perSecond * 60).toFixed(1)}/min`;
  }
  if (perSecond < 10) {
    return `${perSecond.toFixed(1)}/s`;
  }
  return `${formatInteger(perSecond)}/s`;
}
