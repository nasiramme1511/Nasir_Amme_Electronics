/**
 * Nasir Amme Electronics — SMS Gateway Adapter
 * Location: Dire Dawa, Ethiopia
 */

export interface SmsDispatchOptions {
  recipientPhone: string;
  maskedRecipient: string;
  messageBody: string;
  correlationId: string;
}

export interface SmsDispatchResult {
  success: boolean;
  channel: 'ETHIO_TELECOM_REST' | 'LOCAL_DEV_SIMULATOR';
  status: 'ACCEPTED' | 'SIMULATED_DEV' | 'GATEWAY_UNAVAILABLE';
  messageId: string;
  dispatchedAt: Date;
  error?: string;
}

export class SmsService {
  /**
   * Dispatches an SMS message through the configured gateway.
   * If real Ethio Telecom credentials are not configured:
   * - In production: explicitly fails with GATEWAY_UNAVAILABLE (no fake success).
   * - In development: records a local simulated dispatch with correlation tracking.
   */
  static async dispatchSms(options: SmsDispatchOptions): Promise<SmsDispatchResult> {
    const apiKey = process.env.ETHIO_TELECOM_API_KEY;
    const apiSecret = process.env.ETHIO_TELECOM_API_SECRET;
    const senderId = process.env.ETHIO_TELECOM_SENDER_ID || 'AMME_ELEC';
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Production Mode: Require verified credentials
    if (apiKey && apiSecret && apiKey.trim() !== '' && !apiKey.includes('placeholder')) {
      try {
        // Real provider endpoint integration (Ethio Telecom Bulk SMS API)
        const response = await fetch('https://api.ethiotelecom.et/v1/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-Sender-ID': senderId,
            'X-Correlation-ID': options.correlationId,
          },
          body: JSON.stringify({
            to: options.recipientPhone,
            message: options.messageBody,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Gateway error');
          return {
            success: false,
            channel: 'ETHIO_TELECOM_REST',
            status: 'GATEWAY_UNAVAILABLE',
            messageId: `ERR-${Date.now()}`,
            dispatchedAt: new Date(),
            error: `Ethio Telecom Gateway rejected dispatch: ${errText}`,
          };
        }

        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          channel: 'ETHIO_TELECOM_REST',
          status: 'ACCEPTED',
          messageId: data.messageId || `ET-${Date.now()}`,
          dispatchedAt: new Date(),
        };
      } catch (err: unknown) {
        return {
          success: false,
          channel: 'ETHIO_TELECOM_REST',
          status: 'GATEWAY_UNAVAILABLE',
          messageId: `ERR-${Date.now()}`,
          dispatchedAt: new Date(),
          error: err instanceof Error ? err.message : 'Network failure communicating with SMS gateway.',
        };
      }
    }

    // 2. Production with missing credentials: Never fake success
    if (isProduction) {
      return {
        success: false,
        channel: 'ETHIO_TELECOM_REST',
        status: 'GATEWAY_UNAVAILABLE',
        messageId: `NO-GW-${Date.now()}`,
        dispatchedAt: new Date(),
        error: 'Ethio Telecom SMS gateway credentials are not configured for production environment.',
      };
    }

    // 3. Local Development Simulation: Record simulated delivery without printing secrets
    return {
      success: true,
      channel: 'LOCAL_DEV_SIMULATOR',
      status: 'SIMULATED_DEV',
      messageId: `DEV-SMS-${Date.now()}`,
      dispatchedAt: new Date(),
    };
  }
}
