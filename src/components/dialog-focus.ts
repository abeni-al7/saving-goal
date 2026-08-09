import type { KeyboardEvent } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function containDialogFocus(
  event: KeyboardEvent,
  container: HTMLElement | null,
): void {
  if (event.key !== "Tab" || container === null) {
    return;
  }

  const controls = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector),
  );
  const firstControl = controls[0];
  const lastControl = controls.at(-1);

  if (firstControl === undefined || lastControl === undefined) {
    return;
  }

  if (event.shiftKey && document.activeElement === firstControl) {
    event.preventDefault();
    lastControl.focus();
  } else if (!event.shiftKey && document.activeElement === lastControl) {
    event.preventDefault();
    firstControl.focus();
  }
}
