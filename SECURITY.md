# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email [online.saurav@gmail.com](mailto:online.saurav@gmail.com) with details
3. Include steps to reproduce, impact assessment, and suggested fix if possible

You should receive a response within 48 hours.

## Security Measures

### Content Security Policy (CSP)

The site uses a strict CSP via `<meta>` tag:

| Directive | Value | Purpose |
|---|---|---|
| `default-src` | `'self'` | Block all external resources by default |
| `script-src` | `'self'` | Only own scripts (GoatCounter is vendored locally) |
| `style-src` | `'self'` | Own stylesheets only |
| `img-src` | `'self'` | Own images only (no external tracking pixels) |
| `connect-src` | `'self' https://agentbox.goatcounter.com` | Only GoatCounter analytics endpoint |
| `frame-ancestors` | `'none'` | Prevent clickjacking via iframe embedding |
| `base-uri` | `'self'` | Prevent base tag injection |
| `form-action` | `'self'` | Restrict form submissions |

### XSS Prevention

- **No innerHTML for user-facing content** - all dynamic chat demo content is built using `document.createElement()`, `document.createTextNode()`, and `DocumentFragment`
- `chatWindow.innerHTML = ''` is the only innerHTML usage (clearing, not setting content)

### Third-Party Script Vendoring

GoatCounter analytics (`count.js`) is vendored locally under `vendor/` rather than loaded from the external CDN (`gc.zgo.at`). This eliminates CDN compromise as an attack vector and removes the need for external domains in `script-src`. The vendored script can be updated by re-downloading from <https://gc.zgo.at/count.js> and verifying the source.

### Additional Headers

- `X-Content-Type-Options: nosniff` - prevents MIME-type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - limits referrer leakage
- `Permissions-Policy` - disables camera, microphone, geolocation, payment, USB, and FLoC on all pages

### Docker Security

The production Dockerfile follows security best practices:

- Multi-stage build (no build tools in final image)
- Non-root user (`nginx` user)
- Read-only where possible
- Health check configured
- Minimal image footprint

## Supported Versions

| Version | Supported |
|---|---|
| Latest (GitHub Pages) | ✅ |
| Docker `latest` | ✅ |

## Dependencies

This is a zero-dependency static site. GoatCounter analytics (`vendor/count.js`) is vendored locally from [GoatCounter](https://www.goatcounter.com/) — a privacy-friendly, open-source analytics tool that doesn't use cookies or collect personal data. No external scripts are loaded at runtime.

Dev dependencies (Jest, jsdom) are used only for testing and are not included in production builds.
