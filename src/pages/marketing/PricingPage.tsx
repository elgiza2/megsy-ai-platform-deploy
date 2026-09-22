/**
 * @doc Pricing — deliberately plain.
 *
 * The previous version was a cinematic marketing page: hero video, per-letter
 * text animations, count-up numbers, long feature lists and a wall of copy.
 * People come here to compare two prices, so this page shows exactly that —
 * a short headline, a billing switch, two cards with five lines each, and a
 * small FAQ. All checkout behaviour uses Kashier
 * billing, the one-time trial) is unchanged.
 */
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Check, Loader2, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/supabaseFunction";
import SEOHead from "@/components/common/SEOHead";
import { Helmet } from "react-helmet-async";
import { usePrefetchOnIdle } from "@/hooks/usePrefetchOnIdle";
import AppSidebar from "@/components/layout/AppSidebar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import type { Gateway } from "@/components/billing/PaymentGatewaySheet";

import {
  PLANS as RAW_PLANS,
  FAQS as RAW_FAQS,
  PLAN_HIGHLIGHTS,
  getDisplayPrice,
  type PlanTier,
} from "@/data/pricingData";
import {
  markCheckoutOpened,
  hasAbandonedCheckout,
  TRIAL_PRICE,
  TRIAL_DAYS,
} from "@/lib/pricingOffers";
import { useBillingCatalog, priceFor, trialAvailable } from "@/lib/billingCatalog";
import { brandText, getZoneBrand } from "@/lib/zoneBrand";
import { isEgMode } from "@/lib/egMode";
import { openCheckoutUrl } from "@/lib/openCheckout";
import { isArabBilling, isArabRegion } from "@/lib/payRegion";
import { useUserLang } from "@/lib/authI18n";
import { useIntroTrialEligible, markIntroTrialUsed } from "@/lib/introTrial";
import { trackTikTokFunnelEvent } from "@/lib/analytics/tiktokPixel";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";

const LandingFooter = lazy(() => import("@/components/landing/LandingFooter"));
const PaymentGatewaySheet = lazy(() => import("@/components/billing/PaymentGatewaySheet"));

/** Only the four questions people actually ask before paying. */
const FAQ_LIMIT = 4;
const HERO_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260619_191346_9d19d66e-86a4-47f7-8dc6-712c1788c3b2.mp4";

