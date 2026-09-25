import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUserLang } from "@/lib/authI18n";

const SESSION_KEY = "megsy_offers_carousel_seen_v5";
const AUTOPLAY_MS = 4200;

type Offer = {
  id: string;
  image: string;
  imageAr?: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
};

const OFFERS: Offer[] = [
  { id: "gpt_25", image: "/offer-gpt-25.webp", title: "GPT 2.5 Unlimited", titleAr: "GPT 2.5 بلا حدود", body: "Use our flagship model without limits for a full month.", bodyAr: "استخدم أقوى نماذجنا بلا حدود لمدة شهر كامل." },
  { id: "computer", image: "/offer-computer-25.webp", title: "Megsy Computer", titleAr: "ميغسي كومبيوتر", body: "Let Megsy browse, click, research and get work done for you.", bodyAr: "خلّي ميغسي يتصفح ويبحث وينفذ المهام بدلًا منك." },
  { id: "agent", image: "/offer-agent-25.webp", title: "Megsy Agent", titleAr: "وكيل ميغسي", body: "Turn complex goals into finished work with an autonomous AI agent.", bodyAr: "حوّل المهام المعقدة إلى شغل مكتمل مع وكيل ذكاء اصطناعي مستقل." },
  { id: "seedance_25", image: "/offer-seedance-25.webp", title: "Seedance 2.5 Unlimited", titleAr: "Seedance 2.5 بلا حدود", body: "Create videos freely for 7 full days for only $7.", bodyAr: "أنشئ فيديوهاتك بحرية لمدة 7 أيام كاملة بـ7$ فقط." },
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
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % OFFERS.length), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [open]);

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* storage unavailable */ }
    setOpen(false);
  };

  const tryNow = () => {
    const offer = OFFERS[activeIndex];
    dismiss();
    navigate(offer.id === "computer" || offer.id === "agent" ? "/chat" : `/pricing?offer=${offer.id}`);
  };

  const move = (direction: 1 | -1) => setActiveIndex((index) => (index + direction + OFFERS.length) % OFFERS.length);
  const current = OFFERS[activeIndex];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : dismiss())}>
      <DialogContent
        dir={isArabic ? "rtl" : "ltr"}
        className="offers-bottom-sheet fixed bottom-0 left-1/2 top-auto z-50 grid max-h-[90dvh] w-full max-w-[540px] translate-x-[-50%] translate-y-0 gap-0 overflow-y-auto rounded-t-[32px] rounded-b-none border-0 bg-[#f3f1ed] p-0 text-[#121212] shadow-[0_-14px_50px_rgba(0,0,0,0.2)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8 [&>button]:hidden"
      >
        <div
          className="overflow-hidden rounded-t-[32px] bg-[#252525] shadow-[0_12px_30px_rgba(0,0,0,0.16)] touch-pan-y"
          onPointerDown={(event) => { touchStartX.current = event.clientX; }}
          onPointerUp={(event) => {
            if (touchStartX.current === null) return;
            const delta = event.clientX - touchStartX.current;
            if (Math.abs(delta) > 42) move(delta > 0 ? -1 : 1);
            touchStartX.current = null;
          }}
        >
          <img key={current.image} src={current.image} alt={isArabic ? current.titleAr : current.title} className="block h-[205px] w-full object-cover sm:h-[270px]" />
        </div>

        <div className="px-5 pb-8 pt-6 sm:px-9 sm:pb-10">
          <div className="text-center">
            <DialogTitle className="text-[24px] font-bold tracking-tight sm:text-[28px]">{isArabic ? current.titleAr : current.title}</DialogTitle>
            <DialogDescription className="mx-auto mt-2 max-w-[430px] text-[15px] leading-7 text-[#6f6b70] sm:text-base">{isArabic ? current.bodyAr : current.body}</DialogDescription>
          </div>

          <button type="button" onClick={(event) => { event.currentTarget.blur(); tryNow(); }} className="mt-6 h-[54px] w-full rounded-full bg-gradient-to-r from-[#f40b79] via-[#f32948] to-[#ff6b1f] !text-white shadow-[0_8px_20px_rgba(243,34,91,0.18)] transition hover:brightness-105 active:scale-[0.985] focus:outline-none focus-visible:outline-none">
            <span className="!text-white">{isArabic ? "جرّب الآن" : "Try now"}</span>
          </button>
          <button type="button" onClick={dismiss} className="mt-3 w-full text-[15px] font-medium text-[#d0443a] transition hover:text-[#a52e28]">{isArabic ? "لاحقًا" : "Later"}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
