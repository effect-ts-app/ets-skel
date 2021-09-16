/* eslint-disable @typescript-eslint/no-explicit-any */

import { Has } from "@effect-ts/core/Has"
import { flow } from "@effect-ts-app/core/Function"
import * as H from "@effect-ts-app/core/http/http-client"
import * as utils from "@effect-ts-app/core/utils"
import { typedKeysOf } from "@effect-ts-app/core/utils"
import * as MO from "@ets-skel/types/schema"
import { condemnCustom, GetResponse, ParsedShapeOf } from "@ets-skel/types/schema"
import { Path } from "path-parser"

import { ApiConfig } from "./config"
import {
  fetchApi,
  fetchApi3S,
  FetchError,
  FetchResponse,
  mapResponseErrorS,
  mapResponseM,
  ResponseError,
} from "./fetch"

export * from "./config"

type Requests = Record<string, Record<string, any>>

export function clientFor<M extends Requests>(models: M) {
  return (
    typedKeysOf(models)
      // ignore module interop with automatic default exports..
      .filter((x) => x !== "default")
      .reduce((prev, cur) => {
        const h = models[cur]

        const Request = MO.extractRequest(h)
        const Response = MO.extractResponse(h)

        const b = Object.assign({}, h, { Request, Response })

        const meta = {
          Request,
          Response,
          mapPath: Request.path,
        }

        // if we don't need props, then also dont require an argument.
        const props = [Request.Body, Request.Query, Request.Path]
          .filter((x) => x)
          .flatMap((x) => Object.keys(x.Api.props))
        // @ts-expect-error doc
        prev[utils.uncapitalize(cur)] =
          Request.method === "GET"
            ? props.length === 0
              ? Object.assign(
                  fetchApi(Request.method, Request.path).chain(
                    mapResponseM(
                      flow(
                        MO.Parser.for(Response)["|>"](condemnCustom),
                        mapResponseErrorS
                      )
                    )
                  ),
                  meta
                )
              : Object.assign(
                  (req: any) =>
                    fetchApi(Request.method, new Path(Request.path).build(req)).chain(
                      mapResponseM(
                        flow(
                          MO.Parser.for(Response)["|>"](condemnCustom),
                          mapResponseErrorS
                        )
                      )
                    ),
                  {
                    ...meta,
                    mapPath: (req: any) =>
                      req ? new Path(Request.path).build(req) : Request.path,
                  }
                )
            : props.length === 0
            ? Object.assign(fetchApi3S(b)({}), meta)
            : Object.assign((req: any) => fetchApi3S(b)(req), {
                ...meta,
                mapPath: (req: any) =>
                  req ? new Path(Request.path).build(req) : Request.path,
              }) // generate handler

        return prev
      }, {} as RequestHandlers<Has<ApiConfig> & Has<H.Http>, FetchError | ResponseError, M>)
  )
}

export type ExtractResponse<T> = T extends { Model: MO.SchemaAny }
  ? ParsedShapeOf<T["Model"]>
  : T extends MO.SchemaAny
  ? ParsedShapeOf<T>
  : T extends unknown
  ? MO.Void
  : never

type RequestHandlers<R, E, M extends Requests> = {
  [K in keyof M & string as Uncapitalize<K>]: keyof MO.GetRequest<
    M[K]
  >[MO.schemaField]["Api"]["props"] extends never
    ? $T.Effect<R, E, FetchResponse<ExtractResponse<GetResponse<M[K]>>>> & {
        Request: MO.GetRequest<M[K]>
        Reponse: ExtractResponse<GetResponse<M[K]>>
        mapPath: string
      }
    : ((
        req: InstanceType<MO.GetRequest<M[K]>>
      ) => $T.Effect<R, E, FetchResponse<ExtractResponse<GetResponse<M[K]>>>>) & {
        Request: MO.GetRequest<M[K]>
        Reponse: ExtractResponse<GetResponse<M[K]>>
        mapPath: (req?: InstanceType<MO.GetRequest<M[K]>>) => string
      }
}
