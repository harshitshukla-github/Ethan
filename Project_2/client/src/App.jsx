import { Route, Routes } from 'react-router';
import Layout from './components/Layout.jsx';
import { GuestOnly, RequireAuth } from './components/RouteGuards.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Gallery from './pages/Gallery.jsx';
import Home from './pages/Home.jsx';
import Launches from './pages/Launches.jsx';
import Login from './pages/Login.jsx';
import MissionDetail from './pages/MissionDetail.jsx';
import Missions from './pages/Missions.jsx';
import NotFound from './pages/NotFound.jsx';
import PlanetDetail from './pages/PlanetDetail.jsx';
import Planets from './pages/Planets.jsx';
import Register from './pages/Register.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="planets" element={<Planets />} />
        <Route path="planets/:id" element={<PlanetDetail />} />
        <Route path="missions" element={<Missions />} />
        <Route path="missions/:id" element={<MissionDetail />} />
        <Route path="launches" element={<Launches />} />
        <Route path="gallery" element={<Gallery />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<Dashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
