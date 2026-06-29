/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as auth from "../auth.js";
import type * as cardio from "../cardio.js";
import type * as coach from "../coach.js";
import type * as crons from "../crons.js";
import type * as engine from "../engine.js";
import type * as food from "../food.js";
import type * as http from "../http.js";
import type * as insight from "../insight.js";
import type * as meds from "../meds.js";
import type * as memories from "../memories.js";
import type * as nudges from "../nudges.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as water from "../water.js";
import type * as weight from "../weight.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  auth: typeof auth;
  cardio: typeof cardio;
  coach: typeof coach;
  crons: typeof crons;
  engine: typeof engine;
  food: typeof food;
  http: typeof http;
  insight: typeof insight;
  meds: typeof meds;
  memories: typeof memories;
  nudges: typeof nudges;
  seed: typeof seed;
  settings: typeof settings;
  water: typeof water;
  weight: typeof weight;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
