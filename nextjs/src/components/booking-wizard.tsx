"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import clsx from "clsx";
import { BOOKING_TIMES, bookingSchema, formatMoney } from "@/lib/booking";
import { Button, EmptyState, Spinner } from "./ui";

type Service = {
  id: number;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  price: number;
  color: string;
  active: boolean;
};

const SERVICE_PAGE_SIZE = 50;
const STEP_TITLES = ["Choose a service", "Date & time", "Your details", "Review & confirm"];
const LAST_STEP_INDEX = STEP_TITLES.length - 1;
const STEP_DESCRIPTIONS = [
  "Select the experience that fits your customer.",
  "Find the right date and available time slot.",
  "Add the information needed for this appointment.",
  "Double-check the details before confirming.",
];
const AVAILABILITY_FAILURE_MESSAGE = "Could not load available times. Please try again.";
const SELECT_SERVICE_MESSAGE = "Select a service to continue";
const CHECKING_AVAILABILITY_MESSAGE = "Checking available times...";
const CHOOSE_DATE_AND_TIME_MESSAGE = "Choose a future date and available time";
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}
const SERVICE_ACCENTS: Record<string, string> = {
  indigo: "bg-[#eeedff] text-[#7770df]",
  rose: "bg-[#ffedf1] text-[#ca7590]",
  amber: "bg-[#fff3e5] text-[#d69c59]",
  cyan: "bg-[#e8f7fb] text-[#52a6bc]",
  emerald: "bg-[#e8f8f0] text-[#51ae8a]",
  violet: "bg-[#f4ecff] text-[#a076cf]",
};

