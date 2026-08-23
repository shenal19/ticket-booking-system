import nodemailer from 'nodemailer'
import { env } from '../config/env'

interface TicketEmailData {
  customerEmail: string
  customerName?: string
  bookingReference: string
  showId: string
  totalAmount: string
  seats: {
    rowLabel: string
    seatNumber: number
    category: string
    price: string
  }[]
  qrCode: Buffer
}

function getTransporter(): nodemailer.Transporter | null {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.password) {
    return null
  }

  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.password,
    },
  })
}

export async function sendTicketEmail(
  data: TicketEmailData
): Promise<void> {
  const customerName = data.customerName ?? 'Customer'

  const transporter = getTransporter()
  if (!transporter) {
    console.log(
      `[EmailService (Simulation)] Confirmation email with QR ticket for ${data.bookingReference} dispatched to ${data.customerEmail}`
    )
    return
  }

  const seatRows = data.seats
    .map(
      (seat) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #ddd;">
            ${seat.rowLabel}
          </td>
          <td style="padding:8px;border-bottom:1px solid #ddd;">
            ${seat.seatNumber}
          </td>
          <td style="padding:8px;border-bottom:1px solid #ddd;">
            ${seat.category}
          </td>
          <td style="padding:8px;border-bottom:1px solid #ddd;">
            $${seat.price}
          </td>
        </tr>
      `
    )
    .join('')

  await transporter.sendMail({
    from: env.smtp.from,
    to: data.customerEmail,
    subject: `Your Ticket - ${data.bookingReference}`,

    html: `
      <!DOCTYPE html>
      <html>
        <body style="
          margin:0;
          padding:20px;
          font-family:Arial,sans-serif;
          background:#f5f5f5;
        ">
          <div style="
            max-width:600px;
            margin:auto;
            background:white;
            padding:30px;
            border-radius:10px;
          ">

            <h1>Ticket Booking Confirmation</h1>

            <p>Hello ${customerName},</p>

            <p>
              Your booking has been successfully confirmed.
            </p>

            <hr />

            <h2>Booking Details</h2>

            <p>
              <strong>Booking Reference:</strong>
              ${data.bookingReference}
            </p>

            <p>
              <strong>Show ID:</strong>
              ${data.showId}
            </p>

            <p>
              <strong>Total Amount:</strong>
              ₹${data.totalAmount}
            </p>

            <h2>Seats</h2>

            <table
              style="
                width:100%;
                border-collapse:collapse;
              "
            >
              <thead>
                <tr>
                  <th style="padding:8px;text-align:left;">
                    Row
                  </th>
                  <th style="padding:8px;text-align:left;">
                    Seat
                  </th>
                  <th style="padding:8px;text-align:left;">
                    Category
                  </th>
                  <th style="padding:8px;text-align:left;">
                    Price
                  </th>
                </tr>
              </thead>

              <tbody>
                ${seatRows}
              </tbody>
            </table>

            <div style="
              text-align:center;
              margin-top:30px;
            ">
              <h2>Your Ticket QR</h2>

              <img
                src="cid:ticket-qr"
                alt="Ticket QR Code"
                width="300"
                height="300"
              />

              <p>
                Present this QR code at the venue.
              </p>
            </div>

            <hr />

            <p style="
              color:#777;
              font-size:12px;
            ">
              This is an automated email from the
              Ticket Booking System.
            </p>

          </div>
        </body>
      </html>
    `,

    attachments: [
      {
        filename: `${data.bookingReference}.png`,
        content: data.qrCode,
        contentType: 'image/png',
        cid: 'ticket-qr',
      },
    ],
  })
}