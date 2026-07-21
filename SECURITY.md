# Security and Privacy Policy

Do not open a public Issue containing secrets, credentials, personal data, private media URLs, access tokens, database dumps, or exploitable production details.

## High-risk areas

- access to `catnote_prod` and `ai_public_*` views;
- tenant isolation;
- internal service authentication;
- MySQL credentials and migrations;
- Redis and BullMQ job payloads;
- Tencent COS permissions and signed URLs;
- model prompts or outputs containing personal data;
- logs, traces and exported content packages.

## Mandatory rules

- Never commit `.env` files or real secrets.
- AI database credentials must not grant write access to the legacy business database.
- Source credentials must be SELECT-only and limited to approved views.
- Do not log raw authorization headers, secrets, phone numbers, identity documents, WeChat identifiers, or private media URLs.
- Security-sensitive changes require independent review and explicit verification evidence.
- Suspected exposure must trigger credential rotation, access review, log review and impact assessment.

Report sensitive issues privately to the repository owner with the affected component, reproduction, impact, evidence with secrets removed, and immediate mitigation suggestions.
