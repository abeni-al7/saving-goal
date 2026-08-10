import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: () => <div data-testid="vercel-speed-insights" />,
}));

vi.mock("./App.tsx", () => ({
  default: () => <div data-testid="saving-goals-app" />,
}));

describe("application entry point", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("mounts Vercel Analytics and Speed Insights with the app", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import("./main");

    expect(await screen.findByTestId("saving-goals-app")).toBeInTheDocument();
    expect(screen.getByTestId("vercel-analytics")).toBeInTheDocument();
    expect(screen.getByTestId("vercel-speed-insights")).toBeInTheDocument();
  });
});
