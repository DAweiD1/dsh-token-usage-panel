/**
 * Browser half of the token-usage bundle.
 *
 * Reads two Session projections the Harness ships to the browser inside every
 * Session-list row: `tokenUsage` (per-session buckets) and `tokenUsageByRoute`
 * (the same buckets folded by provider × model by this bundle's Host half).
 * No Remote, no extra request, no Host-side HTTP surface.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-token-usage',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'token-usage'
    const PANEL_ID = 'token-usage'

    const en = {
      'panel.title': 'Token usage',
      'page.title': 'Token usage',
      'page.subtitle': 'Provider-reported tokens, cache reuse and context occupancy across this profile.',
      'card.total': 'Total tokens',
      'card.input': 'Input (uncached)',
      'card.output': 'Output',
      'card.cache': 'Cache',
      'card.cacheNote': 'read {read} · write {write}',
      'card.hit': 'Cache hit rate',
      'card.hitNote': 'read {read} / prompt {prompt}',
      'card.sessions': 'Sessions with usage',
      'section.providers': 'By provider',
      'section.models': 'By model',
      'section.sessions': 'By session',
      'col.provider': 'Provider',
      'col.model': 'Model',
      'col.session': 'Session',
      'col.context': 'Context',
      'col.calls': 'Requests',
      'col.input': 'Input',
      'col.output': 'Output',
      'col.cacheRead': 'Cache read',
      'col.cacheWrite': 'Cache write',
      'col.hit': 'Hit rate',
      'col.total': 'Total',
      'coverage': 'Read {done} of {total} sessions',
      'empty.providers': 'No provider usage recorded yet.',
      'empty.models': 'No model usage recorded yet.',
      'empty.sessions': 'No token usage yet. Numbers appear once a model request reports usage.',
      'note': 'Counts come from provider usage records in each session log. A hit rate is cache reads over prompt tokens (uncached input + cache read + cache write); older sessions join the breakdown once their log has been read.',
    }

    const zh = {
      'panel.title': 'Token 用量',
      'page.title': 'Token 用量',
      'page.subtitle': '本 profile 的 token 用量、缓存命中与上下文占用，全部来自模型服务商回报。',
      'card.total': '总 token',
      'card.input': '输入（未命中缓存）',
      'card.output': '输出',
      'card.cache': '缓存',
      'card.cacheNote': '读 {read} · 写 {write}',
      'card.hit': '缓存命中率',
      'card.hitNote': '读 {read} / 提示词 {prompt}',
      'card.sessions': '有用量的会话',
      'section.providers': '按供应商',
      'section.models': '按模型',
      'section.sessions': '按会话',
      'col.provider': '供应商',
      'col.model': '模型',
      'col.session': '会话',
      'col.context': '上下文',
      'col.calls': '请求数',
      'col.input': '输入',
      'col.output': '输出',
      'col.cacheRead': '缓存读',
      'col.cacheWrite': '缓存写',
      'col.hit': '命中率',
      'col.total': '合计',
      'coverage': '已统计 {done}/{total} 个会话',
      'empty.providers': '还没有供应商用量记录。',
      'empty.models': '还没有模型用量记录。',
      'empty.sessions': '还没有 token 用量。模型请求回报用量后这里才会有数字。',
      'note': '数字来自各会话日志里记录的模型服务商用量。命中率 = 缓存读 ÷ 提示词 token（未命中输入 + 缓存读 + 缓存写）；较旧的会话在日志被读过之后才会计入分解。',
    }

    /*
     * Styling follows the shipped pages: hairline .5px separators instead of a
     * card grid, `bg-layer-1` for the one raised surface, the 11/12/13/14/16px
     * type scale, and sticky table headers with tertiary labels.
     */
    const CSS = [
      '.dsh-tu-page{box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;padding:0 clamp(24px,4vw,48px);color:var(--dsw-alias-label-primary)}',
      '.dsh-tu-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-top:28px}',
      '.dsh-tu-title{margin:0;font:var(--dsw-font-l-20)}',
      '.dsh-tu-sub{margin:4px 0 0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-secondary)}',
      '.dsh-tu-body{display:flex;flex:1;flex-direction:column;align-items:center;gap:32px;min-height:0;overflow-y:auto;padding:24px 0 48px}',
      '.dsh-tu-measure{box-sizing:border-box;width:100%;max-width:960px}',
      '.dsh-tu-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px 24px;padding:14px 16px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}',
      '.dsh-tu-stat{min-width:0}',
      '.dsh-tu-statLabel{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary)}',
      '.dsh-tu-statValue{margin-top:2px;font:var(--dsw-font-base-strong-16);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
      '.dsh-tu-statNote{margin-top:2px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.dsh-tu-section{display:flex;flex-direction:column;gap:8px}',
      '.dsh-tu-sectionHead{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
      '.dsh-tu-sectionTitle{margin:0;font:var(--dsw-font-s-strong-14)}',
      '.dsh-tu-sectionMeta{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);white-space:nowrap}',
      '.dsh-tu-table{width:100%;table-layout:fixed;border-collapse:collapse;font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums}',
      '.dsh-tu-table th{position:sticky;top:0;z-index:2;box-sizing:border-box;padding:4px 8px;text-align:left;font:var(--dsw-font-xxs-12);font-weight:500;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-1);background-clip:padding-box;border-bottom:.5px solid var(--dsw-alias-border-l2)}',
      '.dsh-tu-table td{box-sizing:border-box;padding:7px 8px;border-bottom:.5px solid var(--dsw-alias-border-l1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsh-tu-thNum,.dsh-tu-num{text-align:right}',
      '.dsh-tu-name{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsh-tu-meta{margin-top:1px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsh-tu-context{display:flex;align-items:center;justify-content:flex-end;gap:6px}',
      '.dsh-tu-bar{position:relative;flex:none;width:48px;height:4px;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden}',
      '.dsh-tu-barFill{position:absolute;inset:0 auto 0 0;border-radius:999px;background:var(--dsw-alias-brand-primary)}',
      '.dsh-tu-barFill[data-level=warn]{background:var(--dsw-alias-state-warn-primary)}',
      '.dsh-tu-barFill[data-level=danger]{background:var(--dsw-alias-state-error-primary)}',
      '.dsh-tu-pct{min-width:28px;text-align:right;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.dsh-tu-dim{color:var(--dsw-alias-label-tertiary)}',
      '.dsh-tu-empty{padding:32px 8px;text-align:center;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary)}',
      '.dsh-tu-note{margin:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}',
    ].join('')

    function routeColumns(nameLabel) {
      return [
        { key: 'name', label: nameLabel, width: '28%' },
        { key: 'calls', label: 'col.calls', width: '8%', num: true },
        { key: 'input', label: 'col.input', width: '10%', num: true },
        { key: 'output', label: 'col.output', width: '10%', num: true },
        { key: 'cacheRead', label: 'col.cacheRead', width: '11%', num: true },
        { key: 'cacheWrite', label: 'col.cacheWrite', width: '11%', num: true },
        { key: 'hit', label: 'col.hit', width: '9%', num: true },
        { key: 'total', label: 'col.total', width: '13%', num: true },
      ]
    }

    const PROVIDER_COLUMNS = routeColumns('col.provider')
    const MODEL_COLUMNS = routeColumns('col.model')
    const SESSION_COLUMNS = [
      { key: 'name', label: 'col.session', width: '26%' },
      { key: 'context', label: 'col.context', width: '12%', num: true },
      { key: 'input', label: 'col.input', width: '11%', num: true },
      { key: 'output', label: 'col.output', width: '10%', num: true },
      { key: 'cacheRead', label: 'col.cacheRead', width: '11%', num: true },
      { key: 'cacheWrite', label: 'col.cacheWrite', width: '11%', num: true },
      { key: 'hit', label: 'col.hit', width: '9%', num: true },
      { key: 'total', label: 'col.total', width: '10%', num: true },
    ]

    const integerFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

    /** Group a token count; every value here is an integer counter. */
    function formatCount(value) {
      return Number.isFinite(value) ? integerFormat.format(value) : '—'
    }

    /** Render a durable timestamp as a short local `MM-DD HH:mm`. */
    function formatTime(value) {
      if (!Number.isFinite(value) || value <= 0) return ''
      const date = new Date(value)
      const pad = (part) => String(part).padStart(2, '0')
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    function totalOf(bucket) {
      return bucket.input + bucket.output + bucket.cacheRead + bucket.cacheWrite
    }

    /** Cache reads over prompt tokens, or null until a prompt has been priced. */
    function hitRate(bucket) {
      const prompt = bucket.input + bucket.cacheRead + bucket.cacheWrite
      if (prompt <= 0) return null
      return { percent: Math.round((bucket.cacheRead / prompt) * 100), read: bucket.cacheRead, prompt }
    }

    function emptyBucket() {
      return { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
    }

    function addInto(target, entry) {
      target.calls += entry.calls ?? 0
      target.input += entry.input ?? 0
      target.output += entry.output ?? 0
      target.cacheRead += entry.cacheRead ?? 0
      target.cacheWrite += entry.cacheWrite ?? 0
    }

    function byTotalDesc(left, right) {
      return totalOf(right) - totalOf(left)
    }

    /**
     * Fold every Session-list row into overall totals, provider and model
     * breakdowns, and one row per session.
     */
    function summarize(byId) {
      const sessions = []
      const providers = new Map()
      const models = new Map()
      const totals = { ...emptyBucket() }
      let covered = 0
      let usedSessions = 0

      for (const id of Object.keys(byId ?? {})) {
        const row = byId[id]
        const usage = row?.projectionValues?.tokenUsage
        if (usage === undefined || usage === null) continue
        const session = {
          id,
          title: typeof row.title === 'string' && row.title !== '' ? row.title : row.displayTitle ?? id,
          updatedAt: Number.isFinite(row.updatedAt) ? row.updatedAt : 0,
          input: usage.uncachedInputTokens ?? 0,
          output: usage.outputTokens ?? 0,
          cacheRead: usage.cacheReadTokens ?? 0,
          cacheWrite: usage.cacheWriteTokens ?? 0,
          pressure: row.projectionValues?.contextPressure,
          hasRoutes: false,
        }
        session.total = totalOf(session)
        addInto(totals, session)

        const route = row.projectionValues?.tokenUsageByRoute
        const entries = route !== undefined && route !== null && route.routes !== undefined ? Object.values(route.routes) : []
        if (entries.length > 0) {
          covered += 1
          session.hasRoutes = true
          for (const entry of entries) {
            if (typeof entry?.provider !== 'string' || typeof entry?.model !== 'string') continue
            let provider = providers.get(entry.provider)
            if (provider === undefined) {
              provider = { key: entry.provider, label: entry.provider, meta: undefined, ...emptyBucket() }
              providers.set(entry.provider, provider)
            }
            addInto(provider, entry)

            const modelKey = `${entry.provider}\u0000${entry.model}`
            let model = models.get(modelKey)
            if (model === undefined) {
              model = { key: modelKey, label: entry.model, meta: entry.provider, ...emptyBucket() }
              models.set(modelKey, model)
            }
            addInto(model, entry)
          }
        }

        if (session.total > 0) {
          usedSessions += 1
          sessions.push(session)
        }
      }

      sessions.sort((left, right) => right.total - left.total || right.updatedAt - left.updatedAt)
      return {
        sessions,
        providers: [...providers.values()].sort(byTotalDesc),
        models: [...models.values()].sort(byTotalDesc),
        totals,
        covered,
        usedSessions,
      }
    }

    /** Occupancy of one Session's next prompt against its routed context window. */
    function contextOccupancy(pressure) {
      const usedTokens = pressure?.projectedTokens ?? pressure?.pressureTokens
      const contextWindow = pressure?.contextWindow
      if (usedTokens === undefined || contextWindow === undefined || contextWindow <= 0) return null
      return {
        percent: Math.min(100, Math.round((usedTokens / contextWindow) * 100)),
        usedTokens,
        contextWindow,
      }
    }

    function Stat({ label, value, note }) {
      return h(
        'div',
        { className: 'dsh-tu-stat' },
        h('div', { className: 'dsh-tu-statLabel' }, label),
        h('div', { className: 'dsh-tu-statValue', title: value }, value),
        note === undefined ? null : h('div', { className: 'dsh-tu-statNote' }, note),
      )
    }

    function Table({ columns, rows, renderRow, empty, t }) {
      if (rows.length === 0) return h('div', { className: 'dsh-tu-empty' }, empty)
      return h(
        'table',
        { className: 'dsh-tu-table' },
        h(
          'colgroup',
          null,
          columns.map((column) => h('col', { key: column.key, style: { width: column.width } })),
        ),
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            columns.map((column) =>
              h(
                'th',
                { key: column.key, scope: 'col', className: column.num ? 'dsh-tu-thNum' : undefined },
                t(column.label),
              ),
            ),
          ),
        ),
        h('tbody', null, rows.map((row, index) => renderRow(row, index))),
      )
    }

    function Section({ title, meta, children }) {
      return h(
        'section',
        { className: 'dsh-tu-measure dsh-tu-section' },
        h(
          'div',
          { className: 'dsh-tu-sectionHead' },
          h('h2', { className: 'dsh-tu-sectionTitle' }, title),
          meta === undefined ? null : h('span', { className: 'dsh-tu-sectionMeta' }, meta),
        ),
        children,
      )
    }

    function HitCell({ bucket }) {
      const hit = hitRate(bucket)
      if (hit === null) return h('td', { className: 'dsh-tu-num dsh-tu-dim' }, '—')
      return h(
        'td',
        { className: 'dsh-tu-num', title: `${formatCount(hit.read)} / ${formatCount(hit.prompt)}` },
        `${hit.percent}%`,
      )
    }

    function ContextCell({ pressure }) {
      const occupancy = contextOccupancy(pressure)
      if (occupancy === null) {
        return h('td', { className: 'dsh-tu-num dsh-tu-dim' }, '—')
      }
      const level = occupancy.percent >= 90 ? 'danger' : occupancy.percent >= 70 ? 'warn' : 'normal'
      return h(
        'td',
        null,
        h(
          'div',
          {
            className: 'dsh-tu-context',
            title: `${formatCount(occupancy.usedTokens)} / ${formatCount(occupancy.contextWindow)}`,
          },
          h(
            'span',
            { className: 'dsh-tu-bar' },
            h('span', {
              className: 'dsh-tu-barFill',
              'data-level': level,
              style: { width: `${occupancy.percent}%` },
            }),
          ),
          h('span', { className: 'dsh-tu-pct' }, `${occupancy.percent}%`),
        ),
      )
    }

    const attemptedBackfills = new Set()
    const backfillQueue = []
    let backfillRunning = false

    /**
     * Walk the queue one session at a time. The shell's projection read also
     * writes the projection cache, so later page loads see these rows without a
     * second read.
     */
    async function runBackfill(refresh) {
      backfillRunning = true
      try {
        while (backfillQueue.length > 0) {
          const sessionId = backfillQueue.shift()
          try {
            await refresh(sessionId)
          } catch {
            /* a session that cannot be read stays out of the breakdown */
          }
        }
      } finally {
        backfillRunning = false
      }
    }

    /**
     * Sessions never opened after this plugin was installed have no folded route
     * buckets yet. Ask the shell to read their projections, newest first and one
     * at a time, so the provider and model tables fill in without a burst.
     */
    function useBackfill(rows, refresh) {
      const refreshRef = React.useRef(refresh)
      refreshRef.current = refresh
      React.useEffect(() => {
        for (const row of rows) {
          if (row.hasRoutes || attemptedBackfills.has(row.id)) continue
          if (backfillQueue.length >= 60) break
          attemptedBackfills.add(row.id)
          backfillQueue.push(row.id)
        }
        if (backfillRunning || backfillQueue.length === 0) return
        void runBackfill((sessionId) => refreshRef.current(sessionId))
      }, [rows])
    }

    function TokenUsagePage(props) {
      const t = props.t
      const byId = typeof props.useSessions === 'function' ? props.useSessions((state) => state.byId) : undefined
      const model = React.useMemo(() => summarize(byId), [byId])
      useBackfill(model.sessions, props.refreshProjections)

      const hit = hitRate(model.totals)
      const stats = [
        { key: 'total', label: t('card.total'), value: formatCount(totalOf(model.totals)) },
        { key: 'input', label: t('card.input'), value: formatCount(model.totals.input) },
        { key: 'output', label: t('card.output'), value: formatCount(model.totals.output) },
        {
          key: 'cache',
          label: t('card.cache'),
          value: formatCount(model.totals.cacheRead + model.totals.cacheWrite),
          note: t('card.cacheNote', {
            read: formatCount(model.totals.cacheRead),
            write: formatCount(model.totals.cacheWrite),
          }),
        },
        {
          key: 'hit',
          label: t('card.hit'),
          value: hit === null ? '—' : `${hit.percent}%`,
          note: t('card.hitNote', {
            read: formatCount(model.totals.cacheRead),
            prompt: formatCount(model.totals.input + model.totals.cacheRead + model.totals.cacheWrite),
          }),
        },
        { key: 'sessions', label: t('card.sessions'), value: formatCount(model.usedSessions) },
      ]

      const coverageMeta =
        model.usedSessions > 0
          ? t('coverage', { done: Math.min(model.covered, model.usedSessions), total: model.usedSessions })
          : undefined

      const routeRow = (row, index) =>
        h(
          'tr',
          { key: row.key ?? index },
          h(
            'td',
            null,
            h('div', { className: 'dsh-tu-name', title: row.label }, row.label),
            row.meta === undefined ? null : h('div', { className: 'dsh-tu-meta' }, row.meta),
          ),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.calls)),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.input)),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.output)),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.cacheRead)),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.cacheWrite)),
          h(HitCell, { bucket: row }),
          h('td', { className: 'dsh-tu-num' }, formatCount(totalOf(row))),
        )

      const sessionRow = (row, index) =>
        h(
          'tr',
          { key: row.id ?? index },
          h(
            'td',
            null,
            h('div', { className: 'dsh-tu-name', title: row.title }, row.title),
            h('div', { className: 'dsh-tu-meta' }, formatTime(row.updatedAt)),
          ),
          h(ContextCell, { pressure: row.pressure }),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.input)),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.output)),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.cacheRead)),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.cacheWrite)),
          h(HitCell, { bucket: row }),
          h('td', { className: 'dsh-tu-num' }, formatCount(row.total)),
        )

      return h(
        'div',
        { className: 'dsh-tu-page' },
        h('style', null, CSS),
        h(
          'header',
          { className: 'dsh-tu-head' },
          h(
            'div',
            null,
            h('h1', { className: 'dsh-tu-title' }, t('page.title')),
            h('p', { className: 'dsh-tu-sub' }, t('page.subtitle')),
          ),
        ),
        h(
          'div',
          { className: 'dsh-tu-body' },
          h(
            'div',
            { className: 'dsh-tu-measure dsh-tu-stats' },
            stats.map((stat) => h(Stat, { key: stat.key, label: stat.label, value: stat.value, note: stat.note })),
          ),
          h(
            Section,
            { title: t('section.providers'), meta: coverageMeta },
            h(Table, {
              columns: PROVIDER_COLUMNS,
              rows: model.providers,
              renderRow: routeRow,
              empty: t('empty.providers'),
              t,
            }),
          ),
          h(
            Section,
            { title: t('section.models'), meta: coverageMeta },
            h(Table, {
              columns: MODEL_COLUMNS,
              rows: model.models,
              renderRow: routeRow,
              empty: t('empty.models'),
              t,
            }),
          ),
          h(
            Section,
            { title: t('section.sessions') },
            h(Table, {
              columns: SESSION_COLUMNS,
              rows: model.sessions,
              renderRow: sessionRow,
              empty: t('empty.sessions'),
              t,
            }),
            h('p', { className: 'dsh-tu-note' }, t('note')),
          ),
        ),
      )
    }

    /** Bars glyph for the sidebar rail, drawn at the edge size the sidebar asks for. */
    function TokenUsageIcon({ size, active }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block', color: active ? 'var(--dsw-alias-brand-primary)' : 'currentColor' },
        },
        h('path', { d: 'M4.5 19.5v-6' }),
        h('path', { d: 'M9.83 19.5V9' }),
        h('path', { d: 'M15.17 19.5v-4' }),
        h('path', { d: 'M20.5 19.5V5' }),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)

        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'token-usage: dictionaries')

        ctx.effect(
          () =>
            ctx.slots.inject('sidebar.panellist', () =>
              ctx.slots.register(
                {
                  name: 'sidebar.panellist',
                  id: PANEL_ID,
                  order: 20,
                  label: () => t('panel.title'),
                  locale: NS,
                },
                TokenUsageIcon,
              ),
            ),
          'token-usage: sidebar entry',
        )

        ctx.effect(
          () =>
            ctx.slots.inject('main', () =>
              ctx.slots.register(
                {
                  name: 'main',
                  key: PANEL_ID,
                  locale: NS,
                  inject: () => ({
                    refreshProjections: (sessionId) => {
                      const sessions = ctx.get('sessions')
                      return sessions === undefined ? undefined : sessions.refreshProjections(sessionId)
                    },
                  }),
                },
                TokenUsagePage,
              ),
            ),
          'token-usage: panel',
        )
      },
    }
  },
})