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
| `script-src` | `'self' 'unsafe-inline' https://gc.zgo.at` | Only inline scripts + GoatCounter |
| `style-src` | `'self' 'unsafe-inline'` | Inline styles only (single-file architecture) |
| `img-src` | `'self' https:` | Allow HTTPS images |
| `connect-src` | `'self' https://agentbox.goatcounter.com` | Only GoatCounter analytics endpoint |
| `frame-ancestors` | `'none'` | Prevent clickjacking via iframe embedding |
| `base-uri` | `'self'` | Prevent base tag injection |
| `form-action` | `'self'` | Restrict form submissions |

### XSS Prevention

- **No innerHTML for user-facing content** — all dynamic chat demo content is built using `document.createElement()`, `document.createTextNode()`, and `DocumentFragment`
- `chatWindow.innerHTML = ''` is the only innerHTML usage (clearing, not setting content)
- GoatCounter script uses `crossorigin="anonymous"` attribute

### Additional Headers

- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage

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

This is a zero-dependency static site. The only external resource loaded at runtime is [GoatCounter](https://www.goatcounter.com/) — a privacy-friendly, open-source analytics tool that doesn't use cookies or collect personal data.

Dev dependencies (Jest, jsdom) are used only for testing and are not included in production builds.
