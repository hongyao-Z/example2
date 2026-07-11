import { useEffect } from "react";
import HomePage from "./pages/HomePage";
import RouteDecisionApp from "./RouteDecisionApp";

export function App() {
  const pathname = window.location.pathname;
  const isToolPath = pathname === "/app" || pathname.startsWith("/share/");

  useEffect(() => {
    document.body.dataset.view = isToolPath ? "tool" : "home";
    return () => {
      delete document.body.dataset.view;
    };
  }, [isToolPath]);

  if (!isToolPath) return <HomePage />;
  return <RouteDecisionApp />;
}

export default App;
