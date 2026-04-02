import { Outlet } from "react-router-dom";

/** Full-viewport shell: no sidebar, no tab nav — sideline / mobile first. */
export function LiveMatchShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
