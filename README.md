# 📊 Zerodha & Coin Portfolio Intelligence Dashboard

An enterprise-grade, privacy-first portfolio analytics, loss diagnostic, and capital reinvestment web application. Built for **Zerodha Kite (Stocks & ETFs)** and **Zerodha Coin (Mutual Funds)** statement exports without requiring paid Zerodha API subscriptions.

[![Architecture](https://img.shields.io/badge/Architecture-Microservices%20%2B%20Serverless-00f2fe?style=for-the-badge)](#-system-architecture)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%7C%20Docker%20%7C%20GitHub%20Pages-4facfe?style=for-the-badge)](#-deployment-strategies)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](#)

---

## 📑 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Project Modules Explanation](#-project-modules-explanation)
3. [Technology Stack](#-technology-stack)
4. [Deep Dive: The Recommendation Engine](#-deep-dive-the-recommendation-engine)
   * [Short-Term Tactical Recommendation Basis (6–18 Months)](#1-short-term-tactical-recommendation-basis-618-months)
   * [Long-Term Core Wealth Recommendation Basis (3–10 Years)](#2-long-term-core-wealth-recommendation-basis-310-years)
   * [Average-Down Dip Detection Basis](#3-average-down-dip-detection-basis)
   * [Sector Gap Analysis Basis](#4-sector-gap-analysis-basis)
5. [Real-Time Live Stock Price Sync (NSE API)](#-real-time-live-stock-price-sync-nse-api)
6. [Deployment Strategies](#-deployment-strategies)
   * [Deployment Strategy A: Vercel Serverless (Recommended)](#deployment-strategy-a-vercel-serverless-recommended)
   * [Deployment Strategy B: Docker Compose Microservices](#deployment-strategy-b-docker-compose-microservices)
   * [Deployment Strategy C: GitHub Pages (Static Mode)](#deployment-strategy-c-github-pages-static-mode)

---

## 🏗️ System Architecture

The application implements a **Hybrid Microservices & Serverless Architecture** that dynamically adapts based on deployment environment:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND USER INTERFACE                        │
│                        (http://localhost:3000)                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / SERVERLESS ROUTER                        │
│               (Port 5000 / Vercel Serverless API Router)                    │
├───────────────────────┬─────────────────────────────┬───────────────────────┤
│                       │                             │                       │
│                       ▼                             ▼                       ▼
│  ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│  │   PARSER MICROSERVICE    │  │   ANALYTICS SERVICE      │  │  RECOMMENDATION SERVICE  │
│  │    (/api/parse :5001)    │  │  (/api/analytics :5002)  │  │(/api/recommendations:5003)│
│  ├──────────────────────────┤  ├──────────────────────────┤  ├──────────────────────────┤
│  │ • CSV & XLSX Ingestion   │  │ • Overall P&L Computations│  │ • Short-Term (6-18 Mos)  │
│  │ • Row 23 Header Scanner  │  │ • Loss Drawdown Engine   │  │ • Long-Term (3-10 Yrs)   │
│  │ • Multi-Sheet Parsing    │  │ • Sector Drag Heatmap    │  │ • Dip Averaging Scoring  │
│  └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘
```

### Dual Execution Topology
1. **Cloud Serverless Mode (Vercel / AWS Lambda)**: The `/api/*.js` routes execute as independent, isolated serverless cloud functions with scale-to-zero capability.
2. **Containerized Microservices Mode (Docker / Local Node.js)**: Runs Express microservices behind a dedicated HTTP API Gateway proxy (`http://localhost:5000`).
3. **Resilient Offline Fallback**: If backend services are unreachable, the React frontend seamlessly falls back to client-side WebAssembly/JS evaluation so the application never crashes.

---

## 📁 Project Modules Explanation

```
portfolio/
├── api/                                 # Vercel Serverless Cloud Functions
│   ├── parse.js                         # Ingestion Function for CSV & XLSX files
│   ├── analytics.js                     # P&L and Loss Diagnostics Function
│   ├── recommendations.js               # Capital Allocation & Stock Picks Function
│   └── quote.js                         # Real-Time NSE Live Stock Price Sync Function
│
├── gateway/                             # Microservices API Gateway Router
│   ├── index.js                         # Express reverse proxy (Port 5000) routing requests
│   └── package.json
│
├── services/                            # Standalone Express Backend Microservices
│   ├── parser-service/                  # Microservice 1: File Parsing Engine (Port 5001)
│   ├── analytics-service/               # Microservice 2: Portfolio Loss Engine (Port 5002)
│   └── recommendation-service/          # Microservice 3: Investment Reinvestment (Port 5003)
│
├── css/
│   └── styles.css                       # Glassmorphism dark-mode CSS design system
│
├── js/
│   ├── app.jsx                          # Main React dashboard orchestrator & state manager
│   ├── csvParser.js                     # Client-side fallback file parser with header scanner
│   ├── analytics.js                     # Client-side fallback analytics & loss engine
│   └── sampleData.js                    # Pre-loaded mock Zerodha Kite & Coin portfolio
│
├── docker-compose.yml                   # Multi-container Docker orchestrator
├── vercel.json                          # Vercel serverless deployment routing config
├── index.html                           # Single Page App (SPA) HTML entry point
└── package.json                         # Root project orchestrator script
```

### Module Breakdown
* **`services/parser-service/` & `api/parse.js`**: Features a custom 2D matrix scanner that scans up to 100 rows deep to find Zerodha Console headers (`Symbol`, `Quantity Available`, `Average Price`, `Present Value`) regardless of top metadata lines.
* **`services/analytics-service/` & `api/analytics.js`**: Calculates net returns, unrealized profit/loss, and categorizes losses into **Severe (`-20%+`)**, **Moderate (`-5% to -20%`)**, and **Minor (`< -5%`)** tiers.
* **`services/recommendation-service/` & `api/recommendations.js`**: Runs portfolio sector gap analysis, dip-averaging algorithms, and returns vetted investment opportunities.
* **`api/quote.js`**: Connects to live stock market data APIs to fetch real-time market prices (`.NS`) every 30 seconds.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Tailwind CSS, Glassmorphic UI CSS system, Lucide Icons, PapaParse, SheetJS (XLSX).
* **Backend Microservices**: Node.js, Express, `http-proxy-middleware`, `multer`, `node-fetch`, Vercel Node Runtime.
* **Orchestration & DevOps**: Docker, Docker Compose, Concurrently, Git, Vercel CLI.

---

## 💡 Deep Dive: The Recommendation Engine

The **Capital Reinvestment Engine** provides data-driven, actionable stock and ETF recommendations. Below is the exact methodology and quantitative basis used for each recommendation category.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAPITAL REINVESTMENT ENGINE LOGIC                        │
├───────────────────────────────────┬─────────────────────────────────────────┤
│  ⚡ SHORT-TERM TACTICAL (6–18 Mos) │  🏛️ LONG-TERM COMPOUNDERS (3–10 Yrs)    │
│  • High Govt Capex & Order Books  │  • Broad Market Index ETFs (Nifty 50)   │
│  • 15% – 28% Expected Upside      │  • Global USD Tech Hedges (Nasdaq 100)  │
├───────────────────────────────────┼─────────────────────────────────────────┤
│  🎯 AVERAGE-DOWN DIP FINDER       │  🌐 SECTOR GAP SCANNER                  │
│  • Quality dips (-2.5% to -35%)   │  • Missing Macro Themes (Infra, Power)  │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

---

### 1. Short-Term Tactical Recommendation Basis (6–18 Months)

#### **Objective**: Capitalize on high-catalyst macroeconomic tailwinds, earnings acceleration, and government capital expenditure cycles.
#### **Target Returns**: **15% – 28% Upside**

#### **Quantitative & Qualitative Selection Criteria**:
1. **Government Capex & Order-Book Expansion (>20% YoY)**:
   * *Selection*: **HAL (Hindustan Aeronautics)**, **BEL (Bharat Electronics)**
   * *Basis*: Backed by Defence Ministry indigenization mandates, multi-year order book visibility (3x annual revenue), and rising defence export contracts to Southeast Asia & Middle East.
2. **Infrastructure & Capital Goods Leaders**:
   * *Selection*: **L&T (Larsen & Toubro Ltd)**
   * *Basis*: Beneficiary of domestic infrastructure capex, Indian Railways expansion, green hydrogen facilities, and Middle East EPC orders.
3. **Power Grid & Renewable Energy Transition**:
   * *Selection*: **NTPC Ltd**, **Tata Power**
   * *Basis*: Seasonal peak summer power demand in India combined with solar/wind capacity additions, offering low volatility and steady dividend yields.

---

### 2. Long-Term Core Wealth Recommendation Basis (3–10 Years)

#### **Objective**: Build an indestructible wealth compounding core with wide economic moats and zero single-stock selection risk.
#### **Target Returns**: **12% – 18% CAGR**

#### **Quantitative & Qualitative Selection Criteria**:
1. **Core Broad Market Index Foundation**:
   * *Selection*: **NIFTYBEES (Nippon India ETF Nifty 50 BeES)**
   * *Basis*: Low-cost exposure to India's top 50 companies. Eliminates stock-picking risk while compounding with Indian GDP growth.
2. **Global USD & Technology Currency Hedge**:
   * *Selection*: **MON100-E (Motilal Oswal Nasdaq 100 ETF)**
   * *Basis*: Direct ownership in global AI and tech giants (Microsoft, Apple, Nvidia, Alphabet, Amazon). Serves as a USD hedge against INR depreciation (~3-4% per year).
3. **Defensive Healthcare & FMCG Compounders**:
   * *Selection*: **Sun Pharmaceutical Industries (SUNPHARMA)**, **ITC Ltd**
   * *Basis*: High Return on Capital Employed (ROCE > 20%), strong domestic market share in chronic therapies, non-cyclical demand that protects portfolio capital during market corrections.

---

### 3. Average-Down Dip Detection Basis

#### **Objective**: Lower unit acquisition cost on quality holdings currently operating at temporary drawdowns.
#### **Mathematical Formula**:
$$\text{Drawdown \%} = \left( \frac{\text{LTP} - \text{AvgCost}}{\text{AvgCost}} \right) \times 100$$

#### **Filter Rules**:
* Identifies portfolio stocks with drawdowns between **$-2.5\%$ and $-35.0\%$**.
* Excludes bankrupt penny stocks or non-fundamental spec bets.
* *Example*: Identifies **ITC** trading at $\sim ₹286$ vs purchase average $₹404$, generating tranche-accumulation rationales.

---

### 4. Sector Gap Analysis Basis

#### **Objective**: Eliminate sector over-concentration (e.g., holding 45% of capital in mid-cap regional banks).
#### **Scan Logic**:
1. Scans user portfolio across 10 major Indian macro sectors: `Banking`, `IT & Software`, `Automobile & EV`, `Energy & Oil`, `Renewable Energy`, `FMCG`, `Pharma`, `Defence`, `Infrastructure`, `Global ETFs`.
2. Flags unrepresented sectors and recommends specific sector-entry instruments.

---

## 🟢 Real-Time Live Stock Price Sync (NSE API)

The dashboard includes a background live market price engine (`api/quote.js`):
* Queries National Stock Exchange (`.NS`) quotes via serverless API handlers.
* Auto-refreshes every **30 seconds** with visual indicator: **`🟢 Market Prices: Live NSE Syncing`**.
* Updates current values, daily return percentages, and total portfolio valuation dynamically.

---

## 🌐 Deployment Strategies

### Deployment Strategy A: Vercel Serverless (Recommended)

1. Push your repository to GitHub (`https://github.com/YOUR_USERNAME/portfolio.git`).
2. Log into [vercel.com](https://vercel.com) with GitHub.
3. Click **New Project** $\rightarrow$ Select `portfolio` $\rightarrow$ Click **Deploy**.
4. Both frontend static UI and `/api/*` serverless backend functions deploy automatically at **$0 cost**.

### Deployment Strategy B: Docker Compose Microservices

Run all 4 microservices locally or on AWS EC2 / GCP Compute Engine:
```bash
# Clone repository
git clone https://github.com/hari5792/portfolio.git
cd portfolio

# Launch all microservices in containers
docker compose up --build
```
* Access API Gateway: `http://localhost:5000`
* Access React UI: `http://localhost:3000`

### Deployment Strategy C: GitHub Pages (Static Mode)

1. Go to repository **Settings** $\rightarrow$ **Pages**.
2. Set Source to **Deploy from a branch** (`main` branch, `/ (root)` folder).
3. Click **Save**. The app will be live at `https://YOUR_USERNAME.github.io/portfolio/`.

---

## 📄 License

Distributed under the **MIT License**. Created for Zerodha Kite and Zerodha Coin portfolio holders.
