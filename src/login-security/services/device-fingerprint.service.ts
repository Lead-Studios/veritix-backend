import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

export interface DeviceInfo {
  fingerprint: string;
  deviceType: string;
  browser: string;
  operatingSystem: string;
  deviceName: string;
}

@Injectable()
export class DeviceFingerprintService {
  generateFingerprint(userAgent: string, additionalData?: Record<string, any>): string {
    const data = {
      userAgent: userAgent || '',
      ...additionalData,
    };

    const dataString = JSON.stringify(data);
    return createHash('sha256').update(dataString).digest('hex');
  }

  parseUserAgent(userAgent: string): DeviceInfo {
    if (!userAgent) {
      return this.getUnknownDevice();
    }

    const deviceType = this.detectDeviceType(userAgent);
    const browser = this.detectBrowser(userAgent);
    const operatingSystem = this.detectOperatingSystem(userAgent);
    const fingerprint = this.generateFingerprint(userAgent);
    const deviceName = this.generateDeviceName(deviceType, browser, operatingSystem);

    return {
      fingerprint,
      deviceType,
      browser,
      operatingSystem,
      deviceName,
    };
  }

  isNewDevice(currentFingerprint: string, knownFingerprints: string[]): boolean {
    return !knownFingerprints.includes(currentFingerprint);
  }

  private detectDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    if (ua.includes('smart-tv') || ua.includes('tv')) {
      return 'tv';
    }
    return 'desktop';
  }

  private detectBrowser(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('edg')) {
      return 'Chrome';
    }
    if (ua.includes('firefox')) {
      return 'Firefox';
    }
    if (ua.includes('safari') && !ua.includes('chrome')) {
      return 'Safari';
    }
    if (ua.includes('edg')) {
      return 'Edge';
    }
    if (ua.includes('opera') || ua.includes('opr')) {
      return 'Opera';
    }
    if (ua.includes('msie') || ua.includes('trident')) {
      return 'Internet Explorer';
    }
    return 'Unknown Browser';
  }

  private detectOperatingSystem(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('windows nt 10')) {
      return 'Windows 10/11';
    }
    if (ua.includes('windows nt 6.3')) {
      return 'Windows 8.1';
    }
    if (ua.includes('windows nt 6.2')) {
      return 'Windows 8';
    }
    if (ua.includes('windows nt 6.1')) {
      return 'Windows 7';
    }
    if (ua.includes('windows')) {
      return 'Windows';
    }
    if (ua.includes('mac os x')) {
      const match = ua.match(/mac os x ([\d_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `macOS ${version}`;
      }
      return 'macOS';
    }
    if (ua.includes('linux')) {
      return 'Linux';
    }
    if (ua.includes('android')) {
      const match = ua.match(/android ([\d.]+)/);
      if (match) {
        return `Android ${match[1]}`;
      }
      return 'Android';
    }
    if (ua.includes('iphone') || ua.includes('ipad')) {
      const match = ua.match(/os ([\d_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `iOS ${version}`;
      }
      return 'iOS';
    }
    return 'Unknown OS';
  }

  private generateDeviceName(deviceType: string, browser: string, operatingSystem: string): string {
    return `${deviceType} - ${browser} on ${operatingSystem}`;
  }

  private getUnknownDevice(): DeviceInfo {
    return {
      fingerprint: this.generateFingerprint('unknown'),
      deviceType: 'Unknown',
      browser: 'Unknown Browser',
      operatingSystem: 'Unknown OS',
      deviceName: 'Unknown Device',
    };
  }
}
