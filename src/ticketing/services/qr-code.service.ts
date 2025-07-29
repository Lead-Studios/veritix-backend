import { Injectable } from "@nestjs/common"
import * as QRCode from "qrcode"
import * as crypto from "crypto"

@Injectable()
export class QrCodeService {
  private readonly secretKey = process.env.QR_SECRET_KEY || "default-secret-key-change-in-production"

  /**
   * Generate a secure QR code for a ticket
   */
  async generateQrCode(
    ticketId: string,
    eventId: string,
    purchaserId: string,
  ): Promise<{
    qrCodeData: string
    qrCodeImage: string
    secureHash: string
  }> {
    // Create secure payload
    const timestamp = Date.now()
    const payload = {
      ticketId,
      eventId,
      purchaserId,
      timestamp,
    }

    // Create secure hash
    const secureHash = this.createSecureHash(payload)

    // QR code data includes the payload and hash
    const qrCodeData = JSON.stringify({
      ...payload,
      hash: secureHash,
    })

    // Generate QR code image as base64
    const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 256,
    })

    return {
      qrCodeData,
      qrCodeImage,
      secureHash,
    }
  }

  /**
   * Verify QR code data integrity and authenticity
   */
  verifyQrCode(qrCodeData: string): {
    isValid: boolean
    payload?: any
    error?: string
  } {
    try {
      const data = JSON.parse(qrCodeData)

      if (!data.ticketId || !data.eventId || !data.purchaserId || !data.timestamp || !data.hash) {
        return {
          isValid: false,
          error: "Invalid QR code format",
        }
      }

      // Verify hash
      const payload = {
        ticketId: data.ticketId,
        eventId: data.eventId,
        purchaserId: data.purchaserId,
        timestamp: data.timestamp,
      }

      const expectedHash = this.createSecureHash(payload)

      if (data.hash !== expectedHash) {
        return {
          isValid: false,
          error: "QR code has been tampered with",
        }
      }

      // Check if QR code is not too old (24 hours max for security)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      if (Date.now() - data.timestamp > maxAge) {
        return {
          isValid: false,
          error: "QR code has expired",
        }
      }

      return {
        isValid: true,
        payload: data,
      }
    } catch (error) {
      return {
        isValid: false,
        error: "Invalid QR code data",
      }
    }
  }

  /**
   * Create a secure hash for the payload
   */
  private createSecureHash(payload: any): string {
    const dataString = JSON.stringify(payload)
    return crypto.createHmac("sha256", this.secretKey).update(dataString).digest("hex")
  }

  /**
   * Generate a unique ticket number
   */
  generateTicketNumber(eventId: string): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    const eventPrefix = eventId.substring(0, 8).toUpperCase()
    return `${eventPrefix}-${timestamp}-${random}`.toUpperCase()
  }
}
