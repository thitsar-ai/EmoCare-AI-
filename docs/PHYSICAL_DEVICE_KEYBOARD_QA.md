# Physical-device keyboard QA checklist (TestFlight)

**Status after this build:** Ready for physical-device QA: **YES** · Ready for release: **NO**

Use this checklist on a **physical iPhone and iPad**. Do not approve release until every row is executed and recorded.

## Build

| Field | Value |
|--------|--------|
| Version | 1.1.10 |
| Build number | **52** |
| EAS build | https://expo.dev/accounts/thitsarsnow/projects/emocare-ai/builds/ef1c3025-e1b5-4262-a2c0-5d60e5076fa4 |
| EAS submission | https://expo.dev/accounts/thitsarsnow/projects/emocare-ai/submissions/ef33e7cd-ae94-4291-8335-2df5148d2675 |
| Scope | Phase 2 + keyboard-safe-area fixes for Talk / Mira / Journal / My Day / Check-In notes + other text inputs |

## Screens (required)

For each screen: keyboard open (1 line) · keyboard open (multiline) · dismissed. On iPad also: full-width keyboard · floating keyboard. Include English and Myanmar multiline on Talk + Journal + Check-In notes.

| Screen | Pass criteria (record Y/N) |
|--------|----------------------------|
| **Talk to Emo** | Composer flush above keyboard; typed text + cursor + Send visible; latest message visible; list scrollable; no blank band; restores after dismiss; tab bar hidden while typing |
| **Ask Mira** | Same composer behavior; mode selector usable; privacy/source label not covered; no double bottom padding; restores after dismiss |
| **Journal** | Active line above keyboard; cursor visible top/mid/bottom of long entry; Save reachable; no white panel behind keyboard; restores after dismiss; tab bar hidden while typing |
| **My Day** | Intention scrolls into view; active field visible; Save/Done reachable; no excessive jump; scroll restores after dismiss; tab bar hidden while typing |
| **Check-In notes** | Note field above keyboard; nav does not overlap; tab bar hidden while typing; restores cleanly after dismiss |

## Other text inputs (spot-check)

| Surface | Pass |
|---------|------|
| Profile name sheet | Field clears keyboard; dismiss restores |
| Onboarding name / Tell Me About You | Field visible above keyboard |
| Add Helped / Helped activity sheets | Inputs not covered |

## Failure modes (any = fail)

- Composer floating too high  
- Keyboard height stacked with safe-area (double pad)  
- Stale inset after dismiss  
- Content hidden behind composer / keyboard  
- Excessive blank band  
- Tab bar under keyboard while typing  
- Cursor hidden in multiline fields  

## Sign-off

| Device | OS | Tester | Date | Result |
|--------|-----|--------|------|--------|
| iPhone | | | | Pass / Fail |
| iPad | | | | Pass / Fail |

Release readiness remains **NO** until this checklist is fully executed and recorded as Pass on required devices.
