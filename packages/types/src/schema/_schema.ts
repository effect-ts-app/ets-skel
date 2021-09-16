/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */

import * as E from "@effect-ts/core/Either"
import type { EnforceNonEmptyRecord } from "@effect-ts/core/Utils"
import * as A from "@effect-ts-app/core/Array"
import * as T from "@effect-ts-app/core/Effect"
import { identity } from "@effect-ts-app/core/Function"
import * as NA from "@effect-ts-app/core/NonEmptyArray"
import {
  Constructor,
  ConstructorErrorOf,
  ConstructorInputOf,
  date,
  DefaultSchema,
  EncodedFromProperties,
  EncodedOf as EncodedOfOrig,
  encoder,
  EParserFor,
  maxLengthIdentifier,
  minLengthIdentifier,
  nullableIdentifier,
  ParsedShapeOf,
  Parser,
  parser,
  PropertyRecord,
  Schema,
  SchemaUPI,
  union as unionOrig,
} from "@effect-ts-app/core/Schema"
import * as MO from "@effect-ts-app/core/Schema"
import type { These } from "@effect-ts-app/core/Schema/custom/These"
import * as Th from "@effect-ts-app/core/Schema/custom/These"
import * as SET from "@effect-ts-app/core/Set"
import { Misc } from "ts-toolbelt"

import { faker, fakerToArb } from "../faker"

export { matchTag } from "@effect-ts/core/Utils"

export class CustomSchemaException extends Error {
  readonly _tag = "ValidationError"
  readonly errors: A.Array<unknown>
  constructor(error: MO.AnyError) {
    super(MO.drawError(error))
    this.errors = [error]
  }

  toJSON() {
    return {
      message: this.message,
      errors: this.errors,
    }
  }
}

export const fakerArb = (
  gen: (fake: typeof faker) => () => ReturnType<typeof faker.fake>
) => fakerToArb(gen(faker))

/**
 * The Effect fails with `CustomSchemaException` when the parser produces an invalid result.
 * Otherwise succeeds with the valid result.
 */
export function condemnCustom<X, A>(self: (a: X) => These<unknown, A>) {
  return (a: X, __trace?: string) =>
    T.fromEither(() => {
      const res = self(a).effect
      if (res._tag === "Left") {
        return E.left(new CustomSchemaException(res.left as any))
      }
      const warn = res.right.get(1)
      if (warn._tag === "Some") {
        return E.left(new CustomSchemaException(warn.value as any))
      }
      return E.right(res.right.get(0))
    }, __trace)
}

export function isSchema(p: MO.SchemaAny | MO.AnyProperty): p is MO.SchemaAny {
  return !!(p as any)[MO.SchemaSym]
}

export function getMetadataFromSchemaOrProp(p: MO.SchemaAny | MO.AnyProperty) {
  if (isSchema(p)) {
    return getMetadataFromSchema(p)
  }
  return getMetadataFromProp(p)
}

// 1. get metadata from properties, use it to constrain fields
// 2. use the metadata for custom validation error messges?
// 3. or leverage the actual validation errors that come from parsing the fields.
function getMetadataFromProp_<Prop extends MO.AnyProperty>(p: Prop) {
  return {
    required: p._optional === "required",
  }
}
export function getMetadataFromProp<Prop extends MO.AnyProperty>(p: Prop) {
  const schemaMetadata = getMetadataFromSchema(p._schema)
  const propMetadata = getMetadataFromProp_(p)

  return {
    ...schemaMetadata,
    required: propMetadata.required && schemaMetadata.required,
  }
}

export function getMetadataFromSchema<Self extends MO.SchemaAny>(self: Self) {
  const nullable = MO.findAnnotation(self, nullableIdentifier)
  const realSelf = nullable?.self ?? self
  const minLength = MO.findAnnotation(realSelf, minLengthIdentifier)
  const maxLength = MO.findAnnotation(realSelf, maxLengthIdentifier)

  return {
    minLength: minLength?.minLength,
    maxLength: maxLength?.maxLength,
    required: !nullable,
  }
}

export function getRegisterFromSchemaOrProp(p: MO.SchemaAny | MO.AnyProperty) {
  if (isSchema(p)) {
    return getRegisterFromSchema(p)
  }
  return getRegisterFromProp(p)
}

// 1. get metadata from properties, use it to constrain fields
// 2. use the metadata for custom validation error messges?
// 3. or leverage the actual validation errors that come from parsing the fields.

export function getRegisterFromProp<Prop extends MO.AnyProperty>(p: Prop) {
  const schemaMetadata = getRegisterFromSchema(p._schema)
  //const metadata = getMetadataFromProp_(p)

  return {
    ...schemaMetadata,
    // optional props should not translate values to undefined, as empty value is not absence
    // ...(!metadata.required
    //   ? {
    //       transform: {
    //         output: (value: any) => (value ? value : undefined),
    //         input: (value: any) => (!value ? "" : value),
    //       },
    //     }
    //   : {}),
  }
}

export function getRegisterFromSchema<Self extends MO.SchemaAny>(self: Self) {
  // or take from openapi = number type?
  const numberIds = [
    MO.numberIdentifier,
    MO.intIdentifier,
    MO.intFromNumberIdentifier,
    MO.positiveIntIdentifier,
    MO.positiveIntFromNumberIdentifier,
    MO.positiveIdentifier,
  ]

  const metadata = getMetadataFromSchema(self)
  const nullable = MO.findAnnotation(self, nullableIdentifier)

  const mapType = numberIds.some((x) => MO.findAnnotation(nullable?.self ?? self, x))
    ? ("asNumber" as const)
    : ("normal" as const)
  const map = mapValueType(mapType)

  return {
    ...(!metadata.required
      ? {
          transform: {
            output: (value: any) => map(value === "" ? null : value),
            // for date fields we should not undo null..
            // actually for string fields they appropriately convert to empty string probably anyway, so lets remove
            //input: (value: any) => (value === null || value === undefined ? "" : value),
            input: identity,
          },
        }
      : { transform: { output: map, input: identity } }),
  }
}