export function BookingWizard() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(0);
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [booked, setBooked] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ reference: string } | null>(null);
  const selectedService = services.find((item) => item.id === serviceId);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/services?active=true&limit=${SERVICE_PAGE_SIZE}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => setServices(result.items || []))
      .catch(() => setError("Could not load services. Please refresh the page."))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!serviceId || !date) {
      setBooked([]);
      setAvailabilityLoading(false);
      setAvailabilityError("");
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({ serviceId: String(serviceId), date });
    setAvailabilityLoading(true);
    setAvailabilityError("");

    fetch("/api/availability?" + query.toString(), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Availability request failed");
        return await response.json() as { booked?: string[] };
      })
      .then((result) => {
        const unavailable = result.booked || [];
        setBooked(unavailable);
        setTimeSlot((current) => unavailable.includes(current) ? "" : current);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setBooked([]);
        setTimeSlot("");
        setAvailabilityError(AVAILABILITY_FAILURE_MESSAGE);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });

    return () => controller.abort();
  }, [serviceId, date]);

  function next() {
    setError("");
    if (step === 0 && !serviceId) {
      setError(SELECT_SERVICE_MESSAGE);
      return;
    }
    if (step === 1 && availabilityError) {
      setError(AVAILABILITY_FAILURE_MESSAGE);
      return;
    }
    if (step === 1 && availabilityLoading) {
      setError(CHECKING_AVAILABILITY_MESSAGE);
      return;
    }
    if (step === 1 && (!date || date < getTodayDate() || !timeSlot)) {
      setError(CHOOSE_DATE_AND_TIME_MESSAGE);
      return;
    }
    if (step === 2) {
      const checked = bookingSchema.safeParse({
        serviceId,
        date,
        timeSlot,
        customerName,
        customerEmail,
        customerPhone,
        notes,
      });
      if (!checked.success) {
        setError(checked.error.issues[0]?.message || "Please check your details");
        return;
      }
    }
    setStep((current) => Math.min(LAST_STEP_INDEX, current + 1));
  }

  async function submit() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, date, timeSlot, customerName, customerEmail, customerPhone, notes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Booking failed");
      setSuccess(result);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Booking failed"); }
    finally { setSaving(false); }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-[660px] pb-16 pt-12 text-center">
        <div className="surface p-10 sm:p-14">
          <div
            className={clsx(
              "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full",
              "bg-[#e5f8ee] text-[#2eaf7a]",
            )}
          >
            <CheckCircle2 size={42} />
          </div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[.2em] text-[#60b68b]">
            All set
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Booking confirmed!</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#8f9aaf]">
            Your appointment is in the calendar. We have saved all the details securely in the
            local database.
          </p>
          <div className="mx-auto mt-8 max-w-sm rounded-xl bg-[#f7f8fc] p-5">
            <div className="mb-2 text-xs font-semibold text-[#96a1b5]">Booking reference</div>
            <div className="text-xl font-extrabold tracking-wide text-[#6560d8]">
              {success.reference}
            </div>
            <div className="mt-3 text-sm font-medium">
              {selectedService?.name} · {date} at {timeSlot}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/bookings"
              className={clsx(
                "inline-flex h-11 items-center justify-center rounded-xl",
                "bg-[#6965e8] px-5 text-sm font-bold text-white",
              )}
            >
              View all bookings <ArrowRight size={16} className="ml-2" />
            </Link>
            <Link
              href="/dashboard"
              className={clsx(
                "inline-flex h-11 items-center justify-center rounded-xl border",
                "border-[#e0e5ee] px-5 text-sm font-bold",
              )}
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stepIcon =
    step === 0 ? <Sparkles /> : step === 1 ? <CalendarDays /> : step === 2 ? <UserRound /> : <ShieldCheck />;
  const displayedError = error || availabilityError;

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-1 text-xs font-semibold text-[#929db0]">Create an appointment</p>
        <h1 className="section-title">New booking</h1>
        <p className="mt-2 text-[13px] text-[#929db0]">
          Follow four simple steps to reserve a time for your customer.
        </p>
      </div>

      <div className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-7">
        {STEP_TITLES.map((title, index) => (
          <div key={title} className="flex items-center gap-3">
            <div
              className={clsx(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                index < step
                  ? "bg-[#e2f7ee] text-[#32a77b]"
                  : index === step
                    ? "bg-[#6e68ea] text-white"
                    : "bg-[#f0f2f7] text-[#a1aabc]",
              )}
            >
              {index < step ? <Check size={17} /> : index + 1}
            </div>
            <div className="hidden sm:block">
              <div
                className={clsx(
                  "text-[11px] font-bold",
                  index === step ? "text-[#515cc2]" : "text-[#9aa5b8]",
                )}
              >
                Step {index + 1}
              </div>
              <div className="text-xs font-bold text-[#4a5770]">{title}</div>
            </div>
            {index < LAST_STEP_INDEX && (
              <div className="mx-1 hidden h-px w-6 bg-[#e3e6f0] lg:block xl:w-14" />
            )}
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <div className="surface min-h-[510px] p-6 sm:p-8">
          <div className="mb-7 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.17em] text-[#8e8ae4]">
                Step {step + 1} of {STEP_TITLES.length}
              </p>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight">
                {STEP_TITLES[step]}
              </h2>
              <p className="mt-2 text-[13px] text-[#98a3b7]">
                {STEP_DESCRIPTIONS[step]}
              </p>
            </div>
            <div className="hidden rounded-xl bg-[#f2f1ff] p-3 text-[#817be4] sm:block">
              {stepIcon}
            </div>
          </div>

          {loading && step === 0 ? (
            <Spinner label="Loading available services..." />
          ) : (
            <>
              {step === 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.length === 0 ? (
                    <div className="col-span-2">
                      <EmptyState
                        title="No active services"
                        description="Ask an admin to add a service first."
                      />
                    </div>
                  ) : (
                    services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        aria-label={service.name}
                        onClick={() => {
                          setServiceId(service.id);
                          setError("");
                        }}
                        className={clsx(
                          "rounded-xl border-2 p-4 text-left transition-all hover:border-[#bebaf8]",
                          serviceId === service.id
                            ? "border-[#7771e9] bg-[#f8f7ff]"
                            : "border-[#edf0f5] bg-white",
                        )}
                      >
                        <div className="mb-4 flex items-start justify-between">
                          <div
                            className={clsx(
                              "flex h-11 w-11 items-center justify-center rounded-xl",
                              SERVICE_ACCENTS[service.color] || SERVICE_ACCENTS.indigo,
                            )}
                          >
                            <Sparkles size={20} />
                          </div>
                          {serviceId === service.id && (
                            <div className="rounded-full bg-[#736cec] p-1 text-white">
                              <Check size={13} />
                            </div>
                          )}
                        </div>
                        <div className="text-[13px] font-extrabold">{service.name}</div>
                        <p className="mt-2 min-h-12 text-xs leading-5 text-[#97a1b5]">
                          {service.description}
                        </p>
                        <div className="mt-4 flex items-center justify-between border-t border-[#e9edf4] pt-3">
                          <span className="flex items-center gap-1 text-[11px] text-[#929eb2]">
                            <Clock3 size={13} /> {service.durationMinutes} min
                          </span>
                          <span className="text-[12px] font-extrabold text-[#6660d8]">
                            {formatMoney(service.price)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="booking-date" className="field-label">
                      Booking date
                    </label>
                    <input
                      id="booking-date"
                      type="date"
                      className="field max-w-sm"
                      min={getTodayDate()}
                      value={date}
                      onChange={(event) => {
                        setDate(event.target.value);
                        setTimeSlot("");
                        setAvailabilityError("");
                        setError("");
                      }}
                    />
                    <p className="mt-2 text-xs text-[#9ba6b9]">
                      Appointments are available for today and future dates.
                    </p>
                  </div>

                  <div>
                    <div className="field-label mb-3">Available time slots</div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {BOOKING_TIMES.map((slot) => {
                        const unavailable = booked.includes(slot);
                        const disabled =
                          !date ||
                          availabilityLoading ||
                          Boolean(availabilityError) ||
                          unavailable;

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setTimeSlot(slot);
                              setError("");
                            }}
                            className={clsx(
                              "flex h-11 items-center justify-center rounded-xl border",
                              "text-[13px] font-bold transition-colors",
                              timeSlot === slot
                                ? "border-[#7771e9] bg-[#eeedff] text-[#6d65dd]"
                                : "border-[#e4e8f0] bg-white text-[#69758e] hover:border-[#aaa7f2]",
                              unavailable &&
                                "!cursor-not-allowed !border-[#eef1f5] !bg-[#f5f6f9] !text-[#bec5d2] line-through",
                            )}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    {availabilityLoading && (
                      <p role="status" className="mt-3 text-xs text-[#9ba6b9]">
                        {CHECKING_AVAILABILITY_MESSAGE}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-[11px] text-[#9aa5b6]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#7771e9]" /> Selected
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#d8deea]" /> Unavailable
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="field-label" htmlFor="customer-name">
                      Full name
                    </label>
                    <div className="relative">
                      <UserRound size={16} className="absolute left-3.5 top-3.5 text-[#9ca8b9]" />
                      <input
                        id="customer-name"
                        className="field pl-10"
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                        placeholder="e.g. Alex Johnson"
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="customer-email">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-3.5 text-[#9ca8b9]" />
                        <input
                          id="customer-email"
                          type="email"
                          className="field pl-10"
                          value={customerEmail}
                          onChange={(event) => setCustomerEmail(event.target.value)}
                          placeholder="alex@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="customer-phone">
                        Phone number
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-3.5 text-[#9ca8b9]" />
                        <input
                          id="customer-phone"
                          className="field pl-10"
                          value={customerPhone}
                          onChange={(event) => setCustomerPhone(event.target.value)}
                          placeholder="090 123 4567"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="customer-notes">
                      Notes (optional)
                    </label>
                    <textarea
                      id="customer-notes"
                      className="field"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Anything the team should know beforehand?"
                    />
                  </div>
                  <div className="rounded-xl bg-[#f5f4ff] px-4 py-3 text-xs leading-5 text-[#7771bd]">
                    <ShieldCheck size={15} className="mr-1 inline" />
                    Customer details are saved in your local SQLite database for this demo.
                  </div>
                </div>
              )}

              {step === LAST_STEP_INDEX && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#e9edf4] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#9ba5b7]">
                        Appointment
                      </span>
                      <Sparkles className="text-[#7d76e7]" size={17} />
                    </div>
                    <div className="text-lg font-extrabold">{selectedService?.name}</div>
                    <div className="mt-2 text-sm text-[#8793aa]">
                      {date} at {timeSlot} · {selectedService?.durationMinutes} minutes
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#e9edf4] p-5">
                    <div className="mb-4 text-xs font-bold uppercase tracking-wider text-[#9ba5b7]">
                      Customer
                    </div>
                    <div className="font-bold">{customerName}</div>
                    <div className="mt-2 text-sm text-[#8793aa]">
                      {customerEmail} · {customerPhone}
                    </div>
                    {notes && <p className="mt-3 text-xs text-[#9ba6b7]">Notes: {notes}</p>}
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#f4f3ff] px-5 py-4">
                    <span className="flex items-center gap-2 text-sm font-bold text-[#6762b3]">
                      <CreditCard size={17} /> Service price
                    </span>
                    <span className="text-lg font-extrabold text-[#615bd0]">
                      {formatMoney(selectedService?.price || 0)}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-[#9da7b8]">
                    This is a demo booking; no actual payment is collected.
                  </p>
                </div>
              )}
            </>
          )}

          {displayedError && (
            <p role="alert" className="mt-5 rounded-xl bg-[#fff0f2] px-4 py-3 text-xs font-bold text-[#bc5969]">
              {displayedError}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-[#edf0f5] pt-6">
            <Button
              variant="secondary"
              disabled={step === 0 || saving}
              onClick={() => {
                setStep((current) => Math.max(0, current - 1));
                setError("");
              }}
            >
              <ArrowLeft size={15} /> Back
            </Button>
            {step < LAST_STEP_INDEX ? (
              <Button
                disabled={loading || (step === 1 && availabilityLoading)}
                onClick={next}
              >
                Continue <ArrowRight size={15} />
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving}>
                {saving ? "Confirming..." : "Confirm booking"} <Check size={16} />
              </Button>
            )}
          </div>
        </div>

        <aside className="surface p-6 lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[#eeedff] p-2.5 text-[#716bea]">
              <CalendarDays size={18} />
            </div>
            <div>
              <div className="text-[13px] font-extrabold">Booking summary</div>
              <p className="mt-0.5 text-[11px] text-[#9ca7b7]">Your appointment at a glance</p>
            </div>
          </div>
          <div className="my-5 h-px bg-[#e9edf4]" />
          <div className="space-y-4 text-[13px]">
            <div className="flex justify-between gap-3">
              <span className="text-[#9aa5b6]">Service</span>
              <span className="text-right font-bold">{selectedService?.name || "Not selected"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#9aa5b6]">Duration</span>
              <span className="font-bold">
                {selectedService ? `${selectedService.durationMinutes} min` : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#9aa5b6]">Date</span>
              <span className="font-bold">{date || "Not selected"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#9aa5b6]">Time</span>
              <span className="font-bold">{timeSlot || "Not selected"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#9aa5b6]">Customer</span>
              <span className="max-w-40 truncate text-right font-bold">
                {customerName || "Not added"}
              </span>
            </div>
          </div>
          <div className="my-5 h-px bg-[#e9edf4]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#98a3b5]">Total</span>
            <span className="text-xl font-extrabold text-[#6660dc]">
              {formatMoney(selectedService?.price || 0)}
            </span>
          </div>
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-[#f8f9fc] p-3 text-xs leading-5 text-[#93a0b3]">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#7f82c7]" />
            Secure demo workspace. Your details stay on your machine.
          </div>
        </aside>
      </div>
    </div>
  );
}
