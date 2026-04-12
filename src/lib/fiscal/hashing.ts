/**
 * Deterministic hashing utilities for the fiscal event chain.
 *
 * Uses the Web Crypto API (crypto.subtle) exclusively so these functions
 * work in both Node.js (Next.js API routes) and the Vercel Edge runtime.
 * Do NOT import Node's 'crypto' module here.
 */

/**
 * SHA-256 of a Buffer/Uint8Array → lowercase hex string.
 */
async function sha256hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Encode a string as UTF-8 bytes.
 */
function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

/**
 * Deterministically sort an object's keys (recursively) and serialize to JSON.
 * This guarantees the same hash regardless of insertion order.
 */
function deterministicStringify(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value)
  }
  const obj = value as Record<string, unknown>
  const sortedKeys = Object.keys(obj).sort()
  const parts = sortedKeys.map(
    key => `${JSON.stringify(key)}:${deterministicStringify(obj[key])}`,
  )
  return `{${parts.join(',')}}`
}

/**
 * Compute a SHA-256 hash of the commercial record fields.
 *
 * Pass only the fields that form the immutable commercial record:
 *   { orderId, restaurantId, lineItems, taxLines, subtotalCents, totalCents,
 *     currency, paymentMethod, occurredAt }
 *
 * @returns Lowercase hex SHA-256 string
 */
export async function computeContentHash(record: object): Promise<string> {
  const canonical = deterministicStringify(record)
  return sha256hex(encode(canonical))
}

/**
 * Compute the chain hash for this event.
 *
 * chain_hash = SHA-256(contentHash || previousChainHash)
 *
 * For the first fiscal event per restaurant, pass the literal string 'GENESIS'
 * as previousChainHash. The returned value will itself be stored as chain_hash
 * on the record and passed as previousChainHash for the next event.
 *
 * @param contentHash      The SHA-256 hex of this event's commercial record
 * @param previousChainHash  The chain_hash of the preceding event, or 'GENESIS'
 * @returns Lowercase hex SHA-256 string
 */
export async function computeChainHash(
  contentHash: string,
  previousChainHash: string,
): Promise<string> {
  return sha256hex(encode(contentHash + previousChainHash))
}
