import { Injectable } from '@nestjs/common';
import { SessionManagementService } from './session-management.service';
import { GeoLocationService } from './geo-location.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionTrackingService {
  constructor(
    private sessionService: SessionManagementService,
    private geoLocationService: GeoLocationService,
  ) {}

  async createSessionFromRequest(
    userId: string,
    request: any,
    loginMethod: string = 'password',
    expiresIn: string = '7d',
  ): Promise<{ jwtId: string; sessionId: string }> {
    const jwtId = uuidv4();
    const ipAddress = this.extractIPAddress(request);
    const userAgent = request.headers['user-agent'] || '';
    
    // Get geolocation data
    const geoData = await this.geoLocationService.getLocationFromIP(ipAddress);
    
    // Calculate expiration date
    const expiresAt = this.calculateExpirationDate(expiresIn);

    const sessionData: CreateSessionDto = {
      jwtId,
      ipAddress,
      userAgent,
      expiresAt,
      loginMethod,
      ...geoData,
      metadata: {
        loginTimestamp: new Date().toISOString(),
        userAgent: userAgent,
      },
    };

    const session = await this.sessionService.createSession(userId, sessionData);
    
    return {
      jwtId,
      sessionId: session.id,
    };
  }

  private extractIPAddress(request: any): string {
    // Check various headers for the real IP address
    const forwarded = request.headers['x-forwarded-for'];
    const realIP = request.headers['x-real-ip'];
    const clientIP = request.headers['x-client-ip'];
    
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (clientIP) {
      return clientIP;
    }
    
    // Fallback to connection remote address
    return request.connection?.remoteAddress || 
           request.socket?.remoteAddress || 
           request.ip || 
           '127.0.0.1';
  }

  private calculateExpirationDate(expiresIn: string): Date {
    const now = new Date();
    
    // Parse expiration string (e.g., "7d", "24h", "30m")
    const match = expiresIn.match(/^(\d+)([dhm])$/);
    if (!match) {
      // Default to 7 days if invalid format
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    let milliseconds: number;
    switch (unit) {
      case 'd':
        milliseconds = value * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        milliseconds = value * 60 * 60 * 1000;
        break;
      case 'm':
        milliseconds = value * 60 * 1000;
        break;
      default:
        milliseconds = 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }
    
    return new Date(now.getTime() + milliseconds);
  }
}
