# SNOW Portal (React + Vite)

A ServiceNow frontend portal built with React, Vite, and Zustand stores. Includes Ticket, Request, Problem, and Approval management screens.

## Getting Started

1. Install dependencies:
   - `npm install`
2. Start development server:
   - `npm run dev`
3. Build for production:
   - `npm run build`
4. Run lint/type checks:
   - `npm run lint`

## Configuration

### ServiceNow API client (frontend proxy)

The app uses `src/api/serviceNowClient.js`:

- `baseURL` is `/api/now`
- Axios request interceptor adds `Authorization` header from `authStore`

### Vercel Deployment

File: `vercel.json`

- `builds` config:
  - `@vercel/static-build` on `package.json`
- `rewrites` config for ServiceNow proxy (SPA route + API proxy):
  - source: `/api/now/:path*`
  - destination: `https://${SERVICE_NOW_INSTANCE}.service-now.com/api/now/:path*`
- SPA default route:
  - `/(.*)` → `/index.html`

### Environment Variables

In Vercel (or local .env file for non-production use):

- `SERVICE_NOW_INSTANCE` (e.g. `dev12345` or `myinstance`) → ServiceNow host prefix
- `VITE_API_BASE_URL` (if you switch to full backend proxy in future)
- `BASIC_AUTH_TOKEN` (for auth headers if not using store-based login flow)

## Project Structure

- `src/components` UI components and layout
- `src/pages` pages: `Approvals`, `Dashboard`, `IncidentList`, `Login`, `ProblemList`, `RequestList`
- `src/store` Zustand stores: `approvalStore`, `authStore`, `problemStore`, `requestedItemStore`, `ticketStore`
- `src/api/serviceNowClient.js` axios client with auth interceptor

## Notes

- ServiceNow API proxy via `vercel.json` keeps credentials and CORS safe.
- Ensure `SERVICE_NOW_INSTANCE` is correct in Vercel project settings before deploy.

