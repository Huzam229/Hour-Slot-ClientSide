# Duemet brand assets

Processed from generated concepts (transparent PNG, light + dark variants).

| File | Use |
|------|-----|
| `/duemet-logo.png` | Main wordmark (calendar + Duemet) for **light** backgrounds |
| `/duemet-logo-white.png` | Same wordmark knockout for **dark / colored** backgrounds |
| `/duemet-mark.png` | Letter **D** monogram for **light** backgrounds |
| `/duemet-mark-white.png` | Monogram knockout for **dark / colored** backgrounds |
| `/favicon.ico`, `/favicon-16.png`, `/favicon-32.png` | Browser tab favicon (from monogram) |
| `/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | PWA / touch icons |
| `/icons/icon-maskable-512.png` | Maskable PWA icon (blue tile + white mark) |

Use `<BrandLogo variant="color"|"white" kind="wordmark"|"mark" />` in React.

Regenerate from sources:

```bash
python frontend/scripts/process_brand_logos.py
```
