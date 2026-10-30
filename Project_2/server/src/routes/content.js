import { Router } from 'express';
import { missions, missionsById } from '../data/missions.js';
import { planets, planetsById } from '../data/planets.js';
import { HttpError } from '../lib/httpError.js';

const router = Router();

// The catalog only changes with a deploy, so browsers may reuse it briefly.
const cacheBriefly = (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300');
  next();
};

// The fields a mission card needs; the long-form text is only sent for a single mission.
const missionSummary = ({ id, name, agency, type, status, launchDate, destination, summary, planets: related }) => ({
  id,
  name,
  agency,
  type,
  status,
  launchDate,
  destination,
  summary,
  planets: related,
});

// Previous and next entries, so detail pages can link to their neighbors.
function neighbors(list, item) {
  const index = list.indexOf(item);
  const link = (entry) => (entry ? { id: entry.id, name: entry.name } : null);
  return { previous: link(list[index - 1]), next: link(list[index + 1]) };
}

router.get('/planets', cacheBriefly, (req, res) => {
  res.json({ planets });
});

router.get('/planets/:id', cacheBriefly, (req, res) => {
  const planet = planetsById.get(req.params.id);
  if (!planet) throw new HttpError(404, 'We could not find that world.');

  const related = missions.filter((mission) => mission.planets.includes(planet.id)).map(missionSummary);
  res.json({ planet, missions: related, ...neighbors(planets, planet) });
});

router.get('/missions', cacheBriefly, (req, res) => {
  res.json({ missions: missions.map(missionSummary) });
});

router.get('/missions/:id', cacheBriefly, (req, res) => {
  const mission = missionsById.get(req.params.id);
  if (!mission) throw new HttpError(404, 'We could not find that mission.');

  const related = mission.planets.map((id) => {
    const { name, type, tagline } = planetsById.get(id);
    return { id, name, type, tagline };
  });
  res.json({ mission, planets: related, ...neighbors(missions, mission) });
});

export default router;
