import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeoLocationData {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

@Injectable()
export class GeoLocationService {
  constructor(private configService: ConfigService) {}

  async getLocationFromIP(ipAddress: string): Promise<GeoLocationData> {
    try {
      // Skip geolocation for local/private IPs
      if (this.isPrivateIP(ipAddress)) {
        return {
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          timezone: 'UTC',
        };
      }

      // Use a free IP geolocation service (ip-api.com)
      const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city,timezone`);
      const data = await response.json();

      if (data.status === 'success') {
        return {
          country: data.country,
          region: data.regionName,
          city: data.city,
          timezone: data.timezone,
        };
      }
    } catch (error) {
      console.warn('Failed to get geolocation for IP:', ipAddress, error);
    }

    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'UTC',
    };
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^127\./,          // 127.0.0.0/8
      /^10\./,           // 10.0.0.0/8
      /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12
      /^192\.168\./,     // 192.168.0.0/16
      /^::1$/,           // IPv6 loopback
      /^fc00:/,          // IPv6 private
      /^fe80:/,          // IPv6 link-local
    ];

    return privateRanges.some(range => range.test(ip)) || ip === 'localhost';
  }
}
