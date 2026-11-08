import { roundToTenths } from "./round-to-tenths.ts";

const PER_MINUTE_BELOW_PER_SECOND = 0.1;
const WHOLE_NUMBER_FROM = 10;

export function formatRate(perSecond: number) {
  if (perSecond === 0) {
    return "0/s";
  }
  if (perSecond < PER_MINUTE_BELOW_PER_SECOND) {
    return `${roundToTenths(perSecond * 60)}/min`;
  }
  if (perSecond < WHOLE_NUMBER_FROM) {
    return `${perSecond.toFixed(1)}/s`;
  }
  return `${Math.round(perSecond).toLocaleString()}/s`;
}
