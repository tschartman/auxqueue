import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './routes/Landing';
import HostSetup from './routes/HostSetup';
import HostConnect from './routes/HostConnect';
import GuestJoin from './routes/GuestJoin';
import Party from './routes/Party';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/host/setup" element={<HostSetup />} />
        <Route path="/host/connect" element={<HostConnect />} />
        <Route path="/join" element={<GuestJoin />} />
        <Route path="/join/:code" element={<GuestJoin />} />
        <Route path="/party/:partyId" element={<Party />} />
      </Routes>
    </BrowserRouter>
  );
}
