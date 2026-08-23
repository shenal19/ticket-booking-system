import QRCode from 'qrcode'

/**
 * Generate a QR code containing a signed-safe ticket identifier.
 *
 * The QR does NOT contain passwords, JWTs, database credentials,
 * or other sensitive information.
 *
 * For now, the booking reference is the ticket identifier.
 * Phase 13/14 can expose a public verification endpoint that
 * resolves this reference to the booking.
 */
export async function generateTicketQr(
  bookingReference: string
): Promise<Buffer> {
  const payload = JSON.stringify({
    type: 'TICKET',
    bookingReference,
  })

  return QRCode.toBuffer(payload, {
    type: 'png',
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'M',
  })
}