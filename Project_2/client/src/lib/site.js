import {
  faBinoculars,
  faFlag,
  faRobot,
  faRocket,
  faSatellite,
  faSatelliteDish,
  faShuttleSpace,
  faUserAstronaut,
} from '@fortawesome/free-solid-svg-icons';

// Rename the site here (and in index.html).
export const SITE_NAME = 'Apogee';
export const SITE_TAGLINE = 'Space exploration atlas';

const missionIcons = {
  Satellite: faSatellite,
  Crewed: faUserAstronaut,
  Probe: faSatelliteDish,
  Orbiter: faSatellite,
  Rover: faRobot,
  Lander: faFlag,
  'Space telescope': faBinoculars,
  'Space station': faShuttleSpace,
};

export const missionIcon = (type) => missionIcons[type] ?? faRocket;

export const GALLERY_DEFAULT_QUERY = 'nebula';
export const GALLERY_TOPICS = [
  'Nebula',
  'Galaxy',
  'Earth from orbit',
  'Apollo 11',
  'Mars rover',
  'Jupiter',
  'Saturn rings',
  'James Webb',
  'Spacewalk',
  'Rocket launch',
];
