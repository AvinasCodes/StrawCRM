#!/usr/bin/env python3
"""
Seed script to generate exactly 50 realistic, high-fidelity dummy tickets for StrawCRM
with multiple repeated customers across various priorities, categories, and statuses.
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"
DB_FILE = DATA_DIR / "tickets_db.json"
FRONTEND_TARGET = Path(__file__).resolve().parent.parent / "Frontend" / "src" / "services" / "dummyTickets.json"

NOW = datetime.now(timezone.utc)

CUSTOMERS = [
    {
        "customer_id": "CUST-001",
        "name": "Avinash Singh",
        "email": "avinash.singh@gmail.com",
    },
    {
        "customer_id": "CUST-002",
        "name": "Aaryan Singh",
        "email": "arianozleon@gmail.com",
    },
    {
        "customer_id": "CUST-004",
        "name": "Priya Sharma",
        "email": "priya.sharma@techcorp.io",
    },
    {
        "customer_id": "CUST-005",
        "name": "Marcus Vance",
        "email": "marcus.vance@apexlogistics.com",
    },
    {
        "customer_id": "CUST-006",
        "name": "Elena Rostova",
        "email": "elena.r@nordicscale.com",
    },
    {
        "customer_id": "CUST-007",
        "name": "David Chen",
        "email": "dchen@quantumcloud.net",
    },
    {
        "customer_id": "CUST-008",
        "name": "Aisha Patel",
        "email": "aisha.patel@fintechflow.com",
    },
    {
        "customer_id": "CUST-009",
        "name": "Liam O'Connor",
        "email": "liam@dublindata.ie",
    },
    {
        "customer_id": "CUST-010",
        "name": "Sophia Martinez",
        "email": "sophia.m@solaris.co",
    },
    {
        "customer_id": "CUST-011",
        "name": "Kenji Sato",
        "email": "kenji.sato@tokyodrive.jp",
    },
    {
        "customer_id": "CUST-012",
        "name": "Sarah Jenkins",
        "email": "sarah.j@horizonhealth.org",
    },
    {
        "customer_id": "CUST-013",
        "name": "Mateo Rossi",
        "email": "mateo.rossi@milanoitalia.it",
    },
    {
        "customer_id": "CUST-014",
        "name": "Fatima Al-Mansoor",
        "email": "fatima@gulflogistics.ae",
    },
    {
        "customer_id": "CUST-015",
        "name": "Carlos Mendez",
        "email": "carlos@bogotacoffee.co",
    },
    {
        "customer_id": "CUST-016",
        "name": "Hanna Lindqvist",
        "email": "hanna@stockholmventures.se",
    },
    {
        "customer_id": "CUST-017",
        "name": "Amara Okafor",
        "email": "amara@lagostech.ng",
    },
]

# 50 Distinct Ticket Specifications mapped across repeated customers
TICKET_SPECS = [
    # Customer 1: Avinash Singh (5 tickets)
    (0, "Production Webhook delivery failures on EU endpoint", "We are observing intermittent 504 timeouts when our event listeners receive webhook payloads from the Frankfurt gateway cluster.", "Technical Support", "Urgent", "Open", 0.5),
    (0, "Request for higher API rate limit on Enterprise tier", "Our automated sync pipeline regularly bursts above 1,000 req/min during 9 AM UTC peaks. Requesting rate limit increase to 2,500 req/min.", "Integration & API", "Medium", "In Progress", 2),
    (0, "Need consolidated tax invoice for quarterly renewal", "Please provide GST and VAT compliant consolidated invoice for Q3 enterprise licensing with our registered billing entity address.", "Billing & Invoicing", "Low", "Closed", 15),
    (0, "SSO SAML authentication loop with Okta identity provider", "Several developers report infinite redirect loops when signing into StrawCRM using our corporate Okta SAML 2.0 app integration.", "Account & Security", "High", "Open", 1),
    (0, "Custom domain SSL certificate renewal verification", "Our custom portal subdomain support.avinash.com needs DNS TXT record verification for Let's Encrypt automated certificate rotation.", "Technical Support", "Medium", "Closed", 28),

    # Customer 2: Aaryan Singh (4 tickets)
    (1, "Realtime data streaming latency in mobile app dashboard", "The ticket counter updates on iOS client lag by up to 45 seconds compared to web browser socket listener.", "Technical Support", "High", "In Progress", 0.8),
    (1, "User permission matrix not updating for newly invited agents", "Invited agents with 'Support Specialist' role cannot access closed ticket history until session is cleared.", "Account & Security", "Medium", "Open", 3),
    (1, "Export to CSV timeout on large customer dataset", "Exporting historical tickets for over 50,000 records times out after 60 seconds with gateway 504 error.", "Feature Request", "Medium", "Closed", 18),
    (1, "Billing currency change from USD to INR preference", "Need to change billing recurring payment method to localized INR credit card processing via Stripe.", "Billing & Invoicing", "Low", "Closed", 40),

    # Customer 3: Priya Sharma (4 tickets)
    (2, "Intermittent 502 Bad Gateway during automated batch export", "Our nightly cron job hit 502 Bad Gateway errors three times this week during customer dossier sync at 02:00 UTC.", "Technical Support", "Urgent", "Open", 0.2),
    (2, "Webhook signature verification failing with HMAC-SHA256", "The header 'x-strawcrm-signature' does not match the computed digest using our shared secret key on API v2.4.", "Integration & API", "High", "In Progress", 4),
    (2, "Add 15 additional seats to Enterprise workspace", "We expanded our Tier-1 customer support team and need 15 additional user licenses added to our workspace subscription.", "Billing & Invoicing", "Low", "Closed", 12),
    (2, "Custom webhook retry backoff policy configuration", "Would like to configure exponential backoff retry policy (1m, 5m, 15m, 1h) instead of the default linear 3 attempts.", "Feature Request", "Medium", "Closed", 35),

    # Customer 4: Marcus Vance (4 tickets)
    (3, "GraphQL query response time degradation on /orders endpoint", "Average response latency for querying customer orders expanded from 120ms to 980ms following yesterday's release.", "Technical Support", "High", "Open", 1.2),
    (3, "Two-Factor authentication backup code recovery", "Administrator phone was wiped; emergency 2FA backup codes generated during setup are needed to restore master access.", "Account & Security", "Urgent", "Closed", 6),
    (3, "Duplicate invoice charges for August subscription cycle", "Our bank statement indicates two identical charges of $1,490 on August 1st. Please reconcile and issue a credit memo.", "Billing & Invoicing", "High", "Closed", 22),
    (3, "Bulk shipping label tracking integration API error", "Tracking numbers returned by webhook payload contain trailing whitespace causing shipment carrier lookups to fail.", "Technical Support", "Medium", "In Progress", 5),

    # Customer 5: Elena Rostova (3 tickets)
    (4, "Dark mode layout shift in Ticket Detail modal header", "Opening ticket details modal on 1440p displays causes rubber stamp badge to slightly overlap action menu buttons in dark theme.", "Bug Report", "Low", "In Progress", 2.5),
    (4, "Automated SLA breach escalation rules not triggering SMS alerts", "Tickets marked Urgent that remain unassigned past 15 minutes are not sending PagerDuty or SMS alert notifications.", "Technical Support", "High", "Open", 0.4),
    (4, "Annual subscription renewal contract signed and executed", "Signed enterprise agreement uploaded for FY27. Please apply corporate volume discount to next invoice cycle.", "Billing & Invoicing", "Low", "Closed", 45),

    # Customer 6: David Chen (3 tickets)
    (5, "Memory leak observed on background ticket polling worker", "Worker container memory steadily climbs by 200MB every 6 hours until OOM killed by Kubernetes scheduler.", "Technical Support", "Urgent", "In Progress", 1.5),
    (5, "Update primary corporate credit card on billing profile", "Need to replace expiring Visa ending in 4092 with new corporate Mastercard ending in 8812.", "Billing & Invoicing", "Low", "Closed", 10),
    (5, "GDPR compliance data export for annual privacy audit", "Please generate comprehensive machine-readable archive of all customer data associated with tenant quantumcloud.net.", "Account & Security", "Medium", "Open", 7),

    # Customer 7: Aisha Patel (3 tickets)
    (6, "PCI-DSS compliance checklist verification for payment forms", "Our security auditors require confirmation that ticket attachment inputs sanitize credit card PANs before saving.", "Account & Security", "High", "Open", 0.7),
    (6, "Audit log streaming integration with Datadog Logstash", "Requesting direct Syslog or HTTPS streaming connector to pipe StrawCRM admin access logs to corporate SIEM.", "Integration & API", "Medium", "Closed", 16),
    (6, "Payment gateway webhook payload schema deprecation notice", "Stripe API migration requires updating the source charge event handler before the November 2026 cutoff date.", "Technical Support", "High", "In Progress", 3.5),

    # Customer 8: Liam O'Connor (3 tickets)
    (7, "Customer search index not updating immediately after creation", "Newly registered customers do not show in ticket creation autocomplete until roughly 10 minutes later.", "Technical Support", "Medium", "Open", 2.1),
    (7, "REST API v2 migration assistance for CRM bi-directional sync", "Need review of our Python SDK integration script syncing customer contact details with internal Salesforce database.", "Integration & API", "Medium", "Closed", 25),
    (7, "Request team onboarding training webinar for support leads", "Would like to schedule a 45-minute walkthrough for 12 new support tier leads on retro ticket workflows.", "Feature Request", "Low", "Closed", 50),

    # Customer 9: Sophia Martinez (3 tickets)
    (8, "Ticket attachment upload failing for PDF files over 5MB", "Attempting to upload a 6.2MB diagnostic diagnostic log bundle throws 'File size exceeds maximum payload limit'.", "Technical Support", "High", "In Progress", 1.1),
    (8, "Incorrect timezone rendering on retro barcode receipts", "Barcode stamp date displays UTC timestamps instead of localized agent time configured in user settings.", "Bug Report", "Low", "Closed", 14),
    (8, "Request staging sandbox test environment credentials", "Need staging tenant API keys to test automated customer ticket creation before deploying to live users.", "Account & Security", "Medium", "Open", 4.2),

    # Customer 10: Kenji Sato (3 tickets)
    (9, "Japanese character encoding issue in automated email receipts", "Kanji characters in ticket subject lines render as garbled question marks (???) in customer confirmation emails.", "Bug Report", "Medium", "Open", 0.9),
    (9, "API endpoint latency degradation from ap-northeast-1 region", "Round-trip ping to StrawCRM API servers from Tokyo region averages 340ms; requesting CDN edge caching.", "Technical Support", "High", "In Progress", 5.5),
    (9, "Upgrade tier to Dedicated Infrastructure cluster", "Enterprise growth requires dedicated PostgreSQL and Firestore tenancy with 99.99% uptime guarantee.", "Billing & Invoicing", "Low", "Closed", 30),

    # Customer 11: Sarah Jenkins (3 tickets)
    (10, "HIPAA compliance BAA agreement execution review", "Legal team has completed review of StrawCRM Business Associate Agreement; please countersign and return PDF.", "Account & Security", "Urgent", "Closed", 8),
    (10, "Patient ticket notes encryption verification protocol", "Need confirmation that internal team notes are encrypted at rest using AES-256 before storing in database.", "Technical Support", "High", "Open", 1.8),
    (10, "Automated ticket routing by clinic regional department", "Requesting custom routing rule based on ticket tags ('Cardiology', 'Pediatrics', 'Oncology') to respective queues.", "Feature Request", "Medium", "In Progress", 6.5),

    # Customer 12: Mateo Rossi (3 tickets)
    (11, "SEPA direct debit mandate processing delay", "Bank transfer for monthly invoice INV-2026-892 shows pending in banking portal for 4 business days.", "Billing & Invoicing", "Medium", "Open", 2.8),
    (11, "Multi-language customer auto-responder setup assistance", "Need guidance on configuring Italian and Spanish localized automated reply templates based on customer locale.", "Feature Request", "Low", "Closed", 20),
    (11, "Session timeout unexpectedly logging out active agents", "Agents report being redirected to login screen after 15 minutes of inactivity despite 8-hour session preference.", "Technical Support", "High", "In Progress", 4.8),

    # Customer 13: Fatima Al-Mansoor (3 tickets)
    (12, "Shipment tracking webhook intermittent socket disconnects", "Courier delivery webhooks dropping approximately 4% of updates during evening container transit hours.", "Technical Support", "Urgent", "Open", 0.3),
    (12, "VAT invoice regeneration with corporate TRN number", "Please reissue invoice #4081 with United Arab Emirates Tax Registration Number TRN 100293847200003.", "Billing & Invoicing", "Low", "Closed", 11),
    (12, "Role-based access control for regional warehouse dispatchers", "Need restricted agent role that permits updating shipment ticket status without access to customer billing details.", "Account & Security", "Medium", "Closed", 38),

    # Customer 14: Carlos Mendez (2 tickets)
    (13, "Mobile responsive layout overflow on iPhone 15 Pro", "Customer ticket history panel cards extend 20px past right screen edge when viewing in portrait mode Safari.", "Bug Report", "Low", "Open", 1.9),
    (13, "Subscription discount code expired prematurely", "Promo voucher code 'SUMMER2026' failed to apply at checkout prior to the advertised midnight expiration.", "Billing & Invoicing", "Medium", "Closed", 17),

    # Customer 15: Hanna Lindqvist (2 tickets)
    (14, "Custom reporting metric discrepancies on executive dashboard", "Average First Response Time widget displays 12m on dashboard but CSV export calculates 19m for same period.", "Technical Support", "Medium", "In Progress", 3.2),
    (14, "Feature request: Scheduled automated weekly PDF report export", "Requesting email delivery of weekly SLA compliance and resolution velocity report every Monday at 08:00.", "Feature Request", "Low", "Open", 9),

    # Customer 16: Amara Okafor (2 tickets)
    (15, "Two-step verification SMS OTP delivery delay on MTN network", "Support staff in Lagos office experiencing up to 8-minute delays receiving SMS verification login codes.", "Account & Security", "High", "In Progress", 2.2),
    (15, "Bulk customer account merge tool feature request", "Requesting ability to merge duplicate customer profiles created with different personal and corporate email domains.", "Feature Request", "Low", "Open", 13),
]

def generate_tickets():
    # Load existing tickets
    existing_db = {}
    if DB_FILE.exists():
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                existing_db = json.load(f)
        except Exception as e:
            print("Notice loading existing DB:", e)

    # Determine starting ID
    start_num = 1
    generated_tickets = []

    # Format 50 tickets
    for idx, spec in enumerate(TICKET_SPECS):
        cust_idx, subject, description, category, priority, status, days_ago = spec
        cust = CUSTOMERS[cust_idx]
        
        ticket_num = idx + 1
        ticket_id = f"TKT-{ticket_num:03d}"
        
        created_dt = NOW - timedelta(days=days_ago)
        updated_dt = created_dt + timedelta(hours=2) if status != "Open" else created_dt
        
        created_str = created_dt.isoformat()
        updated_str = updated_dt.isoformat()
        
        # Sample notes for tickets in progress or closed
        notes = []
        if status in ("In Progress", "Closed"):
            notes.append({
                "id": f"note_{ticket_id}_1",
                "note_text": f"Investigating customer report regarding: {subject}. Log review initiated.",
                "author_name": "Support Agent",
                "author_email": "agent@strawcrm.com",
                "created_at": (created_dt + timedelta(minutes=25)).isoformat(),
            })
        if status == "Closed":
            notes.append({
                "id": f"note_{ticket_id}_2",
                "note_text": f"Resolved inquiry. Verified operational metrics and customer confirmed resolution.",
                "author_name": "Senior Operations Lead",
                "author_email": "operations@strawcrm.com",
                "created_at": updated_str,
            })

        t_obj = {
            "ticket_id": ticket_id,
            "customer_id": cust["customer_id"],
            "raised_by_name": "Support Agent" if idx % 2 == 0 else cust["name"],
            "raised_by_user_id": "usr_dev" if idx % 2 == 0 else f"usr_{cust['customer_id'].lower()}",
            "customer_name": cust["name"],
            "customer_email": cust["email"],
            "subject": subject,
            "description": description,
            "category": category,
            "priority": priority,
            "status": status,
            "created_at": created_str,
            "updated_at": updated_str,
            "attachments": [],
            "notes": notes,
        }

        # Keep existing attachments if preserving TKT-001..003
        if ticket_id in existing_db and existing_db[ticket_id].get("attachments"):
            t_obj["attachments"] = existing_db[ticket_id]["attachments"]

        generated_tickets.append(t_obj)

    # Save to Backend tickets_db.json
    db_dict = {t["ticket_id"]: t for t in generated_tickets}
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db_dict, f, indent=2)
    print(f"Successfully wrote {len(db_dict)} tickets to {DB_FILE}")

    # Save to Frontend dummyTickets.json (array format for frontend stores)
    FRONTEND_TARGET.parent.mkdir(parents=True, exist_ok=True)
    with open(FRONTEND_TARGET, "w", encoding="utf-8") as f:
        json.dump(generated_tickets, f, indent=2)
    print(f"Successfully wrote {len(generated_tickets)} tickets to {FRONTEND_TARGET}")

if __name__ == "__main__":
    generate_tickets()
