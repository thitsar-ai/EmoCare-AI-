# Keyboard visual verification — TestFlight package

**Status:** Simulator visual verification was **not** completed.  
**Not ready for physical-device QA approval.**  
**Not ready for release.**

This package is for **keyboard verification only**. Do not use it as a Phase 2 / localization / reminders / general release checklist.

---

## Build

| Field | Value |
|--------|--------|
| App | EmoCare (`com.tristarinter.emocare`) |
| Marketing version | **1.1.10** |
| iOS build number | **51** (confirmed by EAS; previous finished store build was **50**) |
| Profile | `production` → App Store Connect / TestFlight |
| ASC App ID | `6779426891` |
| EAS build | https://expo.dev/accounts/thitsarsnow/projects/emocare-ai/builds/5f7fba3a-0461-48ff-8e8f-a0503126332e |
| EAS submission | https://expo.dev/accounts/thitsarsnow/projects/emocare-ai/submissions/b8e8bc40-ef9a-4b1d-bf38-932019f178c5 |
| Scope | Latest sticky keyboard inset strategy (`hooks/useKeyboardBottomInset.ts` + Talk / Mira / Journal / My Day / Check-In notes) |

**Note:** Build **51** was uploaded from the current working tree so the new keyboard inset hook is included. That tree may also contain other unfinished Phase 2 UI wiring — **use this build only for keyboard visual QA**, not as a localization / reminders / release candidate.

---

## Why simulator screenshots were not delivered

1. iPad Pro 13-inch (M5) simulator **boots and can be screenshotted via `simctl`**, but **Simulator has no usable on-screen window** for HID clicks (headless / no Accessibility for System Events).
2. The native **development client** stops on **“Open in EmoCare?”** / developer-menu overlays; those require a tap we cannot automate without `idb` / Maestro / Accessibility.
3. Without interactive focus + typing, **keyboard-open states cannot be captured honestly**.

Do **not** treat any `_probe-*.png` files under `docs/keyboard-qa-screenshots/` as pass evidence.

---

## Devices to use on TestFlight

- **iPad** (required for this pass): full-width software keyboard **and** floating keyboard
- Optionally re-check on iPhone after iPad pass criteria are clear

Languages:

- English
- Myanmar (multiline)

---

## Exact five-screen checklist

For **each** screen below, capture **three** states (software keyboard unless noted):

| # | State | Filename pattern |
|---|--------|------------------|
| A | Keyboard open, **one line** entered | `{screen}-kbd-1line.png` |
| B | Keyboard open, **multiline** entered | `{screen}-kbd-multiline.png` |
| C | Keyboard **dismissed** after typing | `{screen}-kbd-dismissed.png` |

Also capture (can reuse screens if clearly labeled):

- Full-width iPad keyboard (at least Talk + Journal)
- Floating iPad keyboard (at least Talk + Journal)
- Myanmar multiline (at least Talk + Journal + Check-In notes)

### 1. Talk to Emo — `talk-*`

Navigate: Home → Talk to Emo (or Talk tab).

**Pass criteria**

- [ ] Composer sits immediately above the keyboard
- [ ] Composer is not pushed excessively upward
- [ ] Typed text and cursor are fully visible
- [ ] Send button remains visible
- [ ] Latest message remains visible
- [ ] Message list is still scrollable
- [ ] No extra blank band beneath or above the composer
- [ ] Layout returns correctly after dismissal

**Fail if:** composer floating too high; keyboard height added as layout padding instead of reducing available height; double safe-area padding; stale inset after dismiss; content hidden behind composer; excessive blank area.

### 2. Ask Mira — `mira-*`

Navigate: Ask Mira / Mira entry (UI must say Mira, never “Oracle”).

**Pass criteria**

- [ ] Same composer behavior as Talk to Emo
- [ ] Mode selector remains usable
- [ ] Privacy/source label is not covered
- [ ] Typed text and cursor remain visible
- [ ] No double bottom padding
- [ ] No large blank region after keyboard dismissal

### 3. Journal — `journal-*`

Navigate: Journal → new or existing entry; focus editor.

**Pass criteria**

- [ ] Active typing line remains above the keyboard
- [ ] Cursor visible at **top**, **middle**, and **bottom** of a long entry (scroll while keyboard open)
- [ ] Editor height adapts to the visible area
- [ ] Save/footer controls remain reachable
- [ ] No fixed white panel extends behind the keyboard
- [ ] Layout restores correctly after dismissal

### 4. My Day — `myday-*`

Navigate: My Day / Today → edit intention (or other bottom text field under test).

**Pass criteria**

- [ ] Edited intention scrolls into view
- [ ] Active field remains visible
- [ ] Save/Done control remains accessible
- [ ] Screen does not jump excessively
- [ ] Correct scroll position restored after editing / dismiss

### 5. Check-In notes — `checkin-notes-*`

Navigate: Check-In flow → notes field.

**Pass criteria**

- [ ] Note field scrolls fully above the keyboard
- [ ] Bottom navigation does not overlap the field
- [ ] Tab bar is hidden only while appropriate
- [ ] Keyboard dismissal restores the screen cleanly
- [ ] Tab bar does **not** reappear under the keyboard while typing

---

## Expected screenshot set (minimum)

```
talk-kbd-1line.png
talk-kbd-multiline.png
talk-kbd-dismissed.png
talk-kbd-floating.png          # floating iPad keyboard
talk-kbd-myanmar-multiline.png

mira-kbd-1line.png
mira-kbd-multiline.png
mira-kbd-dismissed.png

journal-kbd-1line.png
journal-kbd-multiline.png
journal-kbd-dismissed.png
journal-kbd-floating.png
journal-cursor-top.png
journal-cursor-middle.png
journal-cursor-bottom.png

myday-kbd-1line.png
myday-kbd-multiline.png
myday-kbd-dismissed.png

checkin-notes-kbd-1line.png
checkin-notes-kbd-multiline.png
checkin-notes-kbd-dismissed.png
checkin-notes-myanmar-multiline.png
```

---

## Specific failure modes to watch

1. Composer floating too high  
2. Keyboard height added as layout padding instead of reducing available height  
3. Double safe-area padding  
4. Stale keyboard inset after dismissal  
5. Content hidden behind composer  
6. Excessive blank area  
7. Tab bar reappearing under keyboard  
8. Cursor hidden in multiline fields  

---

## After capture

- Return screenshots + pass/fail per criterion.  
- Until this pack is approved: **do not** resume reminders, localization polish, other Phase 2, or release readiness.  
- Approval of this keyboard visual pack is a **blocker** for physical-device QA approval.
