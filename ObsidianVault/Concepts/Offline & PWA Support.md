---
tags:
  - concept
  - pwa
  - offline
---

# Offline & PWA Support

## Overview
VapeTrax Web POS is configured as a **Progressive Web App (PWA)** with offline capabilities. This ensures retail cashiers can continue checkout operations during internet connectivity dropouts without service interruption.

---

## 🛠️ PWA Components

1. **Service Worker**: Caches core static assets (JS bundles, CSS, icons, fonts) for offline rendering.
2. **Offline Detection**: Controlled by [[useConnectivity Hook]], which monitors `navigator.onLine` and window `online`/`offline` events.
3. **UI Indicator**: Renders [[Connectivity Badge Component]] in the navigation bar to signal online/offline state to the cashier.
4. **PWA Install Prompt**: Managed by [[usePWA Hook]] and [[PWA Update Prompt Component]], prompting users to install the POS app natively on desktop or mobile browsers.
5. **Firestore Persistence**: Enables `enableIndexedDbPersistence(db)` to queue write mutations locally during offline mode and sync seamlessly once reconnected.

---

## 🔗 Related Graph Links
- **Hooks**: [[useConnectivity Hook]], [[usePWA Hook]]
- **UI Components**: [[Connectivity Badge Component]], [[PWA Update Prompt Component]]
- **Screens**: All screens (`App.tsx` layout)
