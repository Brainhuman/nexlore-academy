NEXLORE ACADEMY — PRODUCTION-ORIENTED BUILD

This package includes:
- Public website for English, German, French and Korean courses.
- Real learner registration with mobile + password account creation.
- Secure-ish authentication using bcrypt password hashing + HttpOnly JWT cookie.
- Student dashboard.
- Admin panel with mobile/password login.
- Course + tuition management.
- Teacher management.
- Student/registration management.
- Support callback requests with status tracking.
- Payment records and a payment endpoint ready for a real gateway.
- PostgreSQL database schema.
- Helmet security headers and rate limiting.

REQUIRED PRODUCTION SETTINGS:
1) Create a PostgreSQL database and set DATABASE_URL.
2) Set a long random JWT_SECRET.
3) Set ADMIN_MOBILE and ADMIN_PASSWORD for the first admin account.
4) Deploy the Node.js service on a host that supports persistent environment variables and PostgreSQL.
5) Add your custom domain after deployment and enable HTTPS.
6) Choose a real payment gateway and add its merchant/API credentials; the generic payment endpoint does NOT charge cards by itself.

LOCAL RUN:
- Install Node.js 20+
- npm install
- Configure .env from .env.example
- npm start

IMPORTANT:
- Do not commit .env or database credentials.
- Replace demo course/teacher data with real information before launch.
- The payment page is intentionally provider-neutral until the academy selects a payment gateway.
