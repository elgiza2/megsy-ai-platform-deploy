import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUserLang } from "@/lib/authI18n";

const SESSION_KEY = "megsy_offers_carousel_seen_v2";
const AUTOPLAY_MS = 4200;

type Offer = {
  id: string;
  image: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
};

const OFFERS: Offer[] = [
  {
    id: "gpt_25",
    image: "/offer-gpt.png",
    title: "GPT 2.5 Unlimited",
    titleAr: "GPT 2.5 بلا حدود",
    body: "Use our flagship model without limits for a full month.",
    bodyAr: "استخدم أقوى نماذجنا بلا حدود لمدة شهر كامل.",
  },
  {
    id: "computer",
    image: "/offer-computer.png",
    title: "Megsy Computer",
    titleAr: "ميغسي كومبيوتر",
    body: "Let Megsy browse, click, research and get work done for you.",
    bodyAr: "خلّي ميغسي يتصفح ويبحث وينفذ المهام بدلًا منك.",
  },
  {
    id: "agent",
    image: "/offer-agent.png",
    title: "Megsy Agent",
    titleAr: "وكيل ميغسي",
    body: "Turn complex goals into finished work with an autonomous AI agent.",
    bodyAr: "حوّل المهام المعقدة إلى شغل مكتمل مع وكيل ذكاء اصطناعي مستقل.",
  },
  {
    id: "seedance_25",
    image: "/seedance-2-5.jpeg",
    title: "Seedance 2.5 Unlimited",
    titleAr: "Seedance 2.5 بلا حدود",
    body: "Create videos freely for 7 full days for only $7.",
    bodyAr: "أنشئ فيديوهاتك بحرية لمدة 7 أيام كاملة بـ7$ فقط.",
  },
];

export default function SeedanceOfferDialog() {
  const location = useLocation();
  const navigate = useNavigate();
  const lang = useUserLang();
  const isArabic = lang === "ar-eg";
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const isEntryRoute = location.pathname === "/" || location.pathname === "/chat" || location.pathname === "/index";
    if (!isEntryRoute) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % OFFERS.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [open]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Session storage may be unavailable in private browsing.
    }
    setOpen(false);
  };

  const tryNow = () => {
    const offer = OFFERS[activeIndex];
    dismiss();
    navigate(offer.id === "computer" || offer.id === "agent" ? "/chat" : `/pricing?offer=${offer.id}`);
  };

  const move = (direction: 1 | -1) => {
    setActiveIndex((index) => (index + direction + OFFERS.length) % OFFERS.length);
  };

  const current = OFFERS[activeIndex];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : dismiss())}>
      <DialogContent
        dir={isArabic ? "rtl" : "ltr"}
        className="w-[calc(100%-1.5rem)] max-w-[520px] overflow-hidden rounded-[30px] border-0 bg-[#f6f4f1] p-0 text-[#111111] shadow-2xl"
      >
        <div className="px-5 pb-7 pt-4 sm:px-7 sm:pb-8 sm:pt-5">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/30" />
          <div
            className="relative overflow-hidden rounded-[24px] bg-[#1c1c1c] shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
            onPointerDown={(event) => {
              touchStartX.current = event.clientX;
            }}
            onPointerUp={(event) => {
              if (touchStartX.current === null) return;
              const delta = event.clientX - touchStartX.current;
              if (Math.abs(delta) > 42) move(delta > 0 ? -1 : 1);
              touchStartX.current = null;
            }}
          >
            <img
              key={current.image}
              src={current.image}
              alt={isArabic ? current.titleAr : current.title}
              className="h-[210px] w-full object-cover transition-opacity duration-300 sm:h-[250px]"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
            <button
              type="button"
              aria-label={isArabic ? "العرض السابق" : "Previous offer"}
              onClick={() => move(-1)}
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-xl text-white backdrop-blur transition hover:bg-black/60"
            >
              {isArabic ? "›" : "‹"}
            </button>
            <button
              type="button"
              aria-label={isArabic ? "العرض التالي" : "Next offer"}
              onClick={() => move(1)}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-xl text-white backdrop-blur transition hover:bg-black/60"
            >
              {isArabic ? "‹" : "›"}
            </button>
          </div>

          <div className="mt-4 flex justify-center gap-1.5" aria-label={isArabic ? "العروض" : "Offers"}>
            {OFFERS.map((offer, index) => (
              <button
                key={offer.id}
                type="button"
                aria-label={`${isArabic ? "اذهب إلى" : "Go to"} ${isArabic ? offer.titleAr : offer.title}`}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex ? "w-7 bg-black" : "w-1.5 bg-black/20"}`}
              />
            ))}
          </div>

          <div className={`mt-5 space-y-2 ${isArabic ? "text-right" : "text-left"}`}>
            <DialogTitle className="text-[25px] font-bold tracking-tight sm:text-[29px]">
              {isArabic ? current.titleAr : current.title}
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-7 text-black/60 sm:text-base">
              {isArabic ? current.bodyAr : current.body}
            </DialogDescription>
          </div>

          <button
            type="button"
            onClick={tryNow}
            className="mt-6 h-12 w-full rounded-full bg-gradient-to-r from-[#f10b78] via-[#f32845] to-[#ff6b21] text-base font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            {isArabic ? "جرّب الآن" : "Try now"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full text-sm font-medium text-black/45 transition hover:text-black/75"
          >
            {isArabic ? "لاحقًا" : "Maybe later"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
