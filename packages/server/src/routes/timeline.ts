import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getObservationsByUser, countObservationsByUser } from '../db/queries.js';
import { DISCLAIMER } from '@pm-valet/shared';
import {
  detectTrend,
  generateTrendSummary,
  isValidWindow,
  windowToDays,
  type TrendResult,
  type TrendWindow,
} from '../services/trend.js';

export const timelineRouter = Router();
timelineRouter.use(authenticateToken);

// ─── Helpers ────────────────────────────────────────────────────────

/** Group observations by category. */
function groupByCategory<T extends { category: string }>(obs: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const o of obs) {
    const list = groups.get(o.category) ?? [];
    list.push(o);
    groups.set(o.category, list);
  }
  return groups;
}

/** Compute a "from" Date given a window relative to a reference date. */
function windowFromDate(window: TrendWindow, reference: Date = new Date()): Date {
  const d = new Date(reference);
  d.setDate(d.getDate() - windowToDays(window));
  return d;
}

// ─── GET /api/timeline ──────────────────────────────────────────────

timelineRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to, categories, limit, offset, window } = req.query;
    const userId = req.user!.userId;

    // Validate optional window parameter
    const trendWindow: TrendWindow | undefined =
      window && isValidWindow(window as string) ? (window as TrendWindow) : undefined;

    // If a window is supplied it overrides `from`
    const effectiveFrom = trendWindow
      ? windowFromDate(trendWindow, to ? new Date(to as string) : new Date())
      : from
        ? new Date(from as string)
        : undefined;

    const effectiveTo = to ? new Date(to as string) : undefined;

    const categoryList = categories ? (categories as string).split(',') : undefined;

    // Fetch observations
    let allObs: any[] = [];
    if (categoryList) {
      for (const cat of categoryList) {
        const obs = await getObservationsByUser(userId, {
          category: cat,
          from: effectiveFrom,
          to: effectiveTo,
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
        });
        allObs.push(...obs);
      }
      allObs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } else {
      allObs = await getObservationsByUser(userId, {
        from: effectiveFrom,
        to: effectiveTo,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
    }

    // Group by category and compute trend per category
    const groups = groupByCategory(allObs);
    const trendByCategory = new Map<string, TrendResult>();
    const summaryByCategory = new Map<string, string>();

    for (const [cat, obs] of groups) {
      const trendInput = obs.map((o: any) => ({
        value: typeof o.value === 'number' ? o.value : parseFloat(o.value),
        timestamp: o.timestamp instanceof Date ? o.timestamp : new Date(o.timestamp),
      }));

      const result = detectTrend(trendInput);
      if (result) {
        trendByCategory.set(cat, result);
        summaryByCategory.set(cat, generateTrendSummary(cat, result, trendWindow));
      }
    }

    const total = await countObservationsByUser(userId);

    res.json({
      userId,
      entries: allObs.map((obs) => {
        const catTrend = trendByCategory.get(obs.category);
        return {
          observation: obs,
          trend: catTrend?.trend ?? null,
          anomaly: catTrend?.anomaly ?? false,
        };
      }),
      trends: Object.fromEntries(trendByCategory),
      summaries: Object.fromEntries(summaryByCategory),
      totalCount: total,
      from: effectiveFrom?.toISOString(),
      to: effectiveTo?.toISOString(),
      window: trendWindow,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// ─── GET /api/timeline/compare ──────────────────────────────────────

timelineRouter.get('/compare', async (req: Request, res: Response) => {
  try {
    const { from, to, compareFrom, compareTo, categories, window } = req.query;
    const userId = req.user!.userId;

    // Validate optional window parameter for current period
    const trendWindow: TrendWindow | undefined =
      window && isValidWindow(window as string) ? (window as TrendWindow) : undefined;

    // Current period boundaries
    const currentFrom = trendWindow
      ? windowFromDate(trendWindow, to ? new Date(to as string) : new Date())
      : from
        ? new Date(from as string)
        : undefined;
    const currentTo = to ? new Date(to as string) : undefined;

    // Previous period boundaries
    const prevFrom = compareFrom ? new Date(compareFrom as string) : undefined;
    const prevTo = compareTo ? new Date(compareTo as string) : undefined;

    if (!currentFrom || !prevFrom) {
      res.status(400).json({
        error:
          'Both "from" (or "window") and "compareFrom" are required for comparison.',
      });
      return;
    }

    const categoryList = categories ? (categories as string).split(',') : undefined;

    // Fetch current period observations
    const fetchPeriod = async (periodFrom?: Date, periodTo?: Date) => {
      let obs: any[] = [];
      if (categoryList) {
        for (const cat of categoryList) {
          const results = await getObservationsByUser(userId, {
            category: cat,
            from: periodFrom,
            to: periodTo,
          });
          obs.push(...results);
        }
        obs.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
      } else {
        obs = await getObservationsByUser(userId, {
          from: periodFrom,
          to: periodTo,
        });
      }
      return obs;
    };

    const [currentObs, previousObs] = await Promise.all([
      fetchPeriod(currentFrom, currentTo),
      fetchPeriod(prevFrom, prevTo),
    ]);

    // Compute trends for each period, grouped by category
    const computeTrends = (obs: any[]) => {
      const groups = groupByCategory(obs);
      const trends = new Map<string, TrendResult>();
      const summaries = new Map<string, string>();

      for (const [cat, catObs] of groups) {
        const trendInput = catObs.map((o: any) => ({
          value: typeof o.value === 'number' ? o.value : parseFloat(o.value),
          timestamp:
            o.timestamp instanceof Date ? o.timestamp : new Date(o.timestamp),
        }));
        const result = detectTrend(trendInput);
        if (result) {
          trends.set(cat, result);
          summaries.set(cat, generateTrendSummary(cat, result, trendWindow));
        }
      }
      return { trends, summaries };
    };

    const current = computeTrends(currentObs);
    const previous = computeTrends(previousObs);

    // Build comparison object per category
    const allCategories = new Set([
      ...current.trends.keys(),
      ...previous.trends.keys(),
    ]);

    const comparison: Record<
      string,
      {
        current: TrendResult | null;
        previous: TrendResult | null;
        currentSummary: string | null;
        previousSummary: string | null;
      }
    > = {};
    for (const cat of allCategories) {
      comparison[cat] = {
        current: current.trends.get(cat) ?? null,
        previous: previous.trends.get(cat) ?? null,
        currentSummary: current.summaries.get(cat) ?? null,
        previousSummary: previous.summaries.get(cat) ?? null,
      };
    }

    res.json({
      userId,
      currentPeriod: {
        from: currentFrom.toISOString(),
        to: currentTo?.toISOString() ?? new Date().toISOString(),
        entries: currentObs,
        trends: Object.fromEntries(current.trends),
        summaries: Object.fromEntries(current.summaries),
      },
      previousPeriod: {
        from: prevFrom.toISOString(),
        to: prevTo?.toISOString() ?? null,
        entries: previousObs,
        trends: Object.fromEntries(previous.trends),
        summaries: Object.fromEntries(previous.summaries),
      },
      comparison,
      window: trendWindow,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error('Timeline compare error:', err);
    res.status(500).json({ error: 'Failed to compare timeline periods' });
  }
});
