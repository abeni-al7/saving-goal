import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the application heading", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Saving goals" }),
    ).toBeInTheDocument();
  });

  it("shows the first-run goal dashboard", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Start your first goal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("main", { name: "Saving goals workspace" }),
    ).toBeInTheDocument();
  });
});
