import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
  content: string;
}

export function HelpTooltip({ content }: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground cursor-help p-0.5 rounded ml-1.5 transition-colors">
            <HelpCircle size={14} className="opacity-70 hover:opacity-100" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-slate-900 text-slate-50 p-2.5 text-xs rounded border border-slate-800 shadow-lg leading-relaxed">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
