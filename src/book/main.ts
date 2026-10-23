import { initSite } from "../site/site.ts";
import { bindForm } from "../site/forms.ts";
import { SITE } from "../site/config.ts";
import { MEETING_TYPES, TIME_SLOTS, slotStartUtc, upcomingWeekdays, type MeetingType } from "../shared/booking.ts";
import "../styles/book.css";

initSite();

const form = document.querySelector<HTMLFormElement>("[data-booking]")!;
const summary = {
  title: document.querySelector<HTMLElement>("[data-summary-title]")!,
  when: document.querySelector<HTMLElement>("[data-summary-when]")!,
  desc: document.querySelector<HTMLElement>("[data-summary-desc]")!,
};
// /book?type=heimdall (or demo, visit) opens with that format chosen.
const asked = new URLSearchParams(location.search).get("type");
const state: { type: MeetingType; date: string; time: string } = {
  type: asked && asked in MEETING_TYPES ? (asked as MeetingType) : "intro",
  date: "",
  time: "",
};

const DESCRIPTIONS: Record<MeetingType, string> = {
  intro: "A conversation about your line and whether a pilot makes sense.",
  demo: "We plan one of your own tasks in the Studio, live.",
  visit: "We come to your factory and look at the cell with you.",
  heimdall: "For government and enforcement agencies and their partners. A briefing on Heimdall's capabilities on the live Malaysian picture.",
};

const dayFormat = new Intl.DateTimeFormat("en-MY", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

function choices<T extends string>(
  host: HTMLElement,
  name: string,
  kind: "row" | "chip",
  options: { value: T; label: string; detail?: string }[],
  selected: T | "",
  onChange: (value: T) => void,
): void {
  host.replaceChildren(
    ...options.map((opt) => {
      const label = document.createElement("label");
      label.className = kind;
      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = opt.value;
      input.checked = opt.value === selected;
      input.addEventListener("change", () => onChange(opt.value));
      const text = document.createElement("span");
      if (kind === "row") text.className = "row__label";
      text.textContent = opt.label;
      label.append(input, text);
      if (opt.detail) {
        const detail = document.createElement("span");
        detail.className = "row__detail";
        detail.textContent = opt.detail;
        label.append(detail);
      }
      return label;
    }),
  );
}

function update(): void {
  const type = MEETING_TYPES[state.type];
  summary.title.textContent = type.label;
  summary.desc.textContent = `${type.minutes} minutes · ${type.where}. ${DESCRIPTIONS[state.type]}`;
  const ready = Boolean(state.date && state.time);
  summary.when.textContent = ready ? `${dayFormat.format(asDate(state.date))}, ${state.time}` : "Choose a day and a time";
  summary.when.classList.toggle("is-set", ready);
}

choices(
  form.querySelector("[data-types]")!,
  "type",
  "row",
  (Object.keys(MEETING_TYPES) as MeetingType[]).map((key) => ({
    value: key,
    label: MEETING_TYPES[key].label,
    detail: `${MEETING_TYPES[key].minutes} min · ${MEETING_TYPES[key].where}`,
  })),
  state.type,
  (v) => {
    state.type = v;
    update();
  },
);
choices(
  form.querySelector("[data-days]")!,
  "date",
  "chip",
  upcomingWeekdays(10).map((d) => ({ value: d, label: dayFormat.format(asDate(d)) })),
  "",
  (v) => {
    state.date = v;
    update();
  },
);
choices(
  form.querySelector("[data-times]")!,
  "time",
  "chip",
  TIME_SLOTS.map((t) => ({ value: t, label: t })),
  "",
  (v) => {
    state.time = v;
    update();
  },
);
update();

if (SITE.bookingUrl) {
  document.querySelector<HTMLElement>("[data-instant]")!.hidden = false;
  document.querySelector<HTMLAnchorElement>("[data-instant-link]")!.href = SITE.bookingUrl;
}

function icsFile(): string {
  const type = MEETING_TYPES[state.type];
  const start = slotStartUtc(state.date, state.time);
  const end = new Date(start.getTime() + type.minutes * 60_000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Seventh Axis//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(start)}-${Math.random().toString(36).slice(2)}@seventhaxis`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${type.label} with Seventh Axis (to be confirmed)`,
    "DESCRIPTION:Requested via the Seventh Axis website. We'll confirm the details by email.",
    "STATUS:TENTATIVE",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

// Day and time are radio groups outside bindForm's field list, so check them first.
form.addEventListener(
  "submit",
  (e) => {
    if (state.date && state.time) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    form.querySelector<HTMLElement>("[data-status]")!.textContent = state.date ? "Please choose a time." : "Please choose a day.";
    form.querySelector<HTMLInputElement>(state.date ? "input[name=time]" : "input[name=date]")?.focus();
  },
  { capture: true },
);

bindForm({
  form,
  endpoint: "/api/book",
  required: {
    name: "Please enter your name.",
    email: "Please enter a valid work email.",
    consent: "Please tick the box so we can arrange the meeting.",
  },
  payload: (data) => ({
    type: state.type,
    date: state.date,
    time: state.time,
    name: String(data.get("name") ?? "").trim(),
    email: String(data.get("email") ?? "").trim(),
    company: String(data.get("company") ?? "").trim(),
    phone: String(data.get("phone") ?? "").trim(),
    notes: String(data.get("notes") ?? "").trim(),
    consent: data.get("consent") === "on",
    website: String(data.get("website") ?? ""),
  }),
  onSuccess: () => {
    const panel = document.createElement("div");
    panel.className = "book__done";
    panel.tabIndex = -1;
    panel.innerHTML = `<h1>Request received.</h1><p></p><p>We'll confirm by email within one working day.</p><a class="btn btn--primary" download="seventh-axis-meeting.ics">Add to calendar</a>`;
    panel.querySelector("p")!.textContent = `${summary.title.textContent}, ${summary.when.textContent} (Malaysia time).`;
    panel.querySelector<HTMLAnchorElement>("a")!.href = URL.createObjectURL(new Blob([icsFile()], { type: "text/calendar" }));
    form.replaceWith(panel);
    panel.focus();
  },
});
