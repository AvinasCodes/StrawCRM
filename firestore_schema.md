# StrawCRM — Firestore Database Schema

Cloud Firestore is a document-oriented NoSQL database. Rather than rigid SQL tables (`CREATE TABLE`), data is organized into **Collections**, **Documents**, and **Subcollections** with defined field structures and validation.

---

## 1. Collection: `tickets`

**Path**: `/tickets/{ticket_id}`  
**Document ID**: `ticket_id` (e.g. `TKT-001`, `TKT-002`)

### Document Fields

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `ticket_id` | `string` | Unique business ticket identifier | `"TKT-001"` |
| `customer_name` | `string` | Full name of customer submitting ticket | `"Aaryan Singh"` |
| `customer_email` | `string` | Customer contact email | `"arianozleon@gmail.com"` |
| `subject` | `string` | Short topic or issue summary | `"Firestore Realtime Performance Test"` |
| `description` | `string` | Detailed issue description | `"Testing realtime instant updates with Firebase Firestore."` |
| `status` | `string` | Lifecycle status: `'Open'`, `'In Progress'`, `'Closed'` | `"Open"` |
| `attachments` | `array[map]` | Uploaded attachment metadata `{ name, url, size, type }` | `[{ "name": "doc.pdf", ... }]` |
| `created_at` | `string` / `timestamp` | UTC ISO 8601 timestamp of creation | `"2026-09-10T07:23:45.123Z"` |
| `updated_at` | `string` / `timestamp` | UTC ISO 8601 timestamp of last update | `"2026-09-10T07:25:10.456Z"` |

> **Unified Team Access Model**: StrawCRM maintains a single shared collection for all tickets. Any authenticated internal staff member has access to view, update, search, and triage all tickets. There is no per-user segregation or data siloing.

---

## 2. Subcollection: `notes`

**Path**: `/tickets/{ticket_id}/notes/{note_id}`  
**Relationship**: 1 : N (One ticket has multiple chronological notes)  
**Document ID**: Auto-generated document ID (e.g. `note_1789025530502`)

### Document Fields

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Client / document identifier | `"note_1789025530502"` |
| `note_text` | `string` | Internal agent discussion or activity note | `"Verified instant real-time note update."` |
| `author_name` | `string` | Support agent who authored the note | `"Aarav Agent"` |
| `author_email` | `string` | Email of the author | `"agent@company.com"` |
| `created_at` | `string` / `timestamp` | UTC ISO 8601 creation timestamp | `"2026-09-10T07:25:10.456Z"` |

---

## 3. Recommended Indexes

For sorting tickets by creation date within status filters:

```json
{
  "indexes": [
    {
      "collectionGroup": "tickets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 4. Firestore Security Rules

See [`firestore.rules`](file:///c:/Users/avina/PROJECTS/StrawCRM/firestore.rules) for data type enforcement and access control.
