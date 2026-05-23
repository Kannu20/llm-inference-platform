// src/api/routes/openrouter.ts
// OpenRouter-specific endpoints:
//   GET /api/openrouter/models         — fetch live model list from OpenRouter API
//   GET /api/openrouter/models/grouped — grouped by underlying provider for UI
//   GET /api/openrouter/generation/:id — fetch generation stats (cost, latency)

import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import {
  OpenRouterProvider,
  OPENROUTER_POPULAR_MODELS,
  OPENROUTER_MODEL_GROUPS,
  OpenRouterModel,
} from '../../services/providers/OpenRouterProvider';
import { apiRateLimiter } from '../../middleware/rateLimit';
import logger from '../../utils/logger';

const router = Router();

/**
 * GET /api/openrouter/models
 * Returns available models from OpenRouter.
 * Tries live API first, falls back to curated static list.
 * Results are NOT cached here — add Redis caching in production for 1hr TTL.
 */
router.get('/models', apiRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = config.providers.openrouter.apiKey;

    let models: OpenRouterModel[];
    if (apiKey) {
      models = await OpenRouterProvider.fetchAvailableModels(apiKey);
    } else {
      // No key configured — return curated popular models
      models = OPENROUTER_POPULAR_MODELS;
    }

    // Optionally filter by search query
    const { search, free } = req.query;
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      models = models.filter(
        m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
      );
    }
    if (free === 'true') {
      models = models.filter(m => m.id.includes(':free') || m.pricing?.prompt === '0');
    }

    res.json({
      success: true,
      data: models,
      meta: { total: models.length, source: apiKey ? 'live' : 'static' },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/openrouter/models/grouped
 * Returns models grouped by underlying provider — used by the Settings UI
 * to render a grouped dropdown/select.
 */
router.get('/models/grouped', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = config.providers.openrouter.apiKey;
    let allModels: OpenRouterModel[];

    if (apiKey) {
      allModels = await OpenRouterProvider.fetchAvailableModels(apiKey);
    } else {
      allModels = OPENROUTER_POPULAR_MODELS;
    }

    // Build grouped structure
    const grouped: Record<string, OpenRouterModel[]> = {};
    for (const [groupName, modelIds] of Object.entries(OPENROUTER_MODEL_GROUPS)) {
      const groupModels = modelIds
        .map(id => allModels.find(m => m.id === id))
        .filter(Boolean) as OpenRouterModel[];
      if (groupModels.length > 0) {
        grouped[groupName] = groupModels;
      }
    }

    // Add any models from the live list not in our curated groups
    const curatedIds = new Set(Object.values(OPENROUTER_MODEL_GROUPS).flat());
    const others = allModels.filter(m => !curatedIds.has(m.id));
    if (others.length > 0) {
      grouped['Other'] = others;
    }

    res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/openrouter/generation/:id
 * Fetches post-completion generation stats from OpenRouter.
 * Includes: cost, latency breakdown, native token counts, finish reason.
 * Call this a few seconds after the streaming request completes.
 */
router.get('/generation/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = config.providers.openrouter.apiKey;
    if (!apiKey) {
      res.status(400).json({ success: false, error: 'OpenRouter not configured' });
      return;
    }

    const provider = new OpenRouterProvider(apiKey);
    const stats = await provider.fetchGenerationStats(req.params.id);

    if (!stats) {
      res.status(404).json({ success: false, error: 'Generation not found' });
      return;
    }

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/openrouter/status
 * Returns OpenRouter configuration status without exposing the key.
 */
router.get('/status', (_req: Request, res: Response) => {
  const apiKey = config.providers.openrouter.apiKey;
  res.json({
    success: true,
    data: {
      configured: Boolean(apiKey),
      defaultModel: config.providers.openrouter.defaultModel,
      siteUrl: config.providers.openrouter.siteUrl,
      siteName: config.providers.openrouter.siteName,
    },
  });
});

export default router;