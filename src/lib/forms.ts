/**
 * Shared progressive-enhancement for members-area forms.
 *
 * Every form works without JavaScript: the server validates and redirects
 * back with a `?status=` the page renders. This module only *adds* to that
 * baseline — inline validation, a double-submit guard, and confirm dialogs —
 * so a new form gets the same polish without re-implementing any of it.
 * Enhance only forms that opt in with the `data-enhance` attribute — select
 * them with a `form[data-enhance]` query and pass each to `enhanceForm`.
 *
 * Dependency-free and DOM-only, matching the rest of the members code.
 */

export interface FieldValidation {
  /** The control being validated. */
  input: HTMLInputElement;
  /** Where to render (and clear) the inline problem message. */
  error: HTMLElement;
  /** Returns a human-readable problem, or null when the value is valid. */
  validate: (value: string) => string | null;
}

export interface EnhanceOptions {
  /** Block submission and show an inline message when the value is invalid. */
  field?: FieldValidation;
  /**
   * Ask before submitting. Return the confirmation message, or null to skip
   * the prompt. Evaluated at submit time so it can name live values.
   */
  confirm?: () => string | null;
}

/**
 * Wires one form's client-side behavior. Safe to call on any form; every
 * option is optional, so a plain form just gets the double-submit guard.
 */
export function enhanceForm(
  form: HTMLFormElement,
  options: EnhanceOptions = {},
): void {
  const { field, confirm } = options;

  const showProblem = (message: string | null) => {
    if (!field) return;
    field.error.textContent = message ?? "";
    field.error.hidden = message === null;
    field.input.setAttribute(
      "aria-invalid",
      message === null ? "false" : "true",
    );
  };

  // Clear a stale complaint as soon as the member starts fixing it.
  if (field) {
    field.input.addEventListener("input", () => {
      if (!field.error.hidden) showProblem(null);
    });
  }

  form.addEventListener("submit", (event) => {
    if (field) {
      const problem = field.validate(field.input.value);
      if (problem) {
        event.preventDefault();
        showProblem(problem);
        field.input.focus();
        return;
      }
      showProblem(null);
    }

    if (confirm) {
      const message = confirm();
      if (message !== null && !window.confirm(message)) {
        event.preventDefault();
        return;
      }
    }

    // Guard against a double submit while the request is in flight;
    // re-enabled on bfcache restore so Back leaves a usable form.
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    if (button) button.disabled = true;
  });
}

/**
 * Re-enables submit buttons disabled by {@link enhanceForm} when the page is
 * restored from the back/forward cache. Call once per page.
 */
export function restoreOnPageShow(): void {
  window.addEventListener("pageshow", () => {
    document
      .querySelectorAll<HTMLButtonElement>("button[type=submit][disabled]")
      .forEach((button) => (button.disabled = false));
  });
}
