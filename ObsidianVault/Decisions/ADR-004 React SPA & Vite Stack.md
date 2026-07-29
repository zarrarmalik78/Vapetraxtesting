---
tags:
  - adr
  - decision
  - frontend
---

# ADR-004: React SPA & Vite Stack

## Status
**ACCEPTED**

---

## Context
Retail POS applications demand sub-second UI interactions, instant search filtering, offline caching, and desktop PWA installation.

---

## Decision
Build VapeTrax as a client-side Single Page Application using **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS**.

---

## Consequences
- Fast local development and instant hot-module updates.
- Native PWA support for offline POS checkout.
- Instant tab switching without full browser reloads.

---

## 🔗 Related Graph Links
- **Concept**: [[Single Page Application Architecture]], [[Offline & PWA Support]]
- **Config**: `vite.config.ts`, `tsconfig.json`
