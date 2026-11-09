/**
 * Host half of the token-usage bundle.
 *
 * Registers one Session projection, `tokenUsageByRoute`, that folds every
 * provider-reported usage sample into `provider × model` buckets. The unit is
 * client-visible, so it rides the same Session-list projection hints the shell
 * already ships (`session/list`), and the browser needs no extra Remote.
 *
 * The fold mirrors the shipped `tokenUsage` unit: a sample settles a Step, a
 * retry inside one Step replaces the previous sample instead of adding to it, and
 * an attempt that reported usage still counts even when no durable message
 * settled.
 */

const PROJECTION_KEY = 'tokenUsageByRoute'
const STATE_VERSION = 1
const UNKNOWN_ROUTE = { provider: 'unknown', model: 'unknown' }

function bucketsOf(usage) {
  return {
    input: usage.inputTokens ?? 0,
    output: usage.outputTokens ?? 0,
    cacheRead: usage.cacheReadTokens ?? 0,
    cacheWrite: usage.cacheWriteTokens ?? 0,
  }
}

function bucketsEqual(left, right) {
  return (
    left.input === right.input &&
    left.output === right.output &&
    left.cacheRead === right.cacheRead &&
    left.cacheWrite === right.cacheWrite
  )
}

/** Provider usage of one settlement: its own field first, else its last usage chunk. */
function usageOf(event) {
  const direct = event.data?.usage
  if (direct !== undefined) return direct
  const stream = event.data?.stream
  if (!Array.isArray(stream)) return undefined
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    const chunk = record?.type === 'chunk' ? record.chunk : undefined
    if (chunk?.type === 'usage') return chunk.usage
  }
  return undefined
}

/** The routed provider/model of one sample: the settlement's own source wins. */
function routeOf(event, state) {
  if (event.type === 'assistant/message') {
    const source = event.data?.message?.source
    if (typeof source?.provider === 'string' && typeof source?.model === 'string') {
      return { provider: source.provider, model: source.model }
    }
  }
  if (state.route !== null) return state.route
  return UNKNOWN_ROUTE
}

function withRoute(state, provider, model) {
  if (typeof provider !== 'string' || typeof model !== 'string') return state
  if (state.route !== null && state.route.provider === provider && state.route.model === model) return state
  return { ...state, route: { provider, model } }
}

/** Add or remove one sample from its route bucket, dropping emptied buckets. */
function applyDelta(routes, provider, model, buckets, sign) {
  const key = JSON.stringify([provider, model])
  const current = routes[key]
  const next = {
    provider,
    model,
    calls: (current?.calls ?? 0) + sign,
    input: (current?.input ?? 0) + sign * buckets.input,
    output: (current?.output ?? 0) + sign * buckets.output,
    cacheRead: (current?.cacheRead ?? 0) + sign * buckets.cacheRead,
    cacheWrite: (current?.cacheWrite ?? 0) + sign * buckets.cacheWrite,
  }
  const copy = { ...routes }
  if (next.calls <= 0) delete copy[key]
  else copy[key] = next
  return copy
}

function fold(state, event) {
  const type = event.type

  if (type === 'request/context') {
    return withRoute(state, event.data?.provider, event.data?.model)
  }
  if (type === 'request/header') {
    return withRoute(state, event.data?.header?.config?.provider, event.data?.header?.config?.model)
  }
  if (type === 'llm/retry-started') {
    const last = state.last
    if (last === null) return state
    if (last.turn !== event.data?.turn || last.step !== event.data?.step) return state
    return { ...state, last: null }
  }
  if (type !== 'assistant/message' && type !== 'assistant/attempt') return state

  const usage = usageOf(event)
  if (usage === undefined) return state
  const turn = event.data?.turn
  const step = event.data?.step
  const route = routeOf(event, state)
  const buckets = bucketsOf(usage)
  const last = state.last
  const previous = last !== null && last.turn === turn && last.step === step ? last : null
  if (
    previous !== null &&
    previous.provider === route.provider &&
    previous.model === route.model &&
    bucketsEqual(previous.buckets, buckets)
  ) {
    return state
  }

  let routes = state.routes
  if (previous !== null) routes = applyDelta(routes, previous.provider, previous.model, previous.buckets, -1)
  routes = applyDelta(routes, route.provider, route.model, buckets, 1)
  return {
    routes,
    route,
    last: { turn, step, provider: route.provider, model: route.model, buckets },
  }
}

/**
 * A permissive schema for the registry's `stateSchema` / `viewSchema` contracts.
 * The unit state is plain JSON by construction; a real zod schema is used when
 * the installation exposes one, and a parse-only passthrough keeps the plugin
 * working when it does not.
 */
async function schema() {
  try {
    const module = await import('zod')
    const candidates = [module?.z, module?.default?.z, module?.default, module]
    for (const candidate of candidates) {
      if (candidate !== null && candidate !== undefined && typeof candidate.any === 'function') {
        return candidate.any()
      }
    }
  } catch {
    /* no zod in reach: fall through to the passthrough */
  }
  return { parse: (value) => value }
}

export const inject = ['sessionProjections']

export async function apply(ctx) {
  const anySchema = await schema()
  await ctx.sessionProjections.register({
    key: PROJECTION_KEY,
    stateVersion: STATE_VERSION,
    stateSchema: anySchema,
    init: () => ({ routes: {}, last: null, route: null }),
    apply: fold,
    wire: {
      viewSchema: anySchema,
      view: (state) => ({ routes: state.routes }),
    },
  })
}