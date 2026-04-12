/**
 * BrazilFiscalAdapter — NFC-e (Nota Fiscal de Consumidor Eletrônica) skeleton.
 *
 * Brazilian law mandates NFC-e (modelo 65) for all retail sales since
 * January 2026. The fiscal document must be:
 *  - Built as a signed XML document
 *  - Digitally signed with a venue-specific A1 or A3 certificate (e-CNPJ)
 *  - Transmitted to SEFAZ (Secretaria da Fazenda) of the venue's state IN
 *    REAL TIME before the receipt is legally valid
 *  - SEFAZ responds with either:
 *      cStat 100 + chNFe (44-digit chave de acesso) → AUTORIZADO
 *      cStat 4xx/2xx  + xMotivo                    → REJEITADO / DENEGADO
 *  - Records retained for 5 years (Receita Federal)
 *
 * Brazil is unique: Veno App MUST receive SEFAZ authorisation BEFORE marking
 * the order as paid. If SEFAZ rejects, the payment cannot be recorded.
 * This is why beforePaymentRecorded is the active hook here.
 *
 * Veno App is NOT currently available for Brazilian venues. This adapter
 * exists so adding Brazil support is a contained, single-file engineering task.
 *
 * ─── TODO: Implementing Brazil NFC-e compliance ───────────────────────────────
 *
 * Steps required:
 *  1. Each Brazilian venue needs:
 *       - CNPJ (company tax number) stored in fiscal_config
 *       - A1 digital certificate (PKCS#12) stored securely (not in DB —
 *         use a secrets manager or Supabase Vault)
 *       - IBGE state code to determine the correct SEFAZ endpoint
 *       - CSC (Código de Segurança do Contribuinte) for QR code generation
 *
 *  2. In beforePaymentRecorded:
 *       a. Build the NFC-e XML document (layout defined in Manual NF-e v4.01)
 *          including: emitente (emitter), destinatario (if supplied), detalhes
 *          (line items with NCM codes, CFOP, tax values), totais, pagamento.
 *       b. Sign the XML with the venue's certificate using RSA-SHA1
 *          (mandated by SEFAZ — SHA-1 is still required for NF-e despite being
 *          deprecated elsewhere).
 *       c. POST the signed XML to the state SEFAZ web service:
 *          https://nfce.{state}.gov.br/ws/NfceAutorizacao4.asmx
 *          (each state has its own URL — maintain a URL map by IBGE code)
 *       d. Parse the response:
 *          - If cStat === '100': return { approved: true, authCode: chNFe }
 *          - Otherwise: return { approved: false, reason: xMotivo }
 *
 *  3. In afterPaymentRecorded:
 *       Store the SEFAZ authorisation data and build the DANFCe (receipt)
 *       including the QR code URL, in receipt_payload.
 *
 *  4. The receipt must display the DANFE NFC-e with:
 *       - Chave de acesso (44 digits, human-readable + QR code)
 *       - URL de consulta: https://www.nfce.fazenda.sp.gov.br/consulta
 *       - Protocol number and authorisation date/time
 *
 * Libraries to consider: nfe-node (npm), or a Brazilian fiscal middleware
 * provider such as Focus NFe, Enotas, or Omie.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  FiscalAdapter,
  FiscalEventInput,
  FiscalLifecycleResult,
} from '../types'

export class BrazilFiscalAdapter implements FiscalAdapter {
  async beforePaymentRecorded(
    _event: FiscalEventInput,
  ): Promise<{ approved: boolean; authCode?: string; reason?: string }> {
    // Brazil MUST call SEFAZ here and wait for authorisation before the
    // payment can be recorded. See the TODO block above for implementation.
    throw new Error(
      'Brazil fiscal adapter (SEFAZ NFC-e) not yet implemented. ' +
      'Veno App is not currently available for Brazilian venues. ' +
      'See the TODO block in adapters/brazil.ts for implementation details.',
    )
  }

  async afterPaymentRecorded(
    _event: FiscalEventInput,
    _authCode?: string,
  ): Promise<FiscalLifecycleResult> {
    throw new Error(
      'Brazil fiscal adapter (SEFAZ NFC-e) not yet implemented. ' +
      'See adapters/brazil.ts for implementation details.',
    )
  }

  receiptFooter(_result: FiscalLifecycleResult): string {
    // TODO: format the DANFE NFC-e receipt footer with chave de acesso and
    // the SEFAZ consultation QR code URL from result.receiptPayload.
    return ''
  }

  retentionYears(): number {
    return 5
  }
}
