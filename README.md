# Aqario Luxe Web Client

<div align="center">

[![Angular](https://img.shields.io/badge/Angular-17.0.0-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![RxJS](https://img.shields.io/badge/RxJS-7.8.0-B71C1C?style=for-the-badge&logo=reactivex&logoColor=white)](https://rxjs.dev/)
[![Sass](https://img.shields.io/badge/Sass-SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white)](https://sass-lang.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Client-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](https://opensource.org/licenses/ISC)

**Aqario Luxe Web** is the state-of-the-art Angular web client for the *Aqario Luxe Real Estate Management System*. It features premium visuals, real-time client-agent messaging, advanced property searching/filtering, automated viewings booking, KYC submission pipelines, and secure subscription checkout.

[**Explore Backend API Repository ➔**](https://github.com/eslamyf/aqario-luxe-api)

---

</div>

## 📌 Table of Contents
- [✨ Core Features](#-core-features)
- [🏗️ Client Architecture](#️-client-architecture)
- [📦 Dependencies & Technologies](#-dependencies--technologies)
- [⚙️ Environment Configuration](#-environment-configuration)
- [🚀 Local Setup & Installation](#-local-setup--installation)
- [🛠️ Available Scripts](#️-available-scripts)
- [🎨 Design Systems & Styles](#-design-systems--styles)

---

## ✨ Core Features

### 👥 Role-Based Portals & Dashboards
*   **Admin Panel:** Comprehensive system analytics, user management controls, KYC document approval/rejection queues, subscription package configurations, and audit logging displays.
*   **Agent Workspace:** Dedicated listing editor, subscription management console, real-time lead inbox, viewing appointment schedules, and client feedback review.
*   **User Dashboard:** Interactive page for regular buyers/tenants tracking saved searches, property favorites, viewing request statuses, and subscription upgrades.

### 🏠 Luxury Property Discovery
*   **Advanced Dynamic Filters:** Search by price range, geographical location, property type, area size, amenities, and listing categories.
*   **Interactive UI & Media:** Multi-image carousels, responsive grid/list card views, detail specifications, and seamless agent-contact interfaces.
*   **Real-time Auctions:** Live bidding system interfaces connected directly to websocket events for premium/luxe auctionable estates.

### 💬 Instant Messaging & Live Alerts
*   **Socket.IO Chat:** Instant connection to assigned listing agents. Includes real-time message indicators, scroll history, and connection state indicators.
*   **Notification Engine:** Live alerts for booking updates, bid status changes, KYC validation approvals, and promotional offers.

### 💳 Integrated Payments & KYC
*   **Secure Subscriptions:** Built-in gateways for subscription checkout supporting agency packages.
*   **KYC Flow:** Seamless upload wizard for identity verification (national ID, passport, tax certificates) ensuring high trust scores across the platform.

---

## 🏗️ Client Architecture

Aqario Luxe Web follows a strict **Clean Angular Feature-Based Directory Structure** to separate concerns:

```
aqario-luxe-web/src/app/
├── core/                        # Singleton services, route guards, HTTP interceptors
│   ├── guards/                  # Role-based access control guards (Admin, Agent)
│   ├── interceptors/            # JWT injection & HTTP error handling
│   └── services/                # Global API, authentication, and state services
│
├── shared/                      # Reusable components, directives, and pipes
│   ├── components/              # Buttons, cards, modals, loaders, search bars
│   └── pipes/                   # Currency formatters, timeago helper pipes
│
└── features/                    # Feature modules representing distinct domains
    ├── account/                 # Authentication, sign-up, Google OAuth, and profile management
    ├── admin/                   # Admin console interfaces, lists, and metrics charts
    ├── agents/                  # Agent public profiles and contact directory
    ├── become-agent/            # Multi-step application wizard for agents
    ├── bookings/                # Viewing request bookings scheduler
    ├── kyc/                     # Know-Your-Customer identity upload portal
    ├── payments/                # Checkout interface and receipt components
    ├── properties/              # Property directories, detail cards, map widgets, and creation forms
    ├── subscriptions/           # Subscription billing plans and payment details
    └── user dashboard/          # User-centric profile tracking page
```

---

## 📦 Dependencies & Technologies

Key libraries integrated into the client application:
*   **Angular 17 (`^17.0.0`):** Core framework leveraging Signals, standalone components, and modern reactivity model.
*   **RxJS (`~7.8.0`):** Handles asynchronous data streams, stream operations, and real-time state changes.
*   **Socket.io Client (`^4.8.3`):** Bidirectional event-based client connection for instant chats and notifications.
*   **Angularx Social Login (`^1.3.2`):** Easy Google OAuth single sign-on integration.
*   **NGX Translate (`^15.0.0`):** Core localization engine supporting multi-language setups.
*   **Libphonenumber-JS (`^1.13.3`):** Validates national and international phone input structures across forms.

---

## ⚙️ Environment Configuration

Environment files are configured under [src/environments/](file:///g:/Projects/mean-stack-real-estate/aqario-luxe-web/src/environments). 

Create or edit [src/environments/environment.ts](file:///g:/Projects/mean-stack-real-estate/aqario-luxe-web/src/environments/environment.ts):

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5002/api/v1', // Points to aqario-luxe-api local port
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
};
```

For production builds, set `production: true` and configure the corresponding endpoint in `environment.prod.ts`.

---

## 🚀 Local Setup & Installation

### Prerequisites
*   **Node.js:** v18.x or v20.x (Recommended)
*   **npm:** v9.x+
*   **Angular CLI:** Installed globally (`npm install -g @angular/cli@17`)

### 1. Clone the Web Repository
```bash
git clone https://github.com/eslamyf/aqario-luxe-web.git
cd aqario-luxe-web
```

### 2. Install Packages
```bash
npm install
```

### 3. Verify Environment Settings
Configure the development API target inside `src/environments/environment.ts` (port `5002` matches the default API server port).

### 4. Boot Dev Server
```bash
npm start
```
The application will launch and compile on **`http://localhost:4200`**.

---

## 🛠️ Available Scripts

Execute scripts using `npm run <script-name>`:

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm start` | `ng serve` | Launches local development server on port `4200` |
| `npm run build` | `ng build` | Compiles application code into production-ready static assets in `/dist` |
| `npm run watch` | `ng build --watch...` | Recompiles automatically on code modifications (Dev environment) |
| `npm run test` | `ng test` | Runs unit test suites through Karma and Jasmine launchers |

---

## 🎨 Design Systems & Styles

Styles are organized using Sass (SCSS) in [src/styles.scss](file:///g:/Projects/mean-stack-real-estate/aqario-luxe-web/src/styles.scss) and a dedicated custom styling folder [src/styles/](file:///g:/Projects/mean-stack-real-estate/aqario-luxe-web/src/styles).
*   **Colors:** Tailored HSL premium color schemes, including deep luxury dark slates, gold/bronze highlights, and clean typography layouts.
*   **Micro-interactions:** Responsive custom animations, card hover transitions, dynamic modal pop-ups, and interactive loaders.
*   **Typography:** Responsive font weight hierarchies based on Google Fonts (Outfit, Inter).

---

<div align="center">
Made with ❤️ by Eslam Yasser
</div>
