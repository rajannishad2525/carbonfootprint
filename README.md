# EcoTrack — Carbon Footprint Tracker

A smart web application that helps individuals **understand**, **track**, and **reduce** their personal carbon footprint through personalized insights and actionable tips.

**Live Demo:** [https://eco.ystro.shop](https://eco.ystro.shop)

> Built for Hack2Skill Challenge 3 — Carbon Footprint Vertical

## Chosen Vertical

**Challenge 3:** Carbon Footprint — Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

## Approach and Logic

### Architecture
- **Pure frontend** application built with vanilla HTML5, CSS3, and JavaScript (ES6+)
- **Zero dependencies** — no npm packages, no build tools, no frameworks
- **Single Page Application** using hash-based routing (`#dashboard`, `#log`, `#tips`, `#profile`)
- **LocalStorage** for persistent data — all data stays on the user's device
- **Modular codebase** — 7 focused JS modules, each with a single responsibility

### Why This Approach?
- Lightweight: entire project under 200 KB (well under 10 MB limit)
- No server required — opens directly in any browser
- Zero supply chain security risk (no third-party dependencies)
- All code is readable and auditable in a single pass
- Fast loading, no build step needed

### Smart Decision Making
- **Scoring Engine:** Tips are ranked using `priority = categoryScore x impactWeight`, where categoryScore is the user's emission percentage in that category and impactWeight maps to high(3)/medium(2)/low(1). This ensures users always see the most impactful tips for their specific situation first.
- **Personalized Insights:** The quiz establishes a baseline, daily logging tracks changes, and the system continuously re-ranks recommendations based on the user's evolving emission profile.
- **Context-Aware UI:** Dynamic unit hints change based on selected activity (km for transport, kWh for energy, days for diet), preventing user confusion.
- **Gamification:** Eco Score (0-100), 12 achievement badges, and daily streaks motivate consistent engagement and behavior change.

### Logical Decision Making
The application makes intelligent decisions based on user context at every level:

1. **Quiz Analysis:** Calculates per-category emissions (transport, food, energy, shopping, lifestyle) and identifies the user's highest-impact area
2. **Tip Prioritization:** Automatically surfaces the most relevant tips — a heavy car commuter sees transport tips first, a meat-heavy eater sees food tips first
3. **Badge System:** Badges are earned through actual behavior (logging streaks, tips completed, total entries) — not just quiz answers
4. **Eco Score:** Converts raw footprint data into an intuitive 0-100 score for quick self-assessment
5. **Comparison Engine:** Shows user's footprint against India average (1.9t) and global average (4.7t) for perspective

## How the Solution Works

### 1. Understand — Onboarding Quiz
- 5-step interactive quiz collects lifestyle data: transport, food, home energy, shopping, and flights
- Real-time CO2 estimate updates as the user answers each question
- Info blocks explain how each category contributes to carbon emissions
- Calculates annual baseline carbon footprint in tonnes CO2
- Uses emission factors from 8 published research sources

### 2. Track — Activity Logger
- Log daily activities across 5 categories with automatic CO2 calculation
- Custom dropdowns with dynamic unit hints (km, kWh, days, flights, hours)
- Each entry shows exact emission amount with source citation
- Today's summary with total CO2 and entry count
- History view with date-wise entries and delete capability
- Weekly trend visualization on the dashboard
- PDF report export with full footprint analysis

### 3. Reduce — Personalized Tips
- 25 actionable tips across all 5 emission categories
- Priority-ranked by user's highest emission categories using scoring engine
- Each tip shows: estimated CO2 savings, difficulty level (easy/medium/hard), impact rating (low/medium/high)
- Dynamic re-ranking as user's emission profile changes
- Mark as done or skip — progress tracked with visual ring

### Dashboard
- **Greeting** — time-based (Good Morning/Afternoon/Evening) with user's name
- **Hero Card** — dark gradient with SVG progress ring showing eco score, today's CO2, and streak
- **Category Breakdown** — 5 visual bars showing emission distribution with percentages
- **Weekly Activity Chart** — 7-day logging trend with bar heights
- **Comparison Widget** — side-by-side comparison vs India avg (1.9t) and Global avg (4.7t)

### Profile and Badges
- **Eco Score** — 0-100 personalized sustainability score with color coding (green/amber/red)
- **12 Achievement Badges:**
  - Quiz-based: Green Commuter, Eco Eater, Energy Saver, Conscious Shopper, Eco Leader
  - Streak-based: 3-Day Streak, Week Warrior, Monthly Champion
  - Tips-based: Tip Explorer (5 tips), Tip Master (15 tips)
  - Activity-based: Logger Pro (10 logs), Data Champion (50 logs)
- **PDF Report Download** — styled report with footprint analysis, category breakdown, comparisons, recommendations
- **Settings** — edit name, retake quiz (preserves profile), reset data, logout

## Emission Data Sources

All emission factors are sourced from peer-reviewed research and government publications:

| Source | Used For | Year |
|--------|----------|------|
| EPA | Vehicle emission factors (petrol, diesel, CNG) | 2024 |
| DEFRA | Public transport, carpool emissions | 2023 |
| IPCC AR6 | Metro, solar, wind, zero-emission transport | 2023 |
| Our World in Data | Diet-based food emissions (6 diet types) | 2023 |
| CEA India | Grid electricity emission factor (0.82 kgCO2/kWh) | 2023 |
| CATF India | Electric vehicle and e-bike emissions | 2022 |
| WRI India | Motorbike, auto-rickshaw emissions | 2015 |
| WRAP UK | Consumer shopping emissions by level | 2023 |
| ICAO Calculator | Domestic and international flight emissions | 2023 |
| IEA | Digital streaming emissions | 2023 |

## Code Quality

### Module Architecture
Each JavaScript module has a single, clear responsibility:

| Module | Lines | Responsibility |
|--------|-------|---------------|
| `data.js` | 553 | Centralized emission factors, tips data, badges, shared SVG ring utility |
| `storage.js` | 268 | LocalStorage CRUD, sanitization, validation, export/import |
| `quiz.js` | 503 | 5-step onboarding flow with real-time estimation |
| `logger.js` | 433 | Activity logging with custom dropdowns and unit hints |
| `dashboard.js` | 270 | Analytics, charts, comparisons |
| `tips.js` | 220 | Scoring engine and personalized recommendations |
| `app.js` | 615 | SPA router, profile management, PDF export, badges |

### Code Principles
- **DRY** — reusable components (custom dropdown, modal, toast, SVG rings)
- **YAGNI** — no unnecessary abstractions or over-engineering
- **Separation of Concerns** — data, storage, UI, and routing are fully isolated
- **Consistent Naming** — descriptive function names (`calculateBaselineFootprint`, `getCategoryBreakdown`)
- **No Global State Pollution** — all modules are object-based namespaces
- **Comments** — every public function has a descriptive comment explaining its purpose

## Project Structure

```
carbonfootprint/
├── index.html              # SPA entry point with Content Security Policy
├── css/
│   └── styles.css          # Design system (60-30-10 color rule, CSS variables)
├── js/
│   ├── app.js              # Router, profile, eco score, PDF export, badges
│   ├── data.js             # Emission factors, 25 tips, 12 badges, calculations
│   ├── storage.js          # LocalStorage CRUD, sanitization, validation
│   ├── quiz.js             # 5-step onboarding quiz with info blocks
│   ├── logger.js           # Activity logger with custom dropdowns
│   ├── dashboard.js        # Dashboard charts and comparisons
│   └── tips.js             # Scoring engine + personalized tips
├── tests/
│   ├── index.html          # Browser-based test runner
│   └── tests.js            # 38 unit tests
├── README.md
├── LICENSE                 # MIT License
└── .gitignore
```

## How to Run

1. Clone the repository:
   ```bash
   git clone https://github.com/rajannishad2525/carbonfootprint.git
   ```
2. Open `index.html` in any modern web browser
3. No build step, no server, no installation required

**To run tests:** Open `tests/index.html` in a browser — all 42 tests run automatically.

**Live version:** [https://eco.ystro.shop](https://eco.ystro.shop)

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| HTML5 | Semantic, accessible markup with ARIA |
| CSS3 | Custom properties, flexbox, grid, responsive design |
| Vanilla JavaScript (ES6+) | No frameworks, no dependencies |
| LocalStorage API | Client-side data persistence |
| SVG | Charts, progress rings, icons |

## Security

- **Input Sanitization** — all user inputs escaped via `textContent` before storage (prevents XSS)
- **Content Security Policy** — `<meta>` CSP tag restricts scripts to same-origin only (`script-src 'self'`)
- **No eval()** — dynamic code execution never used anywhere
- **No innerHTML with user data** — user input never concatenated into HTML strings
- **JSON Schema Validation** — strict structure validation before accepting data imports
- **No External CDN** — all files served locally, zero supply chain attack surface
- **No Hardcoded Secrets** — no API keys, tokens, passwords, or credentials in codebase
- **No Network Requests** — application works entirely offline, no data leaves the device

## Efficiency

- **Total Size:** under 200 KB (well within 10 MB limit)
- **Zero Dependencies:** no npm packages, no build tools — instant loading
- **Offline-First:** works without internet after first load
- **No Network Calls:** all calculations happen client-side in the browser
- **Efficient DOM Updates:** SPA with hash routing — no full page reloads
- **Delegated Event Listeners:** single listener per container instead of per-element
- **Optimized Calculations:** simple multiplication with pre-computed factors, no redundant loops
- **CSS Variables:** 23 custom properties for consistent, maintainable styling

## Accessibility

- **Semantic HTML5** — `<header>`, `<nav>`, `<main>`, `<button>`, `<label>` used correctly
- **ARIA Attributes** — `aria-label`, `aria-live="polite"`, `aria-hidden`, `role="list"`, `role="tab"` on all interactive elements
- **Keyboard Navigation** — full tab order, visible `:focus-visible` states, Enter/Space activation
- **Color Contrast** — WCAG AA compliant (4.5:1 minimum ratio for all text)
- **Skip-to-Content Link** — hidden link for keyboard users to bypass navigation
- **Reduced Motion** — `@media (prefers-reduced-motion: reduce)` disables all animations
- **Screen Reader Support** — SVG charts have `role="img"` with descriptive `aria-label`
- **Responsive Design** — mobile-first with bottom nav (mobile) and inline nav (desktop 768px+)

## Testing

- **42 unit tests** covering:
  - Emission factor validation (positive values, zero for bike/walk)
  - Source citation presence on all factors
  - `calculateEmission()` accuracy (car: 10km = 1.74 kg CO2)
  - `calculateBaselineFootprint()` returns valid range
  - All 25 tips have required fields (id, category, title, savings, difficulty, impact, description)
  - All 12 badges have required fields (id, name, icon, description, type)
  - `saveProfile()` + `getProfile()` round-trip
  - `addLog()` creates entries with unique IDs
  - `deleteLog()` removes targeted entries
  - `addLog()` rejects negative quantities
  - `getLogsByDate()` filters correctly
  - `completeTip()` and `dismissTip()` track progress
  - `exportData()` returns correct structure with version
  - `validateImportData()` rejects malformed data
  - `resetData()` clears logs but preserves profile
  - `resetAll()` wipes everything
  - `calculateEcoScore()` maps footprint to 0-100 range
  - Badge earning conditions (quiz-based, streak-based, tips-based, activity-based)
  - Streak calculation (consecutive days with logs)
- **Custom test runner** — zero dependency, browser-based, auto-runs on load
- **To run:** Open `tests/index.html` in any browser

## Practical Usability

- **No Sign-Up Required** — start immediately with the quiz, no email or password needed
- **Works Offline** — all data stored locally, no internet dependency
- **Mobile-Friendly** — responsive design with touch-friendly buttons (min 44px)
- **Retake Quiz** — update lifestyle answers without losing your name or logged data
- **PDF Export** — download a styled carbon footprint report to share or print
- **Data Privacy** — zero data transmitted to any server, everything stays in your browser
- **India-Focused Defaults** — emission factors calibrated for Indian context (grid electricity, transport modes like auto-rickshaw, metro)

## Assumptions

1. Designed for individual use — personal carbon footprint tracking, not organizational
2. Emission factors are approximate, sourced from published research — not for regulatory compliance
3. India-specific grid emission factor used as default (CEA India 2023: 0.82 kgCO2/kWh)
4. "Average Indian" comparison: 1.9 tonnes CO2/person/year (World Bank data)
5. Global average comparison: 4.7 tonnes CO2/person/year (Our World in Data)
6. All data stays local in browser — no data transmitted to any server
7. Modern browser required (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
8. Transport emission factors assume single occupancy unless carpool is selected

## License

MIT License — Rajan Nishad
