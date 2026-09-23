# FinTrack Frontend

A new React + Vite frontend implementing the agreed finance application contract.

## API contract used

- `POST /api/auth/register` — sends `{ email, password }` because those are the only register request fields explicitly specified.
- `POST /api/auth/login` — sends `{ email, password }`.
- `POST /api/auth/logout`
- `GET /api/dashboard`
- `GET /api/transactions`
- `GET /api/transactions?type=income`
- `GET /api/transactions?type=expense`
- `POST /api/transactions` — sends `{ type, amount, description, date }`.
- `PUT /api/transactions/:id` — sends `{ type, amount, description, date }`.
- `DELETE /api/transactions/:id`

No `user_id` is sent by the frontend. Authentication is allowed to remain session/cookie based through `credentials: include`.

## Important contract gap

The supplied contract does not define a register request body beyond the endpoint, nor a current-user/name endpoint or response shape. Therefore this frontend does **not** invent a `name` field or `/api/auth/me` endpoint. The dashboard UI is ready for the documented dashboard response; if the backend must return/display the authenticated user's name, the team should document where that name comes from (for example, a field in the login response) before wiring it in.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to the backend origin, for example `http://localhost:8000`.

## UI behavior

- Client validation for email, password, transaction amount, description and date.
- Loading, empty, API/server-error and unauthorized/session-expired states.
- Dashboard balance/income/expense data from `/api/dashboard`.
- Transaction CRUD and income/expense filtering through the exact transaction endpoints.
- Dark mode stored in the `theme` cookie and restored after refresh.
- No authentication token is invented or stored by the frontend; backend session cookies are sent with API requests.

## Testing status

The project source and contract wiring are implemented. Browser E2E could not be executed in this environment because no browser-testing tool/backend instance is available. Dependency installation also could not complete in the execution environment, so `npm run build` could not be run successfully here (`vite: not found`). No commit or push should be made until the dependencies are installed and the E2E flow is run against the actual backend.
