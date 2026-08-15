<div align="center">
  <strong>📄 README</strong> &nbsp;|&nbsp; 
  <a href="./System%20Architecture.md">🏗️ System Architecture</a> &nbsp;|&nbsp; 
  <a href="./Sequence%20Diagram.md">🔄 Sequence Diagram</a> &nbsp;|&nbsp;
  <a href="./Stress%20Test%20Results.md">🔥 Stress Test Results</a>
</div>

<br/>

# BritishRFQ

BritishRFQ is a real-time, reverse-auction platform for freight bidding. It allows suppliers to bid on freight RFQs (Request For Quotes) in a highly concurrent environment. The system natively handles auction extensions, forced closures, real-time WebSocket updates powered by Redis Pub/Sub, and robust idempotency for bid submission.

## AI Collaboration & Testing Statement
**Note for Reviewers:** This project was built with the assistance of AI coding agents. The core architecture was independently designed and subsequently validated by AI, rather than being built by AI. The base of every function was thoroughly verified and validated by a human to ensure complete understanding of its behavior and logic. Furthermore, **all unit and load tests in this repository were completely written by AI**, ensuring high test coverage and robust validation of race conditions in the reverse auction engine.

---

## Tech Stack & Frameworks

This project utilizes a modern, highly scalable stack across the frontend, backend, and infrastructure layers.

### Backend
- **FastAPI (Python):** The core REST and WebSocket API framework, chosen for its high performance and native asynchronous capabilities.
- **SQLModel & SQLAlchemy (Async):** The ORM and Data Access Layer. Handles asynchronous connections and pessimistic row-level locking (`SELECT ... FOR UPDATE`) to guarantee data consistency during concurrent bidding.
- **PostgreSQL:** The primary relational database and absolute source of truth.
- **Redis & Redis Pub/Sub:** Serves as the message broker for the WebSocket manager, enabling horizontal scaling by broadcasting bid and rank updates across multiple backend instances.
- **APScheduler:** Manages the background worker queue dynamically scheduling and re-scheduling (replacing) auction closures based on real-time extensions.
- **Locust:** The load-testing framework used to simulate high-concurrency swarm bidding and validate race condition handling.
- **Pytest:** The primary unit testing framework.

### Frontend
- **React 19:** The core UI library powering the Single Page Application (SPA).
- **Vite:** The lightning-fast frontend build tool and development server.
- **Tailwind CSS v4:** Utility-first CSS framework for rapid UI styling.
- **Shadcn UI & Base UI:** Unstyled, accessible component primitives and customizable UI blocks.
- **React Router:** For client-side routing.
- **Axios:** For API HTTP requests.

---

## System Architecture

The architecture is designed to handle high-frequency bidding while maintaining strict atomicity and monotonic rank calculation. 

*Please see the full native architecture diagram here: **[System Architecture](./System%20Architecture.md)***

---

## Bidding Sequence Flow

The following sequence diagram illustrates the lifecycle of a Bid submission, highlighting the pessimistic locking, idempotency check, and asynchronous Redis broadcasting.

*Please see the full native sequence diagram here: **[Sequence Diagram](./Sequence%20Diagram.md)***

---

## Project Structure & Folder Organization

The project is structured into two completely decoupled repositories (monorepo format) for Frontend and Backend.

### `/backend`
The FastAPI backend service.
- **`/src/api`**: Contains the FastAPI route controllers (e.g., `bid_routes.py`, `rfq_routes.py`). This layer is strictly responsible for handling HTTP requests, Idempotency checks, and validation.
- **`/src/core`**: Core infrastructure configuration, primarily the asynchronous database connection setup (`database.py`).
- **`/src/engine`**: The business logic domain. `auction_rules.py` handles the logic for extending auctions, while `worker.py` manages the APScheduler logic for closing auctions.
- **`/src/models`**: Contains the SQLModel definitions (`domain.py`) representing the PostgreSQL database schema and Pydantic schemas for data validation.
- **`/src/ws`**: The real-time communications layer. `manager.py` contains the WebSocket Manager connecting to Redis Pub/Sub to facilitate cross-instance broadcasting.
- **`/src/main.py`**: The FastAPI application entry point, lifecycle events (startup/shutdown of Redis and Scheduler).
- **`/tests`**: The automated testing suite containing Pytest configurations, unit tests, and the Locust load testing swarm (`locustfile.py`).

### `/frontend`
The React 19 Single Page Application.
- **`/src/api`**: Centralized Axios API client configuration for communicating with the backend.
- **`/src/assets`**: Static assets like images and generic CSS styles (`index.css`).
- **`/src/components`**: Reusable React components. Often divided into UI primitives (Shadcn/Base UI components) and complex business components (e.g., Live Auction Leaderboard).
- **`/src/hooks`**: Custom React hooks (e.g., `useWebSocket`) for managing complex client-side state and real-time subscription lifecycle.
- **`/src/lib`**: Utility functions, formatting tools, and helper classes.
- **`/src/pages`**: Top-level page components representing different route views (e.g., Dashboard, RFQ Details).

---

## Key Technical Features

- **Idempotent Bidding**: Safely handles duplicate or retried network requests by utilizing an `Idempotency-Key` HTTP header alongside payload hashing.
- **Dynamic Auction Extensions**: If a bid is submitted close to the deadline and alters the top rank, the auction is automatically extended (clamped to a hard `forced_close_at` limit).
- **Real-Time Live Updates via Redis**: Subscribed clients immediately receive WebSocket events such as `RANK_UPDATE` and `AUCTION_EXTENDED`. Redis Pub/Sub ensures all active WebSocket connections across different API instances are notified.
- **Timezone Consistency**: Enforces strict UTC consistency across database inserts, API schemas, and APScheduler background tasks to prevent naive/aware datetime comparison errors.
- **Strict Data Consistency**: Ensures strictly monotonic ranking by utilizing PostgreSQL row-level locks (`FOR UPDATE`) across the entire read-evaluate-write transaction to prevent race conditions during heavy swarm bidding.

---

## Local Development Setup

### 1. Backend

Ensure you have PostgreSQL and Redis instances running locally (or via Docker), or update your `.env` variables to point to your hosted databases.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt # (or use uv sync if configured)

# Start the FastAPI server
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
The frontend will typically be accessible at `http://localhost:5173`.

### 3. Load Testing

The backend includes a predefined Locust load testing script to test concurrent bidding capabilities and race condition handling.

```bash
cd backend
source .venv/bin/activate
locust -f tests/locustfile.py
```
Access the Locust web interface at `http://localhost:8089` to start the swarm.