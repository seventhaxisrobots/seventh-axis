// Shared handling for the site's lead forms: inline validation, one request at
// a time, and friendly messages for each API error.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type ApiResponse = { ok?: boolean; duplicate?: boolean; error?: string };

interface FormOptions {
  form: HTMLFormElement;
  endpoint: string;
  required: Record<string, string>;
  payload: (data: FormData) => Record<string, unknown>;
  onSuccess: (response: ApiResponse, payload: Record<string, unknown>) => void;
}

export function bindForm({ form, endpoint, required, payload, onSuccess }: FormOptions): void {
  const status = form.querySelector<HTMLElement>("[data-status]")!;
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const label = button.textContent;
  const control = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;

  const setError = (name: string, message: string) => {
    const input = control(name);
    if (!input) return;
    const error = document.getElementById(`${input.id}-error`);
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (error) input.setAttribute("aria-describedby", error.id);
    } else {
      input.removeAttribute("aria-invalid");
    }
  };

  const validate = (): boolean => {
    for (const [name, message] of Object.entries(required)) {
      const input = control(name);
      if (!input) continue;
      let bad = input.type === "checkbox" ? !input.checked : !input.value.trim();
      if (!bad && input.type === "email" && !EMAIL_RE.test(input.value.trim())) bad = true;
      setError(name, bad ? message : "");
    }
    const first = form.querySelector<HTMLElement>("[aria-invalid=true]");
    first?.focus();
    return !first;
  };

  for (const name of Object.keys(required)) {
    const input = control(name);
    input?.addEventListener(input.type === "checkbox" ? "change" : "input", () => setError(name, ""));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    if (!validate()) return;

    const body = payload(new FormData(form));
    button.disabled = true;
    button.textContent = "Sending…";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (res.ok && data.ok) {
        onSuccess(data, body);
        return;
      }
      if (data.error === "invalid_email") {
        setError("email", "Please enter a valid work email.");
        control("email")?.focus();
      } else if (res.status === 400) {
        status.textContent = "Please check the form and try again.";
      } else if (res.status === 429) {
        status.textContent = "Too many attempts. Please try again in a few minutes.";
      } else {
        status.textContent = "Something went wrong on our side. Please try again, or email us.";
      }
    } catch {
      status.textContent = "We couldn't reach the server. Check your connection and try again.";
    }
    button.disabled = false;
    button.textContent = label;
  });
}
