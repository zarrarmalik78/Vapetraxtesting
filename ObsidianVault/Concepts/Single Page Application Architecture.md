---
tags:
  - concept
  - architecture
  - frontend
---

# Single Page Application Architecture

## Overview
VapeTrax Web POS is built as a client-side Single Page Application (SPA) leveraging React 18, TypeScript, Vite, and Tailwind CSS. The application loads once and manages view transitions dynamically without page reloads.

---

## 🏗️ Core Architecture Components

```text
Vite + React SPA
 ├── App Router (App.tsx)
 ├── Global State Contexts (AuthContext, DataContext)
 ├── Custom Data Hooks (useFirestoreOnce, useConnectivity, usePWA)
 ├── View Pages (Dashboard, NewSale, Stock, etc.)
 └── Reusable UI Components & Modals
```

1. **Routing**: Managed in `src/App.tsx` using `react-router-dom`. Routes are protected by [[Protected Route Component]].
2. **State Management**: React Context (`AuthContext`, `DataContext`) for user sessions and active store state, paired with custom local hooks.
3. **Build Tooling**: Vite compiles TypeScript and packages assets with instant hot-module replacement (HMR).
4. **Styling System**: Tailwind CSS for responsive UI, dark mode glassmorphism themes, and custom PKR currency inputs.

---

## 🔗 Related Graph Links
- **Framework & Libraries**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Contexts**: [[Auth Context]], [[Data Context]]
- **Routing**: [[Protected Route Component]]
- **Decision Record**: [[ADR-004 React SPA & Vite Stack]]
