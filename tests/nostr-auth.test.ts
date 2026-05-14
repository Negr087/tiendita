import { describe, it, expect } from 'vitest';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { createChallenge, verifyAuthEvent, AUTH_EVENT_KIND, npubToHex } from '../src/lib/nostr-auth';
import { nip19 } from 'nostr-tools';

describe('createChallenge', () => {
  it('returns a challenge string and timestamp', () => {
    const c = createChallenge();
    expect(c.challenge).toMatch(/^[0-9a-f]{32}$/);
    expect(c.issuedAt).toBeGreaterThan(0);
    expect(c.issuedAt).toBeLessThanOrEqual(Date.now());
  });

  it('generates unique challenges', () => {
    const a = createChallenge();
    const b = createChallenge();
    expect(a.challenge).not.toBe(b.challenge);
  });
});

describe('verifyAuthEvent', () => {
  function makeSignedEvent(challenge: string) {
    const sk = generateSecretKey();
    const pubkey = getPublicKey(sk);
    const event = finalizeEvent(
      {
        kind: AUTH_EVENT_KIND,
        content: challenge,
        tags: [
          ['challenge', challenge],
          ['u', '/api/auth/verify'],
        ],
        created_at: Math.floor(Date.now() / 1000),
      },
      sk,
    );
    return { event, pubkey };
  }

  it('accepts a properly signed event', () => {
    const { challenge } = createChallenge();
    const { event, pubkey } = makeSignedEvent(challenge);
    const result = verifyAuthEvent(event, challenge, Date.now());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pubkey).toBe(pubkey);
      expect(result.npub).toMatch(/^npub1/);
    }
  });

  it('rejects event with wrong challenge', () => {
    const { event } = makeSignedEvent('aaa');
    const result = verifyAuthEvent(event, 'bbb', Date.now());
    expect(result.ok).toBe(false);
  });

  it('rejects expired challenge', () => {
    const { challenge } = createChallenge();
    const { event } = makeSignedEvent(challenge);
    const ancientIssue = Date.now() - 10 * 60 * 1000; // 10 min ago, past 5min limit
    const result = verifyAuthEvent(event, challenge, ancientIssue);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/expirado/i);
    }
  });

  it('rejects event with wrong kind', () => {
    const sk = generateSecretKey();
    const event = finalizeEvent(
      {
        kind: 1, // text note instead of auth
        content: 'hello',
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      },
      sk,
    );
    const result = verifyAuthEvent(event, 'irrelevant', Date.now());
    expect(result.ok).toBe(false);
  });

  it('rejects event with tampered signature', () => {
    const { challenge } = createChallenge();
    const { event } = makeSignedEvent(challenge);
    const tampered = { ...event, sig: '0'.repeat(128) };
    const result = verifyAuthEvent(tampered, challenge, Date.now());
    expect(result.ok).toBe(false);
  });
});

describe('npubToHex', () => {
  it('roundtrips via nip19', () => {
    const sk = generateSecretKey();
    const pubkey = getPublicKey(sk);
    const npub = nip19.npubEncode(pubkey);
    expect(npubToHex(npub)).toBe(pubkey);
  });

  it('throws on invalid npub', () => {
    expect(() => npubToHex('not-an-npub')).toThrow();
  });
});
