import * as CNK from "@effect-ts/core/Collections/Immutable/Chunk"
import { pipe, Refinement } from "@effect-ts/core/Function"
import {
  annotate,
  brand,
  DefaultSchema,
  extendWithUtils,
  extendWithUtilsAnd,
  leafE,
  makeAnnotation,
  makeUuid,
  mapConstructorError,
  mapParserError,
  named,
  nonEmpty,
  NonEmptyString,
  nonEmptyStringFromString,
  parseUuidE,
  refine,
  useClassNameForSchema,
} from "@effect-ts-app/core/Schema"
import { curriedMagix } from "@effect-ts-app/core/utils"
import type * as FC from "fast-check"
import isURL from "validator/lib/isURL"

import {
  Arbitrary,
  arbitrary,
  Email as Email_,
  EncodedOf,
  fakerArb,
  fromString,
  makeConstrainedFromString,
  Model,
  ParsedShapeOf,
  prop,
  ReasonableString,
  ReasonableStringBrand,
  string,
} from "./_schema"

export const FirstName = ReasonableString["|>"](
  arbitrary((FC) =>
    fakerArb((faker) => faker.name.firstName)(FC).map((x) => x as ReasonableString)
  )
)
export type FirstName = ParsedShapeOf<typeof FirstName>

export const DisplayName = FirstName
export type DisplayName = ParsedShapeOf<typeof DisplayName>

export const LastName = ReasonableString["|>"](
  arbitrary((FC) =>
    fakerArb((faker) => faker.name.lastName)(FC).map((x) => x as ReasonableString)
  )
)
export type LastName = ParsedShapeOf<typeof LastName>

@useClassNameForSchema
export class FullName extends Model<FullName>()({
  firstName: prop(FirstName),
  lastName: prop(LastName),
}) {
  static render(fn: FullName) {
    return `${fn.firstName} ${fn.lastName}` as ReasonableString
  }

  static create(firstName: FirstName, lastName: LastName) {
    return new FullName({ firstName, lastName })
  }
}

export namespace FullName {
  export interface Encoded extends EncodedOf<typeof FullName> {}
  export namespace Encoded {
    export function create(firstName: string, lastName: string) {
      return { firstName, lastName }
    }
  }
}

/**
 * A string that is at least 6 characters long and a maximum of 50.
 */
export interface StringIdBrand extends ReasonableStringBrand {
  readonly StringId: unique symbol
}

/**
 * A string that is at least 6 characters long and a maximum of 50.
 */
export type StringId = string & StringIdBrand

const MIN_LENGTH = 6
const MAX_LENGTH = 50
export const stringIdFromString = pipe(
  makeConstrainedFromString<StringId>(MIN_LENGTH, MAX_LENGTH),
  arbitrary((FC) =>
    FC.base64String({ minLength: MIN_LENGTH, maxLength: MAX_LENGTH }).map(
      (x) => x.replace(/\+/g, ".").replace(/\//g, "_").replace(/=/g, "-") as StringId
    )
  ),
  // arbitrary removes the benefit of Brand,
  brand<StringId>()
)

/**
 * A string that is at least 6 characters long and a maximum of 50.
 */
export const StringId = extendWithUtilsAnd(string[">>>"](stringIdFromString), () => ({
  make(): StringId {
    return makeUuid() as unknown as StringId
  },
}))

const stringIdArb = Arbitrary.for(StringId)

export const prefixedStringIdUnsafe = (prefix: string) =>
  StringId.unsafe(prefix + makeUuid())

export const prefixedStringIdUnsafeThunk = (prefix: string) => () =>
  prefixedStringIdUnsafe(prefix)

export function prefixedStringId(prefix: string, name: string) {
  const fromString = pipe(
    stringIdFromString,
    arbitrary((FC) =>
      stringIdArb(FC).map(
        (x) => (prefix + x.substring(0, MAX_LENGTH - prefix.length)) as StringId
      )
    )
  )

  return Object.assign(string[">>>"](fromString)["|>"](named(name)), {
    create: prefixedStringIdUnsafeThunk(prefix),
  })
}

export interface UrlBrand {
  readonly Url: unique symbol
}

export type Url = NonEmptyString & UrlBrand
export const UrlFromStringIdentifier = makeAnnotation<{}>()

const isUrl: Refinement<string, Url> = (s: string): s is Url => {
  return isURL(s)
}

export const UrlFromString: DefaultSchema<string, Url, string, string, {}> = pipe(
  fromString,
  arbitrary((FC) => FC.webUrl()),
  nonEmpty,
  mapParserError((_) => (CNK.unsafeHead((_ as any).errors) as any).error),
  mapConstructorError((_) => (CNK.unsafeHead((_ as any).errors) as any).error),
  refine(isUrl, (n) => leafE(parseUuidE(n))),
  brand<Url>(),
  annotate(UrlFromStringIdentifier, {})
)
export const UrlIdentifier = makeAnnotation<{}>()

export const Url = extendWithUtils(
  pipe(
    string[">>>"](UrlFromString),
    arbitrary((FC) => fakerArb((faker) => faker.internet.url)(FC) as FC.Arbitrary<Url>),
    brand<Url>(),
    annotate(UrlIdentifier, {})
  )
)

export const avatarUrl = pipe(string[">>>"](nonEmptyStringFromString))["|>"](
  arbitrary((FC) => fakerArb((faker) => faker.internet.avatar)(FC) as FC.Arbitrary<Url>)
)

export const customUrlFromString = (pool: readonly Url[]) =>
  pipe(
    UrlFromString,
    arbitrary((FC) => FC.oneof(...pool.map(FC.constant))),
    brand<Url>()
  )

export const customUrl = (pool: readonly Url[]) =>
  pipe(string[">>>"](customUrlFromString(pool)), brand<Url>())

// for now be less restrictive about the PhoneNumber
const PhoneNumber_ = StringId
export const PhoneNumber = PhoneNumber_["|>"](
  arbitrary((FC) =>
    fakerArb((faker) => faker.phone.phoneNumber)(FC).map((x) => x as PhoneNumber)
  )
)
export type PhoneNumber = ParsedShapeOf<typeof PhoneNumber_>

const endsWith = curriedMagix(
  (e: Email) => (s: string) => e.toLowerCase().endsWith(s.toLowerCase())
)
export const Email = Object.assign(
  extendWithUtils(
    Email_["|>"](
      arbitrary((FC) =>
        fakerArb((faker) => faker.internet.email)(FC).map((x) => x as Email)
      )
    )
  ),
  {
    eq: { equals: (a: Email, b: Email) => a.toLowerCase() === b.toLowerCase() },
    endsWith,
    isDomain: curriedMagix(
      (e: Email) => (domain: string) => endsWith._("@" + domain, e)
    ),
    toDisplayName: (e: Email) => ReasonableString.unsafe(e.split("@")[0]),
  }
)

export type Email = ParsedShapeOf<typeof Email_>
