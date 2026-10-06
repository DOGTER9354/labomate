'use client'

import { useState } from 'react'
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  ShieldCheck,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatYen, type Experiment } from '@/lib/experiments'
import { CategoryBadge, RequirementChip, StatusBadge } from '@/components/labomate/experiment-badges'

type ExperimentDialogProps = {
  experiment: Experiment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  bookedSlotId?: string
  onConfirm: (experimentId: string, slotId: string) => void
}

export function ExperimentDialog({ experiment, open, onOpenChange, bookedSlotId, onConfirm }: ExperimentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        {experiment && (
          <DialogBody
            key={experiment.id}
            experiment={experiment}
            bookedSlotId={bookedSlotId}
            onConfirm={(slotId) => onConfirm(experiment.id, slotId)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</h3>
}

function DialogBody({
  experiment,
  bookedSlotId,
  onConfirm,
}: {
  experiment: Experiment
  bookedSlotId?: string
  onConfirm: (slotId: string) => void
}) {
  const [slotId, setSlotId] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)

  const bookedSlot = experiment.slots.find((s) => s.id === bookedSlotId)
  const canSubmit = Boolean(slotId) && consent

  if (bookedSlot) {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <DialogTitle className="mt-4 text-lg font-semibold">Application confirmed</DialogTitle>
        <DialogDescription className="mt-2 max-w-sm text-pretty">
          {"You're booked for "}
          <span className="font-medium text-foreground">{experiment.title}</span>. A confirmation has been sent to your
          .ac.jp email.
        </DialogDescription>
        <div className="mt-6 w-full max-w-sm rounded-xl border bg-muted/40 p-4 text-left">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarCheck className="size-4 text-primary" aria-hidden="true" />
            {bookedSlot.day}, {bookedSlot.date} · {bookedSlot.time}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-secondary-foreground">
            <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
            {experiment.location}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-secondary-foreground">
            <User className="size-4 text-muted-foreground" aria-hidden="true" />
            Contact: {experiment.contact}
          </div>
        </div>
        <DialogClose render={<Button className="mt-6 h-10 rounded-lg px-6" />}>Done</DialogClose>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (slotId && consent) onConfirm(slotId)
      }}
    >
      <div className="border-b px-6 pt-6 pb-5">
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <StatusBadge experiment={experiment} />
          <CategoryBadge category={experiment.category} />
        </div>
        <DialogTitle className="mt-3 text-xl leading-snug font-semibold text-balance">{experiment.title}</DialogTitle>
        <DialogDescription className="mt-1.5">{experiment.department}</DialogDescription>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: MapPin, label: 'Location', value: experiment.location },
            { icon: Clock, label: 'Duration', value: `${experiment.durationMins} mins` },
            { icon: Wallet, label: 'Reward', value: formatYen(experiment.rewardAmount), sub: experiment.rewardType },
            { icon: Users, label: 'Open spots', value: `${experiment.spotsLeft} / ${experiment.spotsTotal}` },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="rounded-lg border bg-muted/40 p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-1 text-sm leading-snug font-semibold text-foreground">{value}</dd>
              {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-6 px-6 py-5">
        <section className="flex flex-col gap-2">
          <SectionHeading>About this experiment</SectionHeading>
          <p className="text-sm leading-relaxed text-secondary-foreground">{experiment.description}</p>
          <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Requirements">
            {experiment.requirements.map((req) => (
              <li key={req}>
                <RequirementChip>{req}</RequirementChip>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading>Lab</SectionHeading>
          <div className="flex items-start gap-3 rounded-xl border p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <GraduationCap className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{experiment.labName}</p>
              <p className="text-sm text-secondary-foreground">PI: {experiment.professor}</p>
              <p className="text-sm text-muted-foreground">Contact: {experiment.contact}</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading>Ethics & informed consent</SectionHeading>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-2 border-b border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-800">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Approved by University Ethics Review Board · {experiment.ethicsId}
            </div>
            <div
              tabIndex={0}
              aria-label="Informed consent document preview"
              className="max-h-32 overflow-y-auto px-4 py-3 text-xs leading-relaxed text-secondary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <p>
                Participation in this study is entirely voluntary. You may withdraw at any time, before or during the
                session, without giving a reason and without any penalty or effect on your academic standing.
              </p>
              <p className="mt-2">
                All data collected will be anonymized and stored securely on university servers for up to 5 years in
                accordance with the university data protection policy. Results may be published in academic journals in
                aggregate form only; no individually identifiable information will be disclosed.
              </p>
              <p className="mt-2">
                There are no known risks beyond those of everyday life. If you experience discomfort at any point,
                please notify the experimenter immediately. Rewards are provided in full even if you withdraw partway
                through.
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg p-1 text-sm text-foreground">
            <Checkbox checked={consent} onCheckedChange={(checked) => setConsent(checked)} className="mt-0.5" />
            <span>I agree to participate based on the university ethics guidelines</span>
          </label>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading>Available time slots</SectionHeading>
          <div role="radiogroup" aria-label="Available time slots" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {experiment.slots.map((slot) => {
              const selected = slot.id === slotId
              return (
                <button
                  key={slot.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!slot.available}
                  onClick={() => setSlotId(slot.id)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    selected
                      ? 'border-primary bg-accent ring-1 ring-primary'
                      : 'bg-card hover:border-primary/40 hover:bg-muted/40',
                    !slot.available && 'cursor-not-allowed opacity-50 hover:border-border hover:bg-card',
                  )}
                >
                  <span className="flex flex-col">
                    <span className={cn('text-sm font-medium', selected ? 'text-accent-foreground' : 'text-foreground')}>
                      {slot.day} {slot.time}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {slot.date}
                      {!slot.available && ' · Full'}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-primary bg-primary' : 'border-input',
                    )}
                    aria-hidden="true"
                  >
                    {selected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-card/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {!slotId ? 'Select a time slot to continue.' : !consent ? 'Please agree to the consent notice.' : 'Ready to submit.'}
        </p>
        <div className="flex gap-2">
          <DialogClose render={<Button type="button" variant="outline" className="h-10 flex-1 rounded-lg sm:flex-none" />}>
            Cancel
          </DialogClose>
          <Button type="submit" disabled={!canSubmit} className="h-10 flex-1 rounded-lg px-5 font-medium sm:flex-none">
            Confirm Application
          </Button>
        </div>
      </div>
    </form>
  )
}
