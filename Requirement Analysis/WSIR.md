# StrawCRM — Web Security Implementation Requirements (WSIR)

**Product:** StrawCRM  
**Document Type:** Web Security Implementation Requirements  
**Version:** 1.0  
**Status:** Security Checklist / Implementation Baseline  
**Application Stack:** React + FastAPI + Google Cloud Firestore + Firebase Auth + Gemini API + Render

> This document adapts the provided master web application security checklist to the StrawCRM architecture. Treat every unchecked item as an open security risk that must be justified, mitigated, or explicitly marked as not applicable before production release.

---

## 0. Security Implementation Rules

During development and before production deployment:

- [ ] Every applicable security control in this document has been addressed.
- [ ] Security-sensitive controls are implemented server-side where applicable.
- [ ] Security decisions are documented when a control is intentionally omitted.
- [ ] Production configuration is reviewed separately from local development configuration.
- [ ] Secrets, credentials, and private customer information are protected throughout the application lifecycle.

---

# 1. Input Validation & Injection Prevention

## 1.1 General Input Validation

- [ ] All user input is validated server-side.
- [ ] Validation uses explicit rules for type, length, format, and range.
- [ ] Client-side validation is treated only as a user-experience feature, not as the primary security control.
- [ ] Customer name input is validated and length-limited.
- [ ] Customer email is validated against an appropriate email format.
- [ ] Ticket subject is validated and length-limited.
- [ ] Ticket description is validated and length-limited.
- [ ] Ticket status accepts only:
  - `Open`
  - `In Progress`
  - `Closed`
- [ ] Notes are validated for non-empty content and reasonable length.

## 1.2 Database & Document Store Security

- [ ] Parameterized queries and safe Google Cloud Firestore SDK abstractions are used.
- [ ] Firestore Security Rules (`firestore.rules`) enforce strict schema, status constraints, and authentication requirements.
- [ ] No database operations are constructed by string concatenation using user input.
- [ ] Search parameters are sanitized and bound to prevent query injection or unbounded reads.
- [ ] Ticket IDs are validated server-side before database operations.

## 1.3 Output Handling

- [ ] User-controlled content is safely encoded/escaped according to its output context.
- [ ] React rendering is not used to inject arbitrary unsanitized HTML.
- [ ] Raw HTML rendering is avoided unless strictly required and safely sanitized.

## 1.4 Unsafe Processing

- [ ] Dangerous deserialization of untrusted input is disabled/avoided.
- [ ] `eval` and equivalent dynamic code execution are not used with user input.
- [ ] User input is never passed directly to operating-system commands.
- [x] File upload endpoint (`/api/upload`) validates file presence, enforces a strict 50MB file size limit, and sanitizes filenames using timestamps and unique UUIDs to prevent directory traversal.
- [x] Static uploads directory (`/uploads/`) is mounted securely with script execution disabled.

---

# 2. Authentication

Authentication uses Firebase Auth. The following controls apply:

- [ ] Passwords are hashed using bcrypt, Argon2, or scrypt.
- [ ] Plaintext passwords are never stored.
- [ ] Weak password policies are avoided.
- [ ] Breached-password checking is considered for production authentication.
- [ ] MFA support is considered for privileged accounts.
- [ ] Login attempts are rate-limited.
- [ ] Progressive delays/lockout controls are applied after repeated failures.
- [ ] Login failure responses do not reveal whether an account exists.
- [ ] Password reset uses time-limited, single-use tokens.
- [ ] Password-reset flows do not permit user enumeration.
- [ ] Default/admin accounts are disabled or protected.

---

# 3. Session Management

If cookie-based authentication is introduced:

- [ ] Session tokens are cryptographically random and high entropy.
- [ ] Cookies use `HttpOnly`.
- [ ] Cookies use `Secure` in production.
- [ ] Cookies use `SameSite=Strict` or `Lax` as appropriate.
- [ ] Session IDs are regenerated after login and privilege changes.
- [ ] Idle session timeout is enforced.
- [ ] Absolute session timeout is enforced.
- [ ] Logout invalidates the server-side session.

For token-based authentication:

- [ ] Token lifetime is limited.
- [ ] Refresh tokens are protected.
- [ ] Tokens are not unnecessarily stored in insecure browser storage.

