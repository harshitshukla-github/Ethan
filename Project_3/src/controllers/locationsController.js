import { HttpError } from '../utils/httpError.js';
import {
  parseCategoryFilter,
  parseLocationId,
  validateSuggestion,
} from '../validation/locationValidation.js';

// Express 5 forwards rejected promises from async handlers to the error middleware,
// so database failures thrown here end up in middleware/errorHandler.js.
export function createLocationsController(locationModel) {
  return {
    async list(req, res) {
      const categories = parseCategoryFilter(req.query.category);
      const locations = await locationModel.findVerified({ categories });
      res.json({ data: locations, meta: { count: locations.length, categories } });
    },

    async show(req, res) {
      const id = parseLocationId(req.params.id);
      const location = await locationModel.findVerifiedById(id);
      if (!location) throw new HttpError(404, 'Location not found.');
      res.json({ data: location });
    },

    async suggest(req, res) {
      const suggestion = validateSuggestion(req.body);
      const id = await locationModel.createSuggestion(suggestion);
      res.status(201).json({
        data: { id, ...suggestion, is_verified: false },
        message: 'Thanks! Your suggestion was received and will appear on the map once it has been verified.',
      });
    },
  };
}
