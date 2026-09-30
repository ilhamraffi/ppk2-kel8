# FinTrack Frontend

A new React + Vite frontend implementing the agreed finance application contract.

## API contract used

- `POST /api/auth/register` — sends `{ name, email, password }`. The backend requires `name`, so the register form collects it.
- `GET /api/auth/me` — used to restore the session and the signed-in user's name on load.
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

## Resolved contract gap

The contract previously left the register body and a current-user endpoint undefined. The backend has since settled both: `POST /api/auth/register` requires `name`, and `GET /api/auth/me` returns `{ id, name, email }` from the server session. The frontend now sends `name` on register and uses `/api/auth/me` on load to restore the session and show the signed-in user's name.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to the backend origin, for example `http://localhost:3000`. The dev server itself runs on `http://localhost:5173`.

## UI behavior

- Client validation for email, password, transaction amount, description and date.
- Loading, empty, API/server-error and unauthorized/session-expired states.
- Dashboard balance/income/expense data from `/api/dashboard`.
- Transaction CRUD and income/expense filtering through the exact transaction endpoints.
- Dark mode stored in the `theme` cookie and restored after refresh.
- No authentication token is invented or stored by the frontend; backend session cookies are sent with API requests.

## Testing status

Dependencies install and `npm run build` succeeds. Browser E2E has not been run against a live backend yet.
