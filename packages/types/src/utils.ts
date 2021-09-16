// eslint-disable-next-line import/no-duplicates
import { isAfter, isBefore } from "date-fns"
// eslint-disable-next-line import/no-duplicates
import { set } from "date-fns/fp"

export function todayAtUTCNoon() {
  const localDate = new Date()
  const utcDateAtNoon = Date.UTC(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    12
  )
  return new Date(utcDateAtNoon)
}

export function spread<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Props extends Record<any, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NewProps extends Record<any, any>
>(props: Props, fnc: (props: Props) => NewProps) {
  return fnc(props)
}

export function spreadS<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Props extends Record<any, any>
>(props: Props, fnc: (props: Props) => Props) {
  return fnc(props)
}

export function makeAzureFriendly(path: string) {
  return path.replace(/\//g, "___SL@SH___")
}

export function undoAzureFriendly(path: string): any {
  return path.replace(/___SL@SH___/g, "/")
}

export const setTimeToMidnight = set({
  hours: 0,
  minutes: 0,
  seconds: 0,
  milliseconds: 0,
})

export const setTimeToEndOfDay = set({
  hours: 23,
  minutes: 59,
  seconds: 59,
  milliseconds: 999,
})

export function isBetween(minDate?: Date, maxDate?: Date) {
  return (d: Date) =>
    !((minDate && isBefore(d, minDate)) || (maxDate && isAfter(d, maxDate)))
}

export function isBetweenMidnightAndEndOfDay(minDate?: Date, maxDate?: Date) {
  return isBetween(
    minDate && setTimeToMidnight(minDate),
    maxDate && setTimeToEndOfDay(maxDate)
  )
}

export { default as omit } from "lodash/omit"
