import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
}

@Injectable()
export class GeoIpService {
  private readonly logger = new Logger(GeoIpService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'http://ip-api.com/json';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEO_IP_API_KEY');
  }

  async getLocationByIp(ipAddress: string): Promise<GeoLocation | null> {
    try {
      // Skip localhost and private IPs
      if (this.isPrivateIp(ipAddress)) {
        return this.getDefaultLocation();
      }

      const response = await axios.get(`${this.apiUrl}/${ipAddress}`, {
        params: {
          fields: 'status,country,regionName,city,lat,lon,timezone,isp',
        },
        timeout: 5000,
      });

      const data = response.data;

      if (data.status === 'success') {
        return {
          country: data.country || 'Unknown',
          region: data.regionName || 'Unknown',
          city: data.city || 'Unknown',
          latitude: data.lat || 0,
          longitude: data.lon || 0,
          timezone: data.timezone || 'UTC',
          isp: data.isp || 'Unknown',
        };
      }

      this.logger.warn(`Failed to get location for IP ${ipAddress}: ${data.message}`);
      return this.getDefaultLocation();
    } catch (error) {
      this.logger.error(`Error getting location for IP ${ipAddress}:`, error.message);
      return this.getDefaultLocation();
    }
  }

  async getLocationDistance(location1: GeoLocation, location2: GeoLocation): Promise<number> {
    if (!location1 || !location2) return 0;

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(location2.latitude - location1.latitude);
    const dLon = this.toRadians(location2.longitude - location1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(location1.latitude)) *
        Math.cos(this.toRadians(location2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  isNewLocation(currentLocation: GeoLocation, previousLocations: GeoLocation[], thresholdKm = 100): boolean {
    if (!currentLocation || !previousLocations.length) return true;

    return !previousLocations.some(prevLocation => {
      const distance = this.getLocationDistance(currentLocation, prevLocation);
      return distance <= thresholdKm;
    });
  }

  private isPrivateIp(ip: string): boolean {
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;

    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fc00:/,
      /^fe80:/,
    ];

    return privateRanges.some(range => range.test(ip));
  }

  private getDefaultLocation(): GeoLocation {
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      isp: 'Unknown',
    };
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