---

# 4. Authorization / Access Control

- [x] **Unified Internal Team Access Model**: As an internal support CRM for Datastraw.in, all tickets and customer requests are accessible by any authenticated staff member. There is no separate or siloed ticket data per user ID.
- [x] Every team member logging in with their account has full visibility to view, search, update status, and add notes to any ticket in the system.
- [ ] Permission checks are performed server-side on every protected request.
- [ ] UI visibility is never treated as an authorization mechanism.
- [ ] Access control follows a default-deny approach for unauthenticated requests.
- [ ] Ticket IDs supplied by clients are validated server-side to ensure existence and prevent invalid mutations.
- [ ] Team collaboration is open across tickets; notes identify the authoring agent while preserving global ticket accessibility.
- [ ] No per-user data siloing: tickets are stored in a single unified collection accessible by all verified internal staff.

---

# 5. Transport Security

- [ ] HTTPS is used for production frontend and backend traffic.
- [ ] HTTP is redirected to HTTPS where supported.
- [ ] HSTS is enabled for the production domain where appropriate.
- [ ] TLS 1.2+ is used.
- [ ] Weak/deprecated SSL/TLS protocols are disabled.
- [ ] Production certificates are valid and trusted.
- [ ] Certificate expiry is monitored where operationally appropriate.
- [ ] Certificate pinning is considered only for applicable native/mobile clients.

---

# 6. Cross-Site Attack Protections

## 6.1 CSRF

- [ ] CSRF protection is implemented for state-changing requests when cookie-based authentication is used.
- [ ] SameSite cookie protections are configured appropriately.
- [ ] Double-submit or equivalent CSRF protection is considered where required.

## 6.2 Clickjacking

- [ ] `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'` is configured.

## 6.3 Content Security Policy

- [ ] A Content-Security-Policy is configured.
- [ ] Script sources are restricted.
- [ ] Style/resource sources are restricted where practical.
- [ ] Unsafe script execution is avoided unless explicitly justified.

## 6.4 CORS

- [ ] CORS uses explicit allowed origins.
- [ ] `Access-Control-Allow-Origin: *` is not used for authenticated endpoints.
- [ ] Development and production origins are separately configured.

---

# 7. Security Headers

The FastAPI/Render production response layer should address the following baseline:

- [ ] `Content-Security-Policy`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: no-referrer` or `strict-origin-when-cross-origin`
- [ ] `Permissions-Policy`
- [ ] `X-Frame-Options: DENY` or equivalent CSP frame policy
- [ ] `Strict-Transport-Security` where appropriate
- [ ] `Server` / `X-Powered-By` information leakage is reduced where configurable.

---

# 8. Secrets & Configuration Management

- [ ] No API keys are hardcoded in source code.
- [ ] No database credentials are committed to GitHub.
- [ ] Gemini API key is stored server-side only.
- [ ] Google Cloud Firestore / Firebase service account credentials are stored outside the repository.
- [ ] Firebase service account key is strictly isolated in backend environment variables.
- [ ] `.env` files are excluded through `.gitignore`.
- [ ] `.env.example` contains variable names but no real secrets.
- [ ] Production secrets are configured through Render/environment secret settings.
- [ ] Secrets are rotated after suspected exposure.
- [ ] Production debug mode is disabled.
- [ ] Production responses do not expose stack traces.
- [ ] Development and production credentials are separated.

## StrawCRM Environment Variables

### Backend

```text
GOOGLE_APPLICATION_CREDENTIALS=
# or FIREBASE_SERVICE_ACCOUNT_KEY=
GEMINI_API_KEY=
FRONTEND_URL=
PORT=8000
```

### Frontend

```text
VITE_API_BASE_URL=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> The Gemini API key and Firebase service account private credentials must never be exposed to the React client.

---

# 9. Dependency & Supply Chain Security

- [ ] Dependencies are regularly vulnerability-scanned.
- [ ] Python dependencies are reviewed and pinned appropriately.
- [ ] JavaScript dependencies are reviewed and audited.
- [ ] Unused dependencies are removed.
- [ ] Dead code is removed where practical.
- [ ] Third-party scripts/resources are reviewed before inclusion.
- [ ] SAST is considered/integrated into CI/CD.
- [ ] Dependency updates are reviewed before production release.

