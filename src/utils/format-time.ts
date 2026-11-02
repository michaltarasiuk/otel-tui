function clock(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...options,
  });
}

const formatters = {
  minute: clock({}),
  second: clock({ second: "2-digit" }),
  millisecond: clock({ second: "2-digit", fractionalSecondDigits: 3 }),
};

export function formatTime(time: number, precision: keyof typeof formatters = "millisecond") {
  return formatters[precision].format(time);
}
