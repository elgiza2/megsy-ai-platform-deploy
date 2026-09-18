import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUserLang } from "@/lib/authI18n";

const SESSION_KEY = "megsy_seedance_offer_seen_v1";

export default function SeedanceOfferDialog() {
  const location = useLocation();
  const navigate = useNavigate();
  const lang = useUserLang();
  const isArabic = lang === "ar-eg";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isEntryRoute = location.pathname === "/" || location.pathname === "/chat" || location.pathname === "/index";
    if (!isEntryRoute) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [location.pathname]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Session storage may be unavailable in private browsing.
    }
    setOpen(false);
  };

  const tryNow = () => {
    dismiss();
    navigate("/pricing?offer=seedance_7day");
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : dismiss())}>
      <DialogContent
        dir={isArabic ? "rtl" : "ltr"}
        className="w-[calc(100%-2rem)] max-w-[460px] overflow-hidden rounded-[28px] border border-white/10 bg-[#111111] p-0 text-white shadow-2xl"
      >
        <div className="relative">
          <img
            src={isArabic ? "/seedance-2-5-ar.png" : "/seedance-2-5.jpeg"}
            alt={isArabic ? "سيدانس 2.5" : "Seedance 2.5"}
            className="h-[190px] w-full object-cover sm:h-[220px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-black/10" />
          <div className={`${isArabic ? "left-4" : "right-4"} absolute top-4 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur`}>
            {isArabic ? "عرض محدود" : "Limited offer"}
          </div>
        </div>
        <div className="space-y-5 px-6 pb-6 pt-1 sm:px-8 sm:pb-8">
          <div className={`space-y-2 ${isArabic ? "text-right" : "text-left"}`}>
            <DialogTitle className="text-2xl font-semibold tracking-tight sm:text-[28px]">
              {isArabic ? "Seedance 2.5 بلا حدود" : "Unlimited Seedance 2.5"}
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-7 text-white/65">
              {isArabic ? (
                <>أنشئ فيديوهاتك بحرية لمدة 7 أيام كاملة، بسعر خاص قدره <span className="font-semibold text-white">7$ فقط</span>.</>
              ) : (
                <>Create freely for 7 full days at a special price of <span className="font-semibold text-white">$7 only</span>.</>
              )}
            </DialogDescription>
          </div>
          <div className={`flex flex-col gap-3 sm:flex-row${isArabic ? "-reverse" : ""}`}>
            <button
              type="button"
              onClick={tryNow}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isArabic ? "جرّب الآن" : "Try now"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isArabic ? "لاحقًا" : "Later"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
