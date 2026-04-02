import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LiveMatchShell } from "@/components/layout/LiveMatchShell";
import { LiveMatch } from "@/pages/LiveMatch";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LiveMatchShell />}>
          <Route index element={<LiveMatch />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
