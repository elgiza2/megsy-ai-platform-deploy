import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { promptUpgrade } from "@/lib/upgradeMoment";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useDynamicModels } from "@/hooks/useModels";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { BrandIcon, hasBrandIcon } from "@/components/chat/media/BrandIcon";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isFreeModel, isPaidUser } from "@/lib/subscriptionGating";
import { filterImageModels, filterVideoModels } from "@/lib/mediaModelPolicy";
import { isUnlimitedImageModel, isUnlimitedMediaModel, mediaModelBadge } from "@/lib/mediaQuota";
import MegsyStar from "@/components/branding/MegsyStar";
import { useUserLang } from "@/lib/authI18n";
import megsyModelIcon from "@/assets/megsy-model.jpg";

/** Keep every description to three words max. */
function shortDescription(text: string): string {
  return text.replace(/\s+/g, " ").trim().split(" ").slice(0, 3).join(" ");
}

function ModelIcon({ model }: { model: any }) {
  const isMegsy = /megsy/i.test(String(model.name || ""));
  const src = isMegsy ? megsyModelIcon : model.thumbnailUrl || model.iconUrl;
  if (src) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <img
          src={src}
          alt=""
          className={isMegsy ? "h-full w-full object-cover" : "h-full w-full object-contain"}
        />
      </div>
    );
  }
  if (hasBrandIcon(model.name, model.provider)) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <BrandIcon name={model.name} provider={model.provider} variant="color" size={24} />
      </div>
    );
  }
  const letter = (model.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-foreground/70">
      {letter}
    </div>
  );
}

/** Speed / quality / cost summary — used only when no human description exists. */
function describeModel(
  model: { credits?: number; isPremium?: boolean },
  kind: "image" | "video",
): string {
  const cost = Number(model.credits || 0);
  const speed = cost <= 1 ? "Fastest" : cost <= 4 ? "Fast" : "Slower";
  const quality = model.isPremium || cost > 4 ? "best quality" : "good quality";
  void kind;
  return `${speed} ${quality}`;
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

export default function MediaModelPickerSheet({
  open,
  onOpenChange,
  mode,
  selectedSlug,
  onSelect,
}: Props) {
  const { models, loading, error, reload } = useDynamicModels();
  const { plan } = useUserPlan();
  const paid = isPaidUser(plan);
  const lang = useUserLang();
  const isAr = lang.startsWith("ar");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const target = mode === "video" ? ["video", "video-i2v"] : ["image"];
    const scoped = models.filter((m) => target.includes(m.type as string));
    const sorted = (mode === "video" ? filterVideoModels(scoped) : filterImageModels(scoped)).sort(
      (a, b) => {
        const fa = a.isFeatured ? 1 : 0;
        const fb = b.isFeatured ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return (a.credits || 0) - (b.credits || 0);
      },
    );
    // Keep only the top 5 video models for a clean list.
    return mode === "video" ? sorted.slice(0, 5) : sorted;
  }, [models, mode]);

  const title = isAr ? "اختر نموذجًا" : "Choose a model";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="z-[100] max-h-[82dvh] rounded-t-[30px] border border-border/60 bg-background p-0 shadow-[0_-24px_80px_-28px_rgba(0,0,0,.7)] [&>button.absolute]:hidden"
      >
        <SheetHeader className="border-b border-border/60 px-5 pb-3 pt-4">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-foreground/15" />
          <div className="flex items-center justify-between gap-3">
            <div className="text-left">
              <SheetTitle className="text-[17px] font-semibold tracking-tight text-foreground">{title}</SheetTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isAr ? "اختار النموذج المناسب لطلبك" : mode === "video" ? "Choose a model for motion" : "Choose a model for your image"}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {filtered.length} {isAr ? "نماذج" : "models"}
            </span>
          </div>
        </SheetHeader>
        <ScrollArea className="max-h-[calc(82dvh-92px)]">
          <div className="space-y-2 px-4 pb-6 pt-4" dir="ltr">
            {loading && (
              <div className="rounded-2xl border border-border/60 bg-card p-5 text-center text-sm text-muted-foreground">Loading models…</div>
            )}
            {error && !loading && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-left">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="min-w-0 flex-1 text-xs leading-relaxed text-foreground/75">{error}</span>
                <button type="button" onClick={reload} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow-sm">
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No models available right now
              </div>
            )}
            {filtered.map((m) => {
              const active = m.slug === selectedSlug;
              const modelIsFree =
                mode === "video"
                  ? isUnlimitedMediaModel(m)
                  : isFreeModel(m.slug || m.id) || (paid && isUnlimitedImageModel(m));
              const locked = !modelIsFree && !paid;
              const showPro = !!m.isPremium || locked;
              const description = shortDescription((m.description || describeModel(m, mode === "video" ? "video" : "image")).replace(/\s*Free\s*/gi, " "));

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      promptUpgrade(m.name);
                      onOpenChange(false);
                      navigate("/pricing");
                      return;
                    }
                    onSelect({
                      slug: m.slug || m.id,
                      name: m.name,
                      provider: m.provider,
                      credits: m.credits,
                      thumbnail: m.thumbnailUrl || m.iconUrl,
                      type: mode === "video" ? "video" : "image",
                      isPremium: !!m.isPremium,
                    });
                    toast.success(`Selected: ${m.name}`);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.035] active:scale-[0.99] ${active ? "border-primary/50 bg-primary/[0.07] shadow-sm" : "border-border/70 bg-card"}`}
                >
                  {/* Selection checkmark */}
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-foreground/[0.06]"}`}>
                    {active ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.8} />
                    ) : null}
                  </div>

                  {/* Name + description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-foreground">
                      {m.name.replace(/\s*Free\s*/gi, " ").trim()}
                    </span>
                      {showPro && (
                        <MegsyStar
                          className="h-3 w-3 shrink-0 text-[var(--megsy-blue)]"
                          aria-hidden
                        />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11.5px] leading-tight text-muted-foreground">
                      {description}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/80">
                      <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5">{m.provider}</span>
                      <span>{m.credits ? `${m.credits} MC` : "Free"}</span>
                    </div>
                  </div>

                  {/* Model icon */}
                  <ModelIcon model={m} />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
