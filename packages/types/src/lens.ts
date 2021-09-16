import { Lens } from "@effect-ts/monocle/Lens"
import { identity } from "@effect-ts-app/core/Function"

export function setIfDefined_<S, A>(lens: Lens<S, A>) {
  return <B>(b: B | undefined, map: (b: B) => A) =>
    b !== undefined ? lens.set(map(b)) : identity
}

export function setIfDefined<S, A>(lens: Lens<S, A>) {
  return <B>(map: (b: B) => A) =>
    (b: B | undefined) =>
      setIfDefined_(lens)(b, map)
}

export function modifyM_<R, E, A, B>(l: Lens<A, B>, mod: (b: B) => $T.Effect<R, E, B>) {
  return (a: A) =>
    $T.Effect.gen(function* ($) {
      const b = yield* $(mod(l.get(a)))
      return l.set(b)(a)
    })
}

export function modifyM<A, B>(l: Lens<A, B>) {
  return <R, E>(mod: (b: B) => $T.Effect<R, E, B>) => modifyM_(l, mod)
}
