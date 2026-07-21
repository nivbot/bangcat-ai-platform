# Production Data to AI Asset Mapping

This document is a mapping contract, not a description of the current production schema. Source table and column names remain TODO until verified.

## Mapping rules

1. Copy only fields listed in the allowlist.
2. Exclude unknown fields by default.
3. Redact phone numbers, email addresses and WeChat IDs that appear inside otherwise public text.
4. Exclude non-public media before persistence.
5. Persist a sanitized snapshot and source hash for traceability and idempotency.
6. Never persist production credentials, internal moderation notes or personal addresses.

## Cat allowlist template

| AI field | Expected source meaning | Required | Transformation | Notes |
|---|---|---:|---|---|
| `sourceId` | Stable cat identifier | Yes | String, trim | Must never be recycled |
| `name` | Public cat name | Yes | String, trim | Internal aliases excluded |
| `sex` | Public sex | No | Normalize to male/female/unknown | Supports Chinese aliases |
| `approximateAgeMonths` | Approximate age | No | Integer 0–360 | Exact birth date not required |
| `breed` | Public breed label | No | Redact embedded contacts | Free text initially |
| `coatColor` | Coat and markings | No | Redact embedded contacts | Used for visual consistency |
| `adoptionStatus` | Current public status | No | Normalize enum | Unknown blocks factual claims |
| `publicDescription` | Public profile text | No | Redact contacts | No private medical notes |
| `publicRescueStory` | Public rescue summary | No | Redact contacts | Do not include addresses |
| `publicPersonalityNotes` | Public behavior notes | No | Redact contacts | Claims later need evidence IDs |
| `sourceUpdatedAt` | Source update timestamp | Yes | ISO timestamp | Used for incremental sync |
| `isPublic` | Whether asset may be shown | Yes | Boolean | False remains internal |

## Media allowlist template

| AI field | Required | Rule |
|---|---:|---|
| `sourceMediaId` | Yes | Stable media identifier |
| `url` | Yes | HTTPS URL or future signed-object key |
| `kind` | Yes | image/video |
| `isPublic` | Yes | False is excluded |
| `usageScope` | Yes | internal_only/official_channels/partner_creators/public_mcp |
| `altText` | No | Redact contacts |

## Explicitly excluded categories

- Rescuer or adopter phone number, WeChat ID, email and home address
- Internal review or dispute notes
- Unpublished medical records
- User account identifiers not needed for public attribution
- Payment records
- Production database credentials and connection strings
- Media without confirmed usage permission
- Precise location data that could identify a person or household

## Current fixture mapping

`tests/fixtures/source-cats.json` intentionally includes fake sensitive fields to prove that the sanitizer excludes or redacts them. It contains no real person or cat record.

## TODO source verification worksheet

| Domain | Source table/view | Primary key | Updated timestamp | Approved columns | Owner |
|---|---|---|---|---|---|
| Cats | TODO | TODO | TODO | TODO | Product + backend |
| Adoption status | TODO | TODO | TODO | TODO | Operations |
| Posts | TODO | TODO | TODO | TODO | Product |
| Comments/messages | TODO | TODO | TODO | TODO | Privacy review required |
| Media | TODO | TODO | TODO | TODO | Content operations |