function asNumber(value: any) {
  return value === null || value === undefined
    ? value
    : value === ""
    ? NaN
    : typeof value === "string"
    ? +value.replace(",", ".")
    : +value
}

function asDate(value: any) {
  return value === null || value === undefined ? value : new Date(value)
}

function mapValueType(type: "asNumber" | "asDate" | "normal") {
  return type === "asNumber" ? asNumber : type === "asDate" ? asDate : identity
}

const dateParser = Parser.for(MO.date)
export const magicDate = date["|>"](
  parser((u) =>
    // if it quacks like a ... Date..
    u instanceof Date || (u instanceof Object && "toISOString" in u)
      ? Th.succeed(u)
      : dateParser(u)
  )
)["|>"](encoder((i): Date | string => i.toISOString()))

// type D = Date | string
// type DN = Date | string | null

// type A = {
//   d: D
//   dn: DN
//   do?: D
//   don?: DN
//   a: string
//   B: Date
// }

type Fix<A> = [Date | string | null] extends [A]
  ? Date | null
  : [Date | string] extends [A]
  ? Date
  : A

// // TODO: Recursive
// type Nice<A> = { [Key in keyof A]: Fix<A[Key]> }

export type Transform<O> = O extends Date
  ? Fix<O>
  : O extends Misc.BuiltIn | Misc.Primitive
  ? O
  : {
      [K in keyof O]: Fix<O[K]> extends infer X
        ? X extends (infer Y)[]
          ? Transform<Y>[]
          : X extends NA.NonEmptyArray<infer Y>
          ? NA.NonEmptyArray<Transform<Y>>
          : X extends SET.Set<infer Y>
          ? SET.Set<Transform<Y>>
          : X extends readonly (infer Y)[]
          ? readonly Transform<Y>[]
          : Transform<X>
        : never
    }

//type B = Transform<A>

export type EncodedFromApi<Cls extends { Api: { props: PropertyRecord } }> = Transform<
  EncodedFromProperties<Cls["Api"]["props"]>
>

export type EncodedOf<X extends Schema<any, any, any, any, any>> = Transform<
  EncodedOfOrig<X>
>

export type OpaqueEncoded<OpaqueE, Schema> = Schema extends DefaultSchema<
  unknown,
  infer A,
  infer B,
  OpaqueE,
  infer C
>
  ? DefaultSchema<unknown, A, B, OpaqueE, C>
  : never

// TODO: Add `is` guards (esp. for tagged unions.)
export function smartClassUnion<
  T extends Record<PropertyKey, SchemaUPI & { new (i: any): any }>
>(constructors: T & EnforceNonEmptyRecord<T>) {
  // @ts-expect-error we know this is NonEmpty
  const u = unionOrig(constructors)
  type U = ParsedShapeOf<typeof u>
  const entries = Object.entries(constructors)
  const as = entries.reduce((prev, [key, value]) => {
    prev[key] = (i: any) => new value(i)
    return prev
  }, {} as Record<PropertyKey, any>) as any as {
    [Key in keyof T]: (i: ConstructorInputOf<T[Key]>) => U
  }
  const of = entries.reduce((prev, [key, value]) => {
    prev[key] = (i: any) => new value(i)
    return prev
  }, {} as Record<PropertyKey, any>) as any as {
    [Key in keyof T]: (i: ConstructorInputOf<T[Key]>) => InstanceType<T[Key]>
  }

  // Experiment with returning a constructor that returns a Union
  const cas = entries.reduce((prev, [key, value]) => {
    prev[key] = value
    return prev
  }, {} as Record<PropertyKey, any>) as any as {
    [Key in keyof T]: { new (i: ConstructorInputOf<T[Key]>): U }
  }

  const mem = entries.reduce((prev, [key, value]) => {
    prev[key] = value
    return prev
  }, {} as Record<PropertyKey, any>) as any as {
    [Key in keyof T]: T[Key]
  }

  const of_ = (i: U): U => i
  return Object.assign(u, { cas, mem, as, of, of_, EParser: EParserFor(u) })
}

export function smartUnion<T extends Record<PropertyKey, SchemaUPI>>(
  constructors: T & EnforceNonEmptyRecord<T>
) {
  // @ts-expect-error we know this is NonEmpty
  const u = unionOrig(constructors)
  type U = ParsedShapeOf<typeof u>
  const entries = Object.entries(constructors)
  const as = entries.reduce((prev, [key, value]) => {
    prev[key] = Constructor.for(value)
    return prev
  }, {} as Record<PropertyKey, any>) as any as {
    [Key in keyof T]: (
      i: ConstructorInputOf<T[Key]>
    ) => Th.These<ConstructorErrorOf<T[Key]>, U>
  }
  const of = entries.reduce((prev, [key, value]) => {
    prev[key] = Constructor.for(value)
    return prev
  }, {} as Record<PropertyKey, any>) as any as {
    [Key in keyof T]: (
      i: ConstructorInputOf<T[Key]>
    ) => Th.These<ConstructorErrorOf<T[Key]>, ParsedShapeOf<T[Key]>>
  }
  const mem = entries.reduce((prev, [key, value]) => {
    prev[key] = value
    return prev
  }, {} as Record<PropertyKey, any>) as any as {
    [Key in keyof T]: T[Key]
  }

  const of_ = (i: U): U => i
  return Object.assign(u, { as, mem, of, of_, EParser: EParserFor(u) })
}

export * from "@effect-ts-app/core/Schema"
