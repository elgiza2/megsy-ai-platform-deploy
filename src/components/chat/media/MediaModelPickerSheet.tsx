import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { promptUpgrade } from "@/lib/upgradeMoment";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDynamicModels } from "@/hooks/useModels";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { BrandIcon, hasBrandIcon } from "@/components/chat/media/BrandIcon";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isFreeModel, isPaidUser } from "@/lib/subscriptionGating";
import { filterImageModels, filterVideoModels } from "@/lib/mediaModelPolicy";
import { isUnlimitedImageModel, isUnlimitedMediaModel } from "@/lib/mediaQuota";
import { useUserLang } from "@/lib/authI18n";
import megsyModelIcon from "@/assets/megsy-model.jpg";

function ModelIcon({ model }: { model: any }) {
  const isMegsy = /megsy/i.test(String(model.name || ""));
  const src = isMegsy ? megsyModelIcon : model.thumbnailUrl || model.iconUrl;
  if (src) return <img src={src} alt="" className={`h-11 w-11 shrink-0 rounded-xl ${isMegsy ? "object-cover" : "object-contain"}`} />;
  if (hasBrandIcon(model.name, model.provider)) {
    return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05]"><BrandIcon name={model.name} provider={model.provider} variant="color" size={28} /></span>;
  }
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05] text-lg font-bold text-foreground/70">{(model.name || "?").trim().charAt(0).toUpperCase()}</span>;
}

export interface MediaModelChoice {
  slug: string;
  name: string;
  provider: string;
  credits: number;
  thumbnail?: string;
  type: "image" | "video";
  isPremium?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "images" | "video";
  selectedSlug?: string;
  onSelect: (model: MediaModelChoice) => void;
}

export default function MediaModelPickerSheet({ open, onOpenChange, mode, selectedSlug, onSelect }: Props) {
  const { models, loading, error, reload } = useDynamicModels();
  const { plan } = useUserPlan();
  const paid = isPaidUser(plan);
  const isAr = useUserLang().startsWith("ar");
  const navigate = useNavigate();
  const filtered = useMemo(() => {
    const target = mode === "video" ? ["video", "video-i2v"] : ["image"];
    const scoped = models.filter((m) => target.includes(m.type as string));
    const sorted = (mode === "video" ? filterVideoModels(scoped) : filterImageModels(scoped)).sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured));
    return mode === "video" ? sorted.slice(0, 5) : sorted;
  }, [models, mode]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" onOpenAutoFocus={(event) => event.preventDefault()} className="z-[100] max-h-[82dvh] rounded-t-[30px] border border-border/60 bg-background p-0 shadow-[0_-24px_80px_-28px_rgba(0,0,0,.7)] [&>button.absolute]:hidden">
        <SheetHeader className="border-b border-border/60 px-5 pb-4 pt-4">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-foreground/15" />
          <SheetTitle className="text-left text-[17px] font-semibold tracking-tight text-foreground">{isAr ? "اختر نموذجًا" : "Choose a model"}</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(82dvh-76px)] min-h-0 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 [scrollbar-width:thin]" dir="ltr">
          {loading && <div className="rounded-2xl border border-border/60 bg-card p-5 text-center text-sm text-muted-foreground">Loading models…</div>}
          {error && !loading && <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-left"><AlertCircle className="h-4 w-4 shrink-0 text-amber-600" /><span className="min-w-0 flex-1 text-xs text-foreground/75">{error}</span><button type="button" onClick={reload} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2.5 py-1.5 text-[11px] font-semibold"><RefreshCw className="h-3 w-3" /> Retry</button></div>}
          {!loading && filtered.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No models available right now</div>}
          <div className="space-y-2">
            {filtered.map((m) => {
              const active = m.slug === selectedSlug;
              const modelIsFree = mode === "video" ? isUnlimitedMediaModel(m) : isFreeModel(m.slug || m.id) || (paid && isUnlimitedImageModel(m));
              const locked = !modelIsFree && !paid;
              return <button key={m.id} type="button" onClick={() => {
                if (locked) { promptUpgrade(m.name); onOpenChange(false); navigate("/pricing"); return; }
                onSelect({ slug: m.slug || m.id, name: m.name, provider: m.provider, credits: m.credits, thumbnail: m.thumbnailUrl || m.iconUrl, type: mode === "video" ? "video" : "image", isPremium: !!m.isPremium });
                toast.success(`Selected: ${m.name}`);
              }} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.035] ${active ? "border-primary/50 bg-primary/[0.07]" : "border-border/70 bg-card"}`}>
                <ModelIcon model={m} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">{m.name.replace(/\s*Free\s*/gi, " ").trim()}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.8} />}
              </button>;
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