Recommended tooling:

```text
npm audit
pip-audit
Dependabot
SAST tooling
```

---

# 10. Rate Limiting & Abuse Prevention

- [ ] Public API endpoints are rate-limited where feasible.
- [ ] AI endpoints are rate-limited.
- [ ] Ticket creation is protected against automated abuse where required.
- [ ] Authentication endpoints are rate-limited if authentication is introduced.
- [ ] Password reset endpoints are rate-limited if authentication is introduced.
- [ ] CAPTCHA or equivalent protection is considered for sensitive public forms.
- [ ] WAF protection is considered for production deployment where feasible.
- [ ] Enumeration attacks are considered and mitigated.

---

# 11. Business Logic Security

- [ ] All ticket state transitions are validated server-side.
- [ ] Client-provided status values are never trusted without validation.
- [ ] Business rules are implemented in the backend rather than only in React.
- [ ] The backend does not trust client-calculated permissions or workflow state.
- [ ] Critical one-time actions are designed with idempotency where applicable.
- [ ] Race conditions are considered for concurrent ticket updates.
- [ ] Database transactions/appropriate consistency controls are used where required.

---

# 12. Data Protection

StrawCRM stores customer support information that may contain personally identifiable information.

- [ ] Customer data is protected by least-privilege database/service access.
- [ ] Database access credentials are restricted.
- [ ] Sensitive data is encrypted in transit.
- [ ] Encryption at rest is enabled through the managed infrastructure where available.
- [ ] Highly sensitive fields requiring additional protection are identified.
- [ ] Backups are secure, access-controlled, and tested where applicable.
- [ ] Data retention requirements are documented.
- [ ] Data deletion requirements are documented.
- [ ] Privacy/compliance requirements are reviewed if the product is used with regulated or highly sensitive customer data.

---

# 13. Logging & Monitoring

- [ ] Authentication events are logged if authentication exists.
- [ ] Authorization failures are logged.
- [ ] Important admin actions are logged.
- [ ] Database/application errors are logged appropriately.
- [ ] AI service failures are logged appropriately.
- [ ] Passwords are never logged.
- [ ] API keys and access tokens are never logged.
- [ ] Sensitive customer data is minimized in logs.
- [ ] Full request bodies are not logged unnecessarily.
- [ ] Centralized logging is considered for production.
- [ ] Alerts are configured for important anomalies where feasible.

Potential anomalies:

```text
Repeated failed logins
Unusual ticket access
Repeated API failures
Abnormally high AI usage
Privilege escalation attempts
Unexpected data access patterns
```

---

# 14. Infrastructure & Deployment

## Render

- [ ] Production services use secure environment variables.
- [ ] Debug/development settings are disabled.
- [ ] Only required network services are exposed.
- [ ] Administrative endpoints are not publicly exposed without protection.
- [ ] Production services are kept updated.

## Google Cloud Firestore

- [ ] Database access follows least privilege via Firebase Admin SDK.
- [ ] Service account credentials are not exposed to the frontend.
- [ ] Firestore Security Rules (`firestore.rules`) are reviewed and deployed.
- [ ] Unauthenticated or arbitrary collection reads/writes are denied by default.
- [ ] Automated point-in-time recovery and export capabilities are configured.

## Docker

If Docker is introduced:

- [ ] Container images use minimal base images.
- [ ] Images are regularly updated.
- [ ] Images are vulnerability-scanned.
- [ ] Containers do not run with unnecessary privileges.
- [ ] Unused ports are not exposed.
- [ ] Secrets are injected at runtime rather than baked into images.

---

# 15. AI Security — Gemini Integration

StrawCRM uses Gemini for optional AI ticket assistance.

- [ ] Gemini API credentials exist only on the backend.
- [ ] React never calls Gemini directly with a private API key.
- [ ] Ticket content sent to Gemini is intentionally selected.
- [ ] Sensitive data sent to the AI provider is minimized where possible.
- [ ] AI prompts do not include unnecessary secrets or credentials.
- [ ] AI output is treated as untrusted generated content.
- [ ] AI-generated responses are presented as drafts for human review.
- [ ] AI failures do not break core ticket functionality.
- [ ] AI endpoints are rate-limited.
- [ ] Unexpected or malformed AI responses are handled safely.
- [ ] Prompt injection risks are considered when ticket descriptions contain user-controlled instructions.
- [ ] The system does not automatically execute AI-generated code or commands.

