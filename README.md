#  School ERP — MVP

A production-minded, end-to-end school management starter with an Expo mobile app, Express/TypeScript API, PostgreSQL and Prisma. The scope intentionally covers the first usable school workflow only.

## Included
- JWT authentication, bcrypt password hashing, Admin/Teacher/Student/Parent RBAC
- Role-aware dashboards and protected Expo Router navigation
- Students, parents, teachers, classes, sections, subjects and assignments
- Attendance marking and summaries, weekly timetable, announcements
- Fee records and payment history (no payment gateway)
- Zod validation, centralized API errors, pagination/search, secure token storage
- Reusable mobile design system, loading/empty/error/refresh states and confirmations
- Realistic seed dataset and four demo roles

## Architecture
```text
school-erp-mvp/
├── backend/   Express API, domain routers, Prisma schema and seed
├── frontend/  Expo Router app, React Query, Zustand, reusable UI
└── docker-compose.yml
```
The API is versioned under `/api/v1`. Domain routers are deliberately isolated so future modules can be added without changing authentication, error or persistence foundations.

## Quick start
**Requirements:** Node 20+, npm 10+, Docker, Expo Go or a simulator.

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run db:up
npm --workspace backend run prisma:generate
npm --workspace backend run db:migrate -- --name init
npm --workspace backend run db:seed
npm run dev:api
# separate terminal
npm run dev:app
```
For a physical device, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP. For Android Emulator use `http://10.0.2.2:4000/api/v1`.

## Demo accounts
All use password `School@123`:
- `admin@brightwood.edu`
- `teacher@brightwood.edu`
- `student@brightwood.edu`
- `parent@brightwood.edu`

## API map
- `POST /auth/login`, `GET /auth/me`
- `GET /dashboard/admin`, `GET /dashboard/home`
- `GET /students`, `GET /students/:id`, `GET /teachers`
- `GET /classes`, `GET /subjects`
- `GET|POST /announcements`, `GET|POST /assignments`
- `GET /timetable`, `GET /fees`
- `GET /attendance`, `POST /attendance/mark`

Every response uses `{ success, data, meta? }`; errors use `{ success:false, error:{ code, message, details? } }`.

## Production checklist
- Replace JWT secret and configure strict CORS.
- Put API behind TLS and managed Postgres; run `prisma migrate deploy` in release jobs.
- Add refresh-token rotation or an external identity provider, rate limiting and audit logs before public launch.
- Add integration and E2E tests, observability, backups, privacy retention rules and school-specific consent controls.
- Replace demo credentials and seed data. Never run destructive seed scripts in production.

## Deliberate non-goals
Transport, hostel, library, payroll, HR, inventory, exams automation, biometrics, online classes, chat, AI, bus tracking, multi-school SaaS, complex accounting and payment-gateway integrations are intentionally excluded.
