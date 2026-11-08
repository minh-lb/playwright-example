import clsx from "clsx";
import { Check } from "lucide-react";

export function BookingStepProgress({ titles, step }: { titles: readonly string[]; step: number }) {
  return <div className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-7">
    {titles.map((title, index) =>
      <div key={title} className="flex items-center gap-3" aria-current={index === step ? "step" : undefined}>
        <div className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
          index < step ? "bg-[#e2f7ee] text-[#32a77b]" : index === step
            ? "bg-[#6e68ea] text-white" : "bg-[#f0f2f7] text-[#a1aabc]",
        )}>
          {index < step ? <Check size={17}/> : index + 1}
        </div>
        <div className="hidden sm:block">
          <div className={clsx("text-[11px] font-bold", index === step ? "text-[#515cc2]" : "text-[#9aa5b8]")}>Step {index + 1}</div>
          <div className="text-xs font-bold text-[#4a5770]">{title}</div>
        </div>
        {index < titles.length - 1 && <div className="mx-1 hidden h-px w-6 bg-[#e3e6f0] lg:block xl:w-14"/>}
      </div>)}
  </div>;
}
