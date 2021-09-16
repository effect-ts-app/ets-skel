/* eslint-disable @typescript-eslint/no-explicit-any */
import { constant, flow } from "@effect-ts/core/Function"
import { Compute } from "@effect-ts-app/core/Compute"
import * as T from "@effect-ts-app/core/Effect"
import * as H from "@effect-ts-app/core/http/http-client"
import * as O from "@effect-ts-app/core/Option"
import { condemnCustom, Parser, ReqRes, RequestSchemed } from "@ets-skel/types/schema"
import { Path } from "path-parser"

import { getConfig } from "./config"

export type FetchError = H.HttpError<string>

export class ResponseError {
  public readonly _tag = "ResponseError"
  constructor(public readonly error: unknown) {}
}

export const mapResponseErrorS = T.mapError((err: unknown) => new ResponseError(err))

export function fetchApi(method: H.Method, path: string, body?: unknown) {
  const request = H.request(method, "JSON", "JSON")
  return getConfig(({ apiUrl, headers }) =>
    request(`${apiUrl}${path}`, body)
      .pipe(H.withHeaders(headers ?? {}))
      .map((x) => ({ ...x, body: x.body["|>"](O.toNullable) }))
  )
}
export type ComputeUnlessClass<T> = T extends { new (...args: any[]): any }
  ? T
  : Compute<T>

export function fetchApi2S<RequestA, RequestE, ResponseA>(
  encodeRequest: (a: RequestA) => RequestE,
  decodeResponse: (u: unknown) => T.IO<unknown, ResponseA>
) {
  const decodeRes = flow(
    decodeResponse,
    T.mapError((err) => new ResponseError(err))
  )
  return (method: H.Method, path: string) => (req: RequestA) =>
    fetchApi(method, new Path(path).build(req), encodeRequest(req))
      .chain(mapResponseM(decodeRes))
      .map((i) => ({ ...i, body: i.body as ComputeUnlessClass<ResponseA> }))
}

export function fetchApi3S<RequestA, RequestE, ResponseE = unknown, ResponseA = void>({
  Request,
  Response,
}: {
  // eslint-disable-next-line @typescript-eslint/ban-types
  Request: RequestSchemed<RequestE, RequestA>
  // eslint-disable-next-line @typescript-eslint/ban-types
  Response: ReqRes<ResponseE, ResponseA>
}) {
  const encodeRequest = Request.Encoder
  const decodeResponse = Parser.for(Response)["|>"](condemnCustom)
  return fetchApi2S(encodeRequest, decodeResponse)(Request.method, Request.path)
}

export function mapResponse<T, A>(map: (t: T) => A) {
  return (r: FetchResponse<T>): FetchResponse<A> => {
    return { ...r, body: map(r.body) }
  }
}

export function mapResponseM<T, R, E, A>(map: (t: T) => $T.Effect<R, E, A>) {
  return (r: FetchResponse<T>): $T.Effect<R, E, FetchResponse<A>> => {
    return $T.Effect.struct({
      body: map(r.body),
      headers: $T.Effect.succeedNow(r.headers),
      status: $T.Effect.succeedNow(r.status),
    })
  }
}
export type FetchResponse<T> = { body: T; headers: H.Headers; status: number }

export const EmptyResponse = Object.freeze({ body: null, headers: {}, status: 404 })
export const EmptyResponseM = $T.Effect.succeedNow(EmptyResponse)
export const EmptyResponseMThunk = constant(EmptyResponseM)
