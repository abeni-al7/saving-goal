import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { SAVINGS_STORAGE_KEY } from "./storage/schema";

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

  it("preserves corrupt saved data until reset is explicitly confirmed", async () => {
    const user = userEvent.setup();
    const corruptValue = "{account: definitely-not-json";
    window.localStorage.setItem(SAVINGS_STORAGE_KEY, corruptValue);

    render(<App />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Saved data could not be loaded and has been preserved.",
    );
    expect(window.localStorage.getItem(SAVINGS_STORAGE_KEY)).toBe(corruptValue);

    await user.click(screen.getByRole("button", { name: "Reset saved data" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(window.localStorage.getItem(SAVINGS_STORAGE_KEY)).toBe(corruptValue);

    await user.click(screen.getByRole("button", { name: "Reset saved data" }));
    await user.click(screen.getByRole("button", { name: "Reset permanently" }));

    await waitFor(() => {
      expect(window.localStorage.getItem(SAVINGS_STORAGE_KEY)).not.toBe(
        corruptValue,
      );
      expect(
        screen.getByRole("main", { name: "Saving goals workspace" }),
      ).toHaveFocus();
    });
    expect(
      screen.getByRole("heading", { name: "Start your first goal" }),
    ).toBeInTheDocument();
  });
});
