// Valid enum sets for farm context attributes
export const VALID_SEASONS = ['kharif', 'rabi', 'zaid'];
export const VALID_WATER_LEVELS = ['rainfed', 'limited', 'reliable'];

/**
 * Normalizes and sanitizes user-provided farm context.
 * Guarantees a safe, predictable structure even with null/undefined/malformed inputs.
 * All fields remain optional.
 * 
 * @param {Object} rawContext
 * @returns {Object} normalizedFarmContext
 */
export function buildFarmContext(rawContext = {}) {
  if (!rawContext || typeof rawContext !== 'object') {
    rawContext = {};
  }

  // Location normalization
  const rawLoc = rawContext.location && typeof rawContext.location === 'object' ? rawContext.location : {};
  const state = typeof rawLoc.state === 'string' ? rawLoc.state.trim() : '';
  const district = typeof rawLoc.district === 'string' ? rawLoc.district.trim() : '';
  const village = typeof rawLoc.village === 'string' ? rawLoc.village.trim() : '';

  // Season normalization (kharif, rabi, zaid)
  let season = '';
  if (typeof rawContext.season === 'string') {
    const s = rawContext.season.trim().toLowerCase();
    if (VALID_SEASONS.includes(s)) {
      season = s;
    }
  }

  // Water availability normalization (rainfed, limited, reliable)
  let waterAvailability = '';
  if (typeof rawContext.waterAvailability === 'string') {
    const w = rawContext.waterAvailability.trim().toLowerCase().replace(/[\s-_]+/g, '');
    if (w.includes('rainfed') || w === 'rain') {
      waterAvailability = 'rainfed';
    } else if (w.includes('limited')) {
      waterAvailability = 'limited';
    } else if (w.includes('reliable') || w.includes('assured') || w.includes('irrigated')) {
      waterAvailability = 'reliable';
    }
  }

  // Crop strings normalization
  const currentCrop = typeof rawContext.currentCrop === 'string' ? rawContext.currentCrop.trim() : '';
  const previousCrop = typeof rawContext.previousCrop === 'string' ? rawContext.previousCrop.trim() : '';
  const preferredCrop = typeof rawContext.preferredCrop === 'string' ? rawContext.preferredCrop.trim() : '';

  const hasLocation = Boolean(state || district || village);
  const hasContext = Boolean(hasLocation || season || waterAvailability || currentCrop || previousCrop || preferredCrop);

  return {
    location: {
      state,
      district,
      village,
    },
    season,
    waterAvailability,
    currentCrop,
    previousCrop,
    preferredCrop,
    hasContext,
  };
}
