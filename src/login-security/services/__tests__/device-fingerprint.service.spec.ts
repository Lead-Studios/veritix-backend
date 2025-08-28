import { Test, TestingModule } from '@nestjs/testing';
import { DeviceFingerprintService } from '../device-fingerprint.service';

describe('DeviceFingerprintService', () => {
  let service: DeviceFingerprintService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceFingerprintService],
    }).compile();

    service = module.get<DeviceFingerprintService>(DeviceFingerprintService);
  });

  describe('generateFingerprint', () => {
    it('should generate consistent fingerprint for same input', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      
      const fingerprint1 = service.generateFingerprint(userAgent);
      const fingerprint2 = service.generateFingerprint(userAgent);
      
      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(64); // SHA256 hash length
    });

    it('should generate different fingerprints for different inputs', () => {
      const userAgent1 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const userAgent2 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
      
      const fingerprint1 = service.generateFingerprint(userAgent1);
      const fingerprint2 = service.generateFingerprint(userAgent2);
      
      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('parseUserAgent', () => {
    it('should parse Chrome on Windows', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      const result = service.parseUserAgent(userAgent);
      
      expect(result.browser).toBe('Chrome');
      expect(result.operatingSystem).toBe('Windows 10/11');
      expect(result.deviceType).toBe('desktop');
      expect(result.deviceName).toBe('desktop - Chrome on Windows 10/11');
      expect(result.fingerprint).toBeDefined();
    });

    it('should parse Safari on macOS', () => {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      
      const result = service.parseUserAgent(userAgent);
      
      expect(result.browser).toBe('Safari');
      expect(result.operatingSystem).toBe('macOS 10.15.7');
      expect(result.deviceType).toBe('desktop');
    });

    it('should parse Firefox on Linux', () => {
      const userAgent = 'Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0';
      
      const result = service.parseUserAgent(userAgent);
      
      expect(result.browser).toBe('Firefox');
      expect(result.operatingSystem).toBe('Linux');
      expect(result.deviceType).toBe('desktop');
    });

    it('should parse mobile Chrome on Android', () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';
      
      const result = service.parseUserAgent(userAgent);
      
      expect(result.browser).toBe('Chrome');
      expect(result.operatingSystem).toBe('Android 11');
      expect(result.deviceType).toBe('mobile');
    });

    it('should parse Safari on iPhone', () => {
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
      
      const result = service.parseUserAgent(userAgent);
      
      expect(result.browser).toBe('Safari');
      expect(result.operatingSystem).toBe('iOS 14.6');
      expect(result.deviceType).toBe('mobile');
    });

    it('should parse Safari on iPad', () => {
      const userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
      
      const result = service.parseUserAgent(userAgent);
      
      expect(result.browser).toBe('Safari');
      expect(result.operatingSystem).toBe('iOS 14.6');
      expect(result.deviceType).toBe('tablet');
    });

    it('should parse Edge browser', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
      
      const result = service.parseUserAgent(userAgent);
      
      expect(result.browser).toBe('Edge');
      expect(result.operatingSystem).toBe('Windows 10/11');
      expect(result.deviceType).toBe('desktop');
    });

    it('should handle empty user agent', () => {
      const result = service.parseUserAgent('');
      
      expect(result.browser).toBe('Unknown Browser');
      expect(result.operatingSystem).toBe('Unknown OS');
      expect(result.deviceType).toBe('Unknown');
      expect(result.deviceName).toBe('Unknown Device');
    });

    it('should handle null user agent', () => {
      const result = service.parseUserAgent(null);
      
      expect(result.browser).toBe('Unknown Browser');
      expect(result.operatingSystem).toBe('Unknown OS');
      expect(result.deviceType).toBe('Unknown');
      expect(result.deviceName).toBe('Unknown Device');
    });
  });

  describe('isNewDevice', () => {
    it('should return true for new device fingerprint', () => {
      const currentFingerprint = 'new-fingerprint-123';
      const knownFingerprints = ['known-fingerprint-1', 'known-fingerprint-2'];
      
      const result = service.isNewDevice(currentFingerprint, knownFingerprints);
      
      expect(result).toBe(true);
    });

    it('should return false for known device fingerprint', () => {
      const currentFingerprint = 'known-fingerprint-1';
      const knownFingerprints = ['known-fingerprint-1', 'known-fingerprint-2'];
      
      const result = service.isNewDevice(currentFingerprint, knownFingerprints);
      
      expect(result).toBe(false);
    });

    it('should return true for empty known fingerprints array', () => {
      const currentFingerprint = 'some-fingerprint';
      const knownFingerprints = [];
      
      const result = service.isNewDevice(currentFingerprint, knownFingerprints);
      
      expect(result).toBe(true);
    });
  });
});