const PricingPage = () => {
  const navigate = useNavigate();
  usePrefetchOnIdle(["/auth", "/chat"], 1500);

  // TikTok funnel: viewing the plans is the ViewContent step.
  useEffect(() => {
    trackTikTokFunnelEvent("ViewContent", {
      contentId: "pricing",
      contentName: "Pricing plans",
    });
  }, []);

  const [isYearly, setIsYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [gatewaySheet, setGatewaySheet] = useState<{
    tier: PlanTier;
    interval: "monthly" | "yearly";
    trial: boolean;
  } | null>(null);
  const [gatewayLoading, setGatewayLoading] = useState<Gateway | null>(null);
  const {
    plan: activePlan,
    isPaid: hasActiveSubscription,
    loading: subscriptionLoading,
  } = useUserPlan();

  const BRAND = getZoneBrand();
  const lang = useUserLang();
  const isAr = typeof lang === "string" && lang.toLowerCase().startsWith("ar");
  // Prices, credits and product ids all come from the billing catalog, so the
  // number on screen is the number the payment page charges.
  const { entries: catalog } = useBillingCatalog();
  const [winbackOffer, setWinbackOffer] = useState(false);
  // The $7 / 7-day unlimited-video offer runs through Kashier. Eligibility
  // is account/catalog based; geo only selects the default gateway for regular
  // subscriptions and must not hide a valid trial.
  const [arabRegion, setArabRegion] = useState(() => isArabRegion());
  useEffect(() => {
    setWinbackOffer(hasAbandonedCheckout());
    setArabRegion(isArabRegion());
    const onGeoCountry = () => setArabRegion(isArabRegion());
    window.addEventListener("megsy:geo-country", onGeoCountry);
    return () => window.removeEventListener("megsy:geo-country", onGeoCountry);
  }, []);
  const introTrialEligible = useIntroTrialEligible();
  const trialEligible = introTrialEligible && trialAvailable(catalog);
  const [sidebarCollapsed] = useSidebarCollapsed();
  const PLANS = brandText(RAW_PLANS);
  const FAQS = brandText(RAW_FAQS).slice(0, FAQ_LIMIT);

  const showVodafoneCash = isAr || isEgMode() || isArabBilling() || arabRegion;

  const t = isAr
    ? {
        title: "خطة واحدة بسيطة، وكل حاجة جواها",
        sub: "شات وصور وفيديو وكمبيوتر سحابي — اشتراك واحد، تقدر تلغيه في أي وقت.",
        monthly: "شهري",
        yearly: "سنوي",
        yearlyHint: "٤ شهور مجانًا",
        cta: "ابدأ الآن",
        firstMonth: "السعر الأساسي بعد العرض",
        perMonth: "/ شهر",
        perYear: "/ سنة",
        popular: "الأكثر اختيارًا",
        trial: `فيديوهات بلا حدود لمدة ${TRIAL_DAYS} أيام بـ ${TRIAL_PRICE}$`,
        checkoutNote: "المبلغ النهائي والعملة بيظهروا بوضوح في صفحة الدفع قبل التأكيد.",
        faq: "أسئلة شائعة",
        subscribed: "أنت بالفعل مشترك",
        upgrade: "ترقية الخطة",
        cancel: "إلغاء الاشتراك",
      }
    : {
        title: "Simple plans. Everything included.",
        sub: "Chat, images, video and a cloud computer — one subscription, cancel anytime.",
        monthly: "Monthly",
        yearly: "Yearly",
        yearlyHint: "4 months free",
        cta: "Get started",
        firstMonth: "Standard price after intro",
        perMonth: "/ month",
        perYear: "/ year",
        popular: "Most popular",
        trial: `Unlimited videos for ${TRIAL_DAYS} days — $${TRIAL_PRICE}`,
        checkoutNote:
          "The final local-currency amount is shown by the payment provider before you confirm.",
        faq: "Questions",
        subscribed: "You are already subscribed",
        upgrade: "Upgrade plan",
        cancel: "Cancel subscription",
      };

  const pricingLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${BRAND} AI`,
    description:
      "All-in-one AI workspace — chat, image, video, slides, docs and full-stack builds on one subscription.",
    brand: { "@type": "Brand", name: `${BRAND} AI` },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...PLANS.map((p) => p.monthlyPrice)).toString(),
      highPrice: Math.max(...PLANS.map((p) => p.monthlyPrice)).toString(),
      offerCount: PLANS.length,
      offers: PLANS.map((p) => ({
        "@type": "Offer",
        name: p.name,
        priceCurrency: "USD",
        price: p.monthlyPrice.toString(),
        url: "https://megsyai.com/pricing",
        category: "SubscriptionMonthly",
      })),
    },
  };

  const handleSubscribe = async (
    tier: PlanTier,
    opts: { trial?: boolean; interval?: "monthly" | "yearly" } = {},
  ) => {
    if (loadingTier) return;
    const interval: "monthly" | "yearly" = opts.interval ?? (isYearly ? "yearly" : "monthly");

    // TikTok funnel: the intent to pay, before the gateway takes over.
    trackTikTokFunnelEvent("InitiateCheckout", {
      contentId: `${tier}:${interval}`,
      contentName: `${tier} ${interval}`,
      currency: "USD",
    });

    let {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session;
    }
    if (!session?.access_token) {
      await supabase.auth.signOut().catch(() => {});
      toast.error("Please sign in again to continue.");
      navigate("/auth?redirect=/pricing");
      return;
    }

    // All visitors use Kashier. The picker only chooses the Kashier method
    // (bank card or mobile wallet); no regional fallback can select another provider.
    if (opts.trial === true) {
      await runCheckout("local", { tier, interval, trial: true });
      return;
    }

    setGatewaySheet({ tier, interval, trial: false });
  };

  const runCheckout = async (
    gateway: Gateway,
    ctx?: { tier: PlanTier; interval: "monthly" | "yearly"; trial: boolean },
  ) => {
    const target = ctx ?? gatewaySheet;
    if (!target) return;
    const { tier, interval, trial } = target;
    setGatewayLoading(gateway);
    setLoadingTier(tier);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in again to continue.");
        navigate("/auth?redirect=/pricing");
        return;
      }

      // Kashier is the only payment provider supported by the site.
      const provider = "kashier";
      const method = gateway === "wallets" ? "wallet" : "card";
      const winback = hasAbandonedCheckout();

      // One payload for both providers: the server picks the catalog row and
      // therefore the price, credits and product id.
      const { data, error } = await invokeFunction("kashier-checkout", {
        body: {
          kind: "checkout",
          provider,
          tier,
          interval,
          trial,
          free_trial: trial,
          winback,
          method,
          display: isEgMode() || isArabBilling() || arabRegion ? "ar" : "en",
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        const msg =
          error instanceof Error
            ? error.message.toLowerCase()
            : String((error as { message?: unknown })?.message ?? "").toLowerCase();
        if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("jwt")) {
          await supabase.auth.signOut().catch(() => {});
          toast.error("Your session expired. Please sign in again.");
          navigate("/auth?redirect=/pricing");
          return;
        }
        throw error;
      }
      const checkoutUrl = data?.url || data?.checkout_url;
      if (checkoutUrl) {
        markCheckoutOpened(interval);
        if (trial) markIntroTrialUsed();
        openCheckoutUrl(checkoutUrl);
      } else throw new Error(data?.error || "Checkout failed");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to open checkout. Please try again.";
      toast.error(message);
    } finally {
      setGatewayLoading(null);
      setLoadingTier(null);
      setGatewaySheet(null);
    }
  };

  // Arriving from onboarding opens the 7-day video offer checkout once.
  const trialAutoStarted = useRef(false);
  useEffect(() => {
    if (trialAutoStarted.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("offer") !== "free_trial") return;
    trialAutoStarted.current = true;
    void handleSubscribe("pro", { trial: true, interval: "monthly" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gatewaySheetNode = (
    <Suspense fallback={null}>
      {gatewaySheet && (
        <PaymentGatewaySheet
          open={!!gatewaySheet}
          onClose={() => setGatewaySheet(null)}
          onSelect={runCheckout}
          loading={gatewayLoading}
          options={showVodafoneCash ? ["local", "wallets"] : ["local"]}
        />
      )}
    </Suspense>
  );

  return (
    <>
      <SEOHead
        title={`Pricing — ${BRAND} AI Plans & Credits`}
        description={`Simple plans for ${BRAND} AI. Chat, images, video, slides and full-stack builds on one subscription.`}
        path="/pricing"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pricingLd)}</script>
      </Helmet>
      <div data-pricing-scope className="flex min-h-[100dvh] w-full overflow-x-hidden bg-[#050505] text-white rtl:flex-row-reverse">
        <aside
          data-chat-sidebar="true"
          style={{ width: !sidebarCollapsed ? 280 : 60 }}
          className="hidden shrink-0 overflow-hidden border-e border-white/[0.08] transition-[width] duration-200 ease-out md:flex"
        >
          <AppSidebar inline open forceExpanded={false} onClose={() => {}} onNewChat={() => navigate("/")} onSelectConversation={() => {}} currentMode="chat" />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div dir={isAr ? "rtl" : "ltr"} className="relative overflow-hidden bg-[#050505]" style={{ fontFamily: "Geist, -apple-system, BlinkMacSystemFont, sans-serif" }}>
            <style>{`
              [data-pricing-scope] .pricing-glass { background: linear-gradient(160deg, rgba(220,60,70,.34), rgba(50,8,12,.66)); backdrop-filter: blur(24px) saturate(150%); box-shadow: 0 24px 70px -34px rgba(220,60,70,.55); }
              [data-pricing-scope] .pricing-glass:hover { transform: translateY(-6px); box-shadow: 0 34px 90px -35px rgba(220,60,70,.7); }
              [data-pricing-scope] .soft-glass { background: rgba(255,255,255,.045); backdrop-filter: blur(18px); border: 1px solid rgba(255,255,255,.10); }
              [data-pricing-scope] .font-garamond { font-family: Garamond, 'Times New Roman', serif; }
              html[data-theme="light"] [data-pricing-scope] { background: hsl(var(--background)); color: hsl(var(--foreground)); }
              html[data-theme="light"] [data-pricing-scope] .pricing-glass { background: hsl(var(--card)); color: hsl(var(--foreground)); box-shadow: 0 18px 55px -32px rgba(0,0,0,.25); }
              html[data-theme="light"] [data-pricing-scope] .pricing-glass *, html[data-theme="light"] [data-pricing-scope] .soft-glass * { color: hsl(var(--foreground)) !important; }
              html[data-theme="light"] [data-pricing-scope] .soft-glass { background: hsl(var(--card)); border-color: hsl(var(--border)); }
            `}</style>

            <section className="relative isolate flex min-h-[560px] flex-col overflow-hidden sm:min-h-[610px]">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(180,40,50,.58),rgba(55,8,14,.78)_48%,#050505_100%)]" />
              <video autoPlay muted loop playsInline preload="none" className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen" src={HERO_VIDEO} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_0%,rgba(0,0,0,.35)_55%,#050505_100%)]" />
              <nav className="relative z-10 flex items-center justify-center gap-8 px-6 pt-8 text-[12px] uppercase tracking-[.18em] text-white/60">
                <a href="#plans-grid" className="transition hover:text-white">Plans</a>
                <a href="#pricing-faq" className="transition hover:text-white">FAQ</a>
                <a href="mailto:support@megsyai.com" className="transition hover:text-white">Support</a>
              </nav>
              <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-14 pt-16 text-center">
                <p className="mb-5 text-[11px] uppercase tracking-[.35em] text-white/55">Megsy AI workspace</p>
                <h1 className="font-garamond text-5xl font-normal leading-[.96] tracking-tight text-white sm:text-7xl md:text-8xl">
                  <span className="block">CHOOSE YOUR</span>
                  <span className="block text-[#ff747c]">CREATIVE EDGE</span>
                </h1>
                <p className="mt-7 max-w-xl text-sm font-light leading-relaxed text-white/70 sm:text-base">
                  Simple plans for the entire {BRAND} ecosystem, built for creators, teams and ambitious ideas.
                </p>
                <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-5 py-2.5 text-xs text-white/75 backdrop-blur-xl">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ff747c]" />
                  {trialEligible ? t.trial : "One subscription. Every creative tool."}
                </div>
              </div>
            </section>

            <section id="plans-grid" className="relative -mt-8 z-20 mx-auto grid max-w-5xl gap-5 px-5 pb-20 sm:px-8 md:grid-cols-2">
              <div className="soft-glass col-span-full mx-auto mb-2 flex items-center gap-1 rounded-full p-1 text-xs text-white/70">
                {([false, true] as const).map((yearly) => (
                  <button key={String(yearly)} type="button" onClick={() => setIsYearly(yearly)} aria-pressed={isYearly === yearly} className={cn("rounded-full px-5 py-2 transition", isYearly === yearly ? "bg-white text-black" : "hover:bg-white/10")}>
                    {yearly ? t.yearly : t.monthly}
                  </button>
                ))}
                {isYearly && <span className="px-3 text-[#ff9aa0]">{t.yearlyHint}</span>}
              </div>

              {PLANS.map((plan) => {
                const fallbackPrice = getDisplayPrice(plan, isYearly);
                const catalogEntry = priceFor(catalog, plan.tier === "elite" ? "elite" : "pro", isYearly ? "yearly" : "monthly", { winback: winbackOffer });
                const price = catalogEntry ? { ...fallbackPrice, price: catalogEntry.usd } : fallbackPrice;
                const highlights = PLAN_HIGHLIGHTS[plan.tier === "pro" ? "pro" : "max"];
                const busy = loadingTier === plan.tier;
                const featured = plan.tier === "pro";
                const isCurrentPlan = hasActiveSubscription && activePlan === plan.tier;
                return (
                  <article key={plan.tier} className={cn("pricing-glass relative flex flex-col rounded-[28px] p-7 transition duration-500", featured ? "md:-translate-y-4" : "bg-black/30")}>
                    {featured && <span className="absolute -top-3 start-7 rounded-full bg-[#ff747c] px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-black">{t.popular}</span>}
                    <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] uppercase tracking-[.22em] text-white/55">Megsy plan</p><h2 className="mt-2 text-2xl font-medium">{plan.name}</h2></div><span className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/70">{plan.monthlyCredits}</span></div>
                    <div className="mt-8 flex items-end gap-2"><span className="text-5xl font-light tracking-tight">${price.price}</span><span className="pb-1 text-sm text-white/55">{isYearly ? t.perYear : t.perMonth}</span></div>
                    <p className="mt-3 text-xs leading-relaxed text-white/60">{t.checkoutNote}</p>
                    <p className="mt-2 text-xs text-white/65">{price.isIntro ? `${t.firstMonth} · $${plan.monthlyPrice} ${t.perMonth}` : price.discountLabel || plan.monthlyCredits}</p>
                    {featured && trialEligible && !isYearly && <div className="mt-5 rounded-2xl border border-[#ff747c]/30 bg-[#ff747c]/10 px-4 py-3 text-center text-sm text-[#ffb4b8]">{t.trial}<p className="mt-1 text-[11px] text-white/55">{isAr ? "متاح مرة واحدة للحسابات المؤهلة." : "Available once for eligible accounts."}</p></div>}
                    <ul className="mt-7 flex-1 space-y-3">{highlights.map((line) => <li key={line} className="flex gap-3 text-sm leading-snug text-white/85"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ff9aa0]" /><span>{line}</span></li>)}</ul>
                    {isCurrentPlan ? <div className="mt-7 space-y-2"><div className="flex h-12 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-sm text-emerald-200">{subscriptionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.subscribed}</div><button type="button" onClick={() => navigate("/billing")} className="h-9 w-full text-xs text-white/60 hover:text-white">{t.cancel}</button></div> : <button type="button" disabled={busy} onClick={() => void handleSubscribe(plan.tier)} className={cn("mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition", hasActiveSubscription ? "border border-[#ff747c]/50 bg-transparent" : featured ? "bg-[#ff747c] text-black hover:bg-[#ff9aa0]" : "border border-white/20 bg-white/10 hover:bg-white/20", "disabled:opacity-60")}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{hasActiveSubscription ? t.upgrade : t.cta}</button>}
                    {featured && trialEligible && !isYearly && <button type="button" onClick={() => void handleSubscribe("pro", { trial: true, interval: "monthly" })} className="mt-3 text-xs text-white/60 underline-offset-4 hover:text-white hover:underline">{t.trial}</button>}
                  </article>
                );
              })}
            </section>

            <section id="pricing-faq" className="mx-auto max-w-4xl px-5 pb-24 sm:px-8">
              <h2 className="font-garamond text-4xl text-[#ff9aa0]">{t.faq}</h2>
              <div className="mt-6 space-y-3">{FAQS.map((f) => <details key={f.q} className="soft-glass group rounded-2xl px-5 py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium"><span>{f.q}</span><ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-relaxed text-white/60">{f.a}</p></details>)}</div>
            </section>
            <Suspense fallback={null}><LandingFooter /></Suspense>
          </div>
        </main>
      </div>
      {gatewaySheetNode}
    </>
  );
};

export default PricingPage;
