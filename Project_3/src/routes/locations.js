import { Router } from 'express';
import { createLocationsController } from '../controllers/locationsController.js';

export function createLocationsRouter({ locationModel, suggestLimiter }) {
  const controller = createLocationsController(locationModel);
  const router = Router();

  router.get('/', controller.list);
  router.post('/suggest', suggestLimiter, controller.suggest);
  router.get('/:id', controller.show);

  return router;
}
