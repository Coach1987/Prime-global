# Phase 10 Provider Adapters

Stage 1 adds interfaces only.

## Adapter interfaces
- `VideoProvider`
- `PaymentProvider`
- `AIProvider`
- `OCRProvider`
- `QRCodeScanner`
- `AttachmentScanner`
- `EmailProvider`
- `StorageProvider`
- `NotificationProvider`

## Design constraints
- No paid provider is connected in Stage 1.
- No implementation is tied to a single vendor.
- Adapters remain optional and swappable.
- External services will be wired later through these interfaces only.
