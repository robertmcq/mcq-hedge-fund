# Kalshi Integration

Aligned with Kalshi REST API v2 (`/trade-api/v2`).

## Auth

Every authenticated request must carry three headers:

```
KALSHI-ACCESS-KEY        — your API Key ID (from KALSHI_API_KEY_ID env var)
KALSHI-ACCESS-TIMESTAMP  — current time in milliseconds since Unix epoch
KALSHI-ACCESS-SIGNATURE  — base64url( RSA-PSS-SHA256( timestamp + METHOD + path ) )
```

The signed string is `timestamp_ms + METHOD_UPPERCASE + path` where path excludes query parameters.

## Config

```
KALSHI_BASE_URL=https://external-api.demo.kalshi.co  # or prod URL
KALSHI_API_KEY_ID=your-key-id
KALSHI_PRIVATE_KEY_PEM=<injected by secret manager>   # preferred
# OR
KALSHI_PRIVATE_KEY_PATH=/run/secrets/kalshi_private_key.pem
```

## Key rotation

If your private key was ever shared, exported, or transmitted outside your secret manager, **revoke and regenerate it immediately** in the Kalshi dashboard before any API calls.
