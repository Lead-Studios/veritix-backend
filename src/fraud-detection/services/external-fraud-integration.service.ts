import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ExternalFraudCheck {
  provider: string;
  checkType: string;
  result: 'clear' | 'flagged' | 'blocked' | 'unknown';
  riskScore: number;
  confidence: number;
  details: Record<string, any>;
  timestamp: Date;
}

export interface FraudDatabaseQuery {
  email?: string;
  phoneNumber?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  creditCardBin?: string;
  userId?: string;
}

@Injectable()
export class ExternalFraudIntegrationService {
  private readonly logger = new Logger(ExternalFraudIntegrationService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async performComprehensiveCheck(query: FraudDatabaseQuery): Promise<ExternalFraudCheck[]> {
    try {
      this.logger.log('Performing comprehensive external fraud checks');

      const checks = await Promise.allSettled([
        this.checkMaxMind(query),
        this.checkSift(query),
        this.checkKount(query),
        this.checkEmailReputation(query.email),
        this.checkPhoneReputation(query.phoneNumber),
        this.checkIPReputation(query.ipAddress),
        this.checkDeviceReputation(query.deviceFingerprint),
        this.checkCreditCardBIN(query.creditCardBin),
      ]);

      const results = checks
        .filter(check => check.status === 'fulfilled')
        .map(check => (check as PromiseFulfilledResult<ExternalFraudCheck>).value)
        .filter(result => result !== null);

      return results;
    } catch (error) {
      this.logger.error(`Error in comprehensive fraud check: ${error.message}`, error.stack);
      return [];
    }
  }

  private async checkMaxMind(query: FraudDatabaseQuery): Promise<ExternalFraudCheck | null> {
    try {
      if (!query.ipAddress) return null;

      const apiKey = this.configService.get('MAXMIND_API_KEY');
      if (!apiKey) return null;

      const response = await firstValueFrom(
        this.httpService.post('https://minfraud.maxmind.com/minfraud/v2.0/insights', {
          device: {
            ip_address: query.ipAddress,
          },
          email: query.email ? { address: query.email } : undefined,
          billing: query.phoneNumber ? { phone_number: query.phoneNumber } : undefined,
        }, {
          auth: {
            username: apiKey,
            password: '',
          },
          timeout: 5000,
        })
      );

      const data = response.data;
      
      return {
        provider: 'maxmind',
        checkType: 'minfraud',
        result: data.risk_score > 70 ? 'blocked' : data.risk_score > 40 ? 'flagged' : 'clear',
        riskScore: data.risk_score,
        confidence: 85,
        details: {
          country: data.ip_address?.country?.iso_code,
          isp: data.ip_address?.traits?.isp,
          is_proxy: data.ip_address?.traits?.is_anonymous_proxy,
          is_satellite: data.ip_address?.traits?.is_satellite_provider,
          email_is_free: data.email?.is_free,
          email_is_high_risk: data.email?.is_high_risk,
          phone_country: data.billing_address?.country?.iso_code,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(`MaxMind check failed: ${error.message}`);
      return null;
    }
  }

  private async checkSift(query: FraudDatabaseQuery): Promise<ExternalFraudCheck | null> {
    try {
      const apiKey = this.configService.get('SIFT_API_KEY');
      if (!apiKey) return null;

      const response = await firstValueFrom(
        this.httpService.post(`https://api.sift.com/v205/events`, {
          $type: '$transaction',
          $api_key: apiKey,
          $user_id: query.userId,
          $user_email: query.email,
          $billing_address: {
            $phone: query.phoneNumber,
          },
          $browser: {
            $user_agent: 'fraud-check',
          },
          $ip: query.ipAddress,
        }, {
          timeout: 5000,
        })
      );

      // Get user score
      const scoreResponse = await firstValueFrom(
        this.httpService.get(`https://api.sift.com/v205/score/${query.userId}?api_key=${apiKey}`, {
          timeout: 5000,
        })
      );

      const score = scoreResponse.data.score * 100;

      return {
        provider: 'sift',
        checkType: 'user_score',
        result: score > 80 ? 'blocked' : score > 50 ? 'flagged' : 'clear',
        riskScore: score,
        confidence: 90,
        details: {
          reasons: scoreResponse.data.reasons || [],
          latest_decisions: scoreResponse.data.latest_decisions || [],
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(`Sift check failed: ${error.message}`);
      return null;
    }
  }

  private async checkKount(query: FraudDatabaseQuery): Promise<ExternalFraudCheck | null> {
    try {
      const merchantId = this.configService.get('KOUNT_MERCHANT_ID');
      const apiKey = this.configService.get('KOUNT_API_KEY');
      
      if (!merchantId || !apiKey) return null;

      const response = await firstValueFrom(
        this.httpService.post('https://risk.test.kount.net/workflow/detail-inquiry', {
          MERC: merchantId,
          SESS: `fraud-check-${Date.now()}`,
          IPAD: query.ipAddress,
          EMAL: query.email,
          ANID: query.userId,
          PTOK: query.deviceFingerprint,
        }, {
          headers: {
            'X-Kount-Api-Key': apiKey,
          },
          timeout: 5000,
        })
      );

      const data = response.data;
      const score = parseInt(data.SCOR) || 0;

      return {
        provider: 'kount',
        checkType: 'inquiry',
        result: data.AUTO === 'D' ? 'blocked' : data.AUTO === 'R' ? 'flagged' : 'clear',
        riskScore: score,
        confidence: 88,
        details: {
          auto_decision: data.AUTO,
          rules_triggered: data.RULES?.split(',') || [],
          geox: data.GEOX,
          country: data.COUNTRY,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(`Kount check failed: ${error.message}`);
      return null;
    }
  }

  private async checkEmailReputation(email?: string): Promise<ExternalFraudCheck | null> {
    try {
      if (!email) return null;

      const apiKey = this.configService.get('EMAILREP_API_KEY');
      if (!apiKey) return null;

      const response = await firstValueFrom(
        this.httpService.get(`https://emailrep.io/${email}`, {
          headers: {
            'Key': apiKey,
          },
          timeout: 5000,
        })
      );

      const data = response.data;
      const riskScore = data.suspicious ? 80 : data.malicious ? 95 : 20;

      return {
        provider: 'emailrep',
        checkType: 'email_reputation',
        result: data.malicious ? 'blocked' : data.suspicious ? 'flagged' : 'clear',
        riskScore,
        confidence: 75,
        details: {
          reputation: data.reputation,
          suspicious: data.suspicious,
          malicious: data.malicious,
          credentials_leaked: data.credentials_leaked,
          data_breach: data.data_breach,
          first_seen: data.first_seen,
          last_seen: data.last_seen,
          domain_reputation: data.details?.domain_reputation,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(`Email reputation check failed: ${error.message}`);
      return null;
    }
  }

  private async checkPhoneReputation(phoneNumber?: string): Promise<ExternalFraudCheck | null> {
    try {
      if (!phoneNumber) return null;

      const apiKey = this.configService.get('TWILIO_API_KEY');
      const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
      
      if (!apiKey || !accountSid) return null;

      const response = await firstValueFrom(
        this.httpService.get(
          `https://lookups.twilio.com/v2/PhoneNumbers/${phoneNumber}?Fields=caller_name,carrier,line_type_intelligence`, 
          {
            auth: {
              username: accountSid,
              password: apiKey,
            },
            timeout: 5000,
          }
        )
      );

      const data = response.data;
      const lineType = data.line_type_intelligence?.type;
      const riskScore = lineType === 'voip' ? 60 : lineType === 'prepaid' ? 40 : 20;

      return {
        provider: 'twilio',
        checkType: 'phone_reputation',
        result: riskScore > 50 ? 'flagged' : 'clear',
        riskScore,
        confidence: 80,
        details: {
          carrier: data.carrier?.name,
          line_type: lineType,
          mobile_country_code: data.carrier?.mobile_country_code,
          mobile_network_code: data.carrier?.mobile_network_code,
          caller_name: data.caller_name?.caller_name,
          caller_type: data.caller_name?.caller_type,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(`Phone reputation check failed: ${error.message}`);
      return null;
    }
  }

  private async checkIPReputation(ipAddress?: string): Promise<ExternalFraudCheck | null> {
    try {
      if (!ipAddress) return null;

      const apiKey = this.configService.get('VIRUSTOTAL_API_KEY');
      if (!apiKey) return null;

      const response = await firstValueFrom(
        this.httpService.get(`https://www.virustotal.com/vtapi/v2/ip-address/report`, {
          params: {
            apikey: apiKey,
            ip: ipAddress,
          },
          timeout: 5000,
        })
      );

      const data = response.data;
      const positives = data.detected_urls?.length || 0;
      const riskScore = Math.min(100, positives * 10);

      return {
        provider: 'virustotal',
        checkType: 'ip_reputation',
        result: riskScore > 70 ? 'blocked' : riskScore > 30 ? 'flagged' : 'clear',
        riskScore,
        confidence: 85,
        details: {
          detected_urls: data.detected_urls?.slice(0, 5) || [],
          detected_downloaded_samples: data.detected_downloaded_samples?.slice(0, 5) || [],
          country: data.country,
          as_owner: data.as_owner,
          asn: data.asn,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(`IP reputation check failed: ${error.message}`);
      return null;
    }
  }

  private async checkDeviceReputation(deviceFingerprint?: string): Promise<ExternalFraudCheck | null> {
    try {
      if (!deviceFingerprint) return null;

      // Mock device reputation check - in production, use actual device intelligence service
      const mockRiskScore = Math.floor(Math.random() * 100);
      
      return {
        provider: 'device_intelligence',
        checkType: 'device_reputation',
        result: mockRiskScore > 70 ? 'flagged' : 'clear',
        riskScore: mockRiskScore,
        confidence: 70,
        details: {
          fingerprint_hash: deviceFingerprint,
          seen_before: Math.random() > 0.5,
          associated_fraud: Math.random() > 0.8,
          bot_detection: Math.random() > 0.9,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(`Device reputation check failed: ${error.message}`);
      return null;
    }
  }

  private async checkCreditCardBIN(creditCardBin?: string): Promise<ExternalFraudCheck | null> {
    try {
      if (!creditCardBin || creditCardBin.length < 6) return null;

      const response = await firstValueFrom(
        this.httpService.get(`https://lookup.binlist.net/${creditCardBin.substring(0, 6)}`, {
          timeout: 5000,
        })
      );

      const data = response.data;
      const isPrepaid = data.prepaid === true;
      const riskScore = isPrepaid ? 50 : 20;

      return {
        provider: 'binlist',
        checkType: 'credit_card_bin',
        result: isPrepaid ? 'flagged' : 'clear',
        riskScore,
        confidence: 90,
        details: {
          scheme: data.scheme,
          type: data.type,
          brand: data.brand,
          prepaid: data.prepaid,
          country: data.country?.name,
          bank: data.bank?.name,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(`Credit card BIN check failed: ${error.message}`);
      return null;
    }
  }

  async checkGlobalFraudDatabase(query: FraudDatabaseQuery): Promise<{
    found: boolean;
    entries: Array<{
      database: string;
      matchType: string;
      riskLevel: string;
      details: Record<string, any>;
    }>;
  }> {
    try {
      // Mock global fraud database check
      // In production, this would query multiple fraud databases and watchlists
      
      const mockEntries = [];
      
      // Simulate random matches
      if (Math.random() > 0.95) {
        mockEntries.push({
          database: 'global_fraud_network',
          matchType: 'email',
          riskLevel: 'high',
          details: {
            first_seen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            fraud_type: 'payment_fraud',
            confidence: 85,
          },
        });
      }

      if (Math.random() > 0.98) {
        mockEntries.push({
          database: 'merchant_consortium',
          matchType: 'device_fingerprint',
          riskLevel: 'critical',
          details: {
            reported_by: 'multiple_merchants',
            fraud_count: 5,
            last_incident: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return {
        found: mockEntries.length > 0,
        entries: mockEntries,
      };
    } catch (error) {
      this.logger.error(`Error checking global fraud database: ${error.message}`, error.stack);
      return { found: false, entries: [] };
    }
  }

  async reportFraudToConsortium(fraudData: {
    userId: string;
    fraudType: string;
    evidence: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<boolean> {
    try {
      this.logger.log(`Reporting fraud to consortium: ${fraudData.fraudType}`);

      // Mock fraud reporting - in production, report to actual fraud consortium
      const consortiumApiKey = this.configService.get('FRAUD_CONSORTIUM_API_KEY');
      if (!consortiumApiKey) {
        this.logger.warn('Fraud consortium API key not configured');
        return false;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.logger.log('Successfully reported fraud to consortium');
      return true;
    } catch (error) {
      this.logger.error(`Error reporting fraud to consortium: ${error.message}`, error.stack);
      return false;
    }
  }

  async getProviderStatus(): Promise<Record<string, { available: boolean; latency: number }>> {
    const providers = ['maxmind', 'sift', 'kount', 'emailrep', 'twilio', 'virustotal'];
    const status: Record<string, { available: boolean; latency: number }> = {};

    for (const provider of providers) {
      try {
        const startTime = Date.now();
        
        // Mock health check - in production, make actual health check calls
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        const latency = Date.now() - startTime;
        status[provider] = { available: true, latency };
      } catch (error) {
        status[provider] = { available: false, latency: -1 };
      }
    }

    return status;
  }
}
