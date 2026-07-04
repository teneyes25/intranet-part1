"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FormStepItem {
  id: string;
  label: string;
}

interface FormStepsProps {
  steps: FormStepItem[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function FormSteps({
  steps,
  currentStep,
  onStepClick,
  className,
}: FormStepsProps) {
  return (
    <nav
      aria-label="작성 단계"
      className={cn("w-full", className)}
    >
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
        {steps.map((step, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          const clickable = onStepClick && (done || active);

          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-1 items-center",
                index < steps.length - 1 && "sm:after:mx-2 sm:after:h-px sm:after:flex-1 sm:after:bg-border/70 sm:after:content-['']",
              )}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(index)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors sm:w-auto sm:border-0 sm:px-2 sm:py-1",
                  active && "border-primary/30 bg-primary/5 font-semibold text-foreground",
                  done && !active && "text-muted-foreground hover:text-foreground",
                  !active && !done && "border-border/50 text-muted-foreground",
                  clickable && "cursor-pointer",
                  !clickable && "cursor-default",
                )}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    active && "bg-primary text-primary-foreground",
                    done && !active && "bg-primary/15 text-primary",
                    !active && !done && "bg-muted text-muted-foreground",
                  )}
                >
                  {done && !active ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