---

# 16. Testing & Validation Before Launch

## Security Testing

- [ ] Automated vulnerability scanning is performed.
- [ ] OWASP ZAP or equivalent scanning is considered.
- [ ] Burp Suite or equivalent testing is considered.
- [ ] Manual security testing is performed for critical workflows.
- [ ] Threat modeling is performed at the design stage.
- [ ] Security regression tests are added for previously discovered vulnerabilities.

## Application Testing

Test at minimum:

- [ ] Invalid ticket payloads
- [ ] Missing required fields
- [ ] Invalid email
- [ ] Invalid status
- [ ] Oversized input
- [ ] Unknown ticket ID
- [ ] Unauthorized access attempts
- [ ] CORS behavior
- [ ] AI API failure
- [ ] Database failure
- [ ] Rate-limit behavior
- [ ] Search injection attempts
- [ ] XSS payload attempts
- [ ] Concurrent ticket updates

---

# 17. Ongoing Security Process

- [ ] Dependencies are periodically updated and rescanned.
- [ ] Security review is triggered for major feature releases.
- [ ] Incident response procedures are documented.
- [ ] Access permissions are periodically reviewed.
- [ ] Stale accounts/permissions are removed.
- [ ] Production secrets are rotated periodically or after suspected exposure.
- [ ] Security checklist is revisited after architecture changes.

---

# 18. StrawCRM Security Acceptance Criteria

The application is ready for production when:

### Input & API

- [ ] All API inputs are server-side validated.
- [ ] SQL/database operations are parameterized or safely abstracted.
- [ ] Invalid requests return controlled errors.
- [ ] Search/filter parameters are safely handled.

### Authentication & Authorization

- [ ] Authentication controls are implemented if enabled.
- [ ] Protected operations enforce server-side authorization.
- [ ] IDOR risks are addressed.

### Web Security

- [ ] HTTPS is enabled.
- [ ] CORS is restricted.
- [ ] Security headers are configured.
- [ ] XSS protections are in place.
- [ ] CSRF protections are in place when applicable.

### Secrets

- [ ] No secrets exist in GitHub.
- [ ] `.env` is ignored.
- [ ] Gemini API key is backend-only.
- [ ] Google Cloud Firestore credentials and service account keys are protected.
- [ ] Firebase service account key is backend-only.

### AI

- [ ] Gemini requests are backend-controlled.
- [ ] AI output is treated as untrusted.
- [ ] Prompt injection considerations are documented.
- [ ] AI failures are handled gracefully.

### Infrastructure

- [ ] Render production configuration is secure.
- [ ] Google Cloud Firestore access is restricted via Security Rules and Admin SDK.
- [ ] Debug mode is disabled.
- [ ] Logs do not expose secrets or unnecessary customer information.

### Testing

- [ ] Security tests have been completed.
- [ ] Vulnerability scanning has been performed where feasible.
- [ ] Critical findings are fixed or explicitly accepted/documented.

---

# 19. Security Review Checklist

Before submitting StrawCRM:

```text
[ ] React frontend reviewed
[ ] FastAPI backend reviewed
[ ] Google Cloud Firestore rules and indexes reviewed
[ ] Firebase Auth integration reviewed
[ ] Gemini integration reviewed
[ ] CORS reviewed
[ ] Security headers reviewed
[ ] Environment variables reviewed
[ ] .gitignore reviewed
[ ] GitHub repository searched for secrets
[ ] API validation tested
[ ] Error handling tested
[ ] Production deployment tested
[ ] Security scan completed
```

---

# 20. Reference

This checklist is based on the provided **Master Web App Security Implementation Prompt**, including its sections covering input validation, authentication, sessions, authorization, transport security, cross-site protections, security headers, secrets, dependency security, rate limiting, business logic, data protection, logging, infrastructure, testing, and ongoing security.

Cross-check the implementation against the **OWASP Top 10** and applicable platform/provider security guidance before production release.
