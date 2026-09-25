# Megsy AI Platform — Handoff for the Next Agent

Repository: `https://github.com/elgiza2/megsy-ai-platform-deploy`

## Completed in this pass

Commit: `581886a` (`Fix computer viewport, intro dismissal, and response language`)

1. **Computer viewport starts collapsed**
   - `src/components/chat/ComputerRunViewport.tsx`
   - The live computer screen is no longer rendered as a large 44-height panel while closed.
   - Only the compact header is visible until the user explicitly expands it.

2. **First-visit intro dismissal**
   - `src/pages/chat/components/MegsyOsIntroBody.tsx`
   - All dismiss/close buttons now share `closeIntro()`.
   - Dismissal persists `megsy_os_intro_seen` and blurs the active element, removing the lingering focus outline around the Try/Start button.

3. **Computer final answer language**
   - `src/lib/manus/agentCore.ts`
   - The upstream computer task prompt now explicitly requires the final report in the user's original language.
   - Arabic prompts explicitly request Arabic/Egyptian Arabic when natural.

4. **Verification**
   - `npm install --no-audit --no-fund` completed.
   - `npm run build` completed successfully.

## Remaining requested work to investigate

The following user-reported items still need a full UI/runtime pass:

- Default website language must always be English; do not auto-detect browser/device/country language. Keep explicit user language choices intact.
- Sidebar content is clipped on non-chat pages; inspect the app shell/sidebar height, overflow, and route layout wrappers.
- Logout button is unreliable; trace the actual auth `signOut()` promise, loading state, error handling, and redirect.
- File attachments must open a clean, real preview on a dedicated page/route, never inside the chat. Verify PDF, image, text, office, and unknown-file fallbacks.
- Image generation compatibility error (“this compatibility point only supports listed image models”) needs a model-policy/request-payload fix. Confirm selected image model is passed to the supported backend route and test at least one normal image generation path.
- Slides should use the Plus AI integration correctly. Inspect `src/pages/chat/services/runSlidesTurn.ts`, provider/server functions, and `StandardSlidesCard`; generated slides should have distinct layouts/content rather than a repeated static image/text template. Test the actual Plus AI response, not only the fallback renderer.
- Chips activation bar: the active-service/header bar should appear after a chip is activated, not before activation. Check `ChatComposerSection`, `ComposerServicePanel`, and `starterChipsVisible` transitions.
- Computer waiting/thinking badges must render above the computer panel in the chat, never below it. Check `ChatMessagesArea`, `ChatMessageItem`, `RemoteAiBusyBanner`, and the computer live-view dock.
- Image generation layout currently can show square → text → square. Reduce it to text/assistant explanation followed by exactly one result/skeleton card. Inspect `ChatMessageItem`, `AssistantMediaBlock`, `MediaGenerationSkeleton`, and `MediaResultCard` together and test initial, running, done, and error states.
- Change the chat center greeting text and its font; locate `DesktopGreeting`/chat landing copy and replace with the desired product copy and a deliberate font class.

## Important working rules

- Do not spend credits on repeated media/slides tests. Prefer static/component tests and one end-to-end test per paid generation path.
- Before any paid image/slides generation, inspect the current account/credit state and stop if the remaining balance is low.
- Preserve existing user changes; run `git status` before editing.
- After a coherent batch, commit and push to `main`.
- The generated `package-lock.json` is currently untracked from dependency installation; decide whether the project wants to commit it. It was intentionally not included in commit `581886a`.

## Suggested next-agent prompt

> Continue work in `/home/ubuntu/megsy-ai-platform-deploy` from commit `581886a`. Read `AGENTS.md`, `IMPLEMENTATION_AUDIT.md`, and `live-audit-report.md` first. The previous agent fixed the collapsed computer viewport, intro dismissal/focus outline, and computer final-answer language; build passes. Now address the remaining checklist in `HANDOFF_NEXT_AGENT.md`, prioritizing logout, fixed English default language, sidebar clipping, dedicated file previews, image compatibility/layout, and real Plus AI slides integration. Do not generate paid media/slides assets unless necessary; preserve credits. Run `npm run build`, commit, push to `main`, and report the commit plus any unverified items.
