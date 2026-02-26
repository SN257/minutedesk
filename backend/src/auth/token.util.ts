import * as crypto from 'crypto';

const TOKEN_SECRET = process.env.SESSION_SECRET || 'your-secret-key';

/**
 * Create a signed token containing the user ID.
 * Format: base64(userId):base64(hmac-signature)
 */
export function createToken(userId: string): string {
    const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url');
    const signature = crypto
        .createHmac('sha256', TOKEN_SECRET)
        .update(payload)
        .digest('base64url');
    return `${payload}.${signature}`;
}

/**
 * Verify and decode a token. Returns the userId or null if invalid.
 */
export function verifyToken(token: string): string | null {
    try {
        const [payload, signature] = token.split('.');
        if (!payload || !signature) return null;

        const expectedSig = crypto
            .createHmac('sha256', TOKEN_SECRET)
            .update(payload)
            .digest('base64url');

        if (signature !== expectedSig) return null;

        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return decoded.userId || null;
    } catch {
        return null;
    }
}
