import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Roster } from "@/pages/Roster";
import { LiveMatch } from "@/pages/LiveMatch";
import { LineBuilder } from "@/pages/LineBuilder";
import { Analytics } from "@/pages/Analytics";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="roster" element={<Roster />} />
          <Route path="match" element={<LiveMatch />} />
          <Route path="line-builder" element={<LineBuilder />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
