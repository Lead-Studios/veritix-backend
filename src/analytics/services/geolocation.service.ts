import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LocationData {
  country: string;
  city: string;
  state?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

export interface RegionMapping {
  [key: string]: string;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);
  
  // Region mappings for normalization
  private readonly regionMappings: RegionMapping = {
    // North America
    'US': 'North America',
    'CA': 'North America',
    'MX': 'North America',
    
    // Europe
    'GB': 'Europe',
    'DE': 'Europe',
    'FR': 'Europe',
    'IT': 'Europe',
    'ES': 'Europe',
    'NL': 'Europe',
    'BE': 'Europe',
    'CH': 'Europe',
    'AT': 'Europe',
    'SE': 'Europe',
    'NO': 'Europe',
    'DK': 'Europe',
    'FI': 'Europe',
    'PL': 'Europe',
    'CZ': 'Europe',
    'HU': 'Europe',
    'RO': 'Europe',
    'BG': 'Europe',
    'HR': 'Europe',
    'SI': 'Europe',
    'SK': 'Europe',
    'LT': 'Europe',
    'LV': 'Europe',
    'EE': 'Europe',
    'IE': 'Europe',
    'PT': 'Europe',
    'GR': 'Europe',
    
    // Asia
    'CN': 'Asia',
    'JP': 'Asia',
    'KR': 'Asia',
    'IN': 'Asia',
    'SG': 'Asia',
    'MY': 'Asia',
    'TH': 'Asia',
    'VN': 'Asia',
    'PH': 'Asia',
    'ID': 'Asia',
    'TW': 'Asia',
    'HK': 'Asia',
    
    // Africa
    'ZA': 'Africa',
    'NG': 'Africa',
    'EG': 'Africa',
    'KE': 'Africa',
    'GH': 'Africa',
    'ET': 'Africa',
    'TZ': 'Africa',
    'UG': 'Africa',
    'DZ': 'Africa',
    'MA': 'Africa',
    'TN': 'Africa',
    
    // South America
    'BR': 'South America',
    'AR': 'South America',
    'CO': 'South America',
    'PE': 'South America',
    'CL': 'South America',
    'VE': 'South America',
    'EC': 'South America',
    'BO': 'South America',
    'PY': 'South America',
    'UY': 'South America',
    
    // Oceania
    'AU': 'Oceania',
    'NZ': 'Oceania',
    'FJ': 'Oceania',
    'PG': 'Oceania',
    
    // Middle East
    'SA': 'Middle East',
    'AE': 'Middle East',
    'IL': 'Middle East',
    'TR': 'Middle East',
    'IR': 'Middle East',
    'IQ': 'Middle East',
    'JO': 'Middle East',
    'LB': 'Middle East',
    'SY': 'Middle East',
    'KW': 'Middle East',
    'QA': 'Middle East',
    'BH': 'Middle East',
    'OM': 'Middle East',
    'YE': 'Middle East',
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Normalize location data and add region classification
   */
  async normalizeLocation(locationData: Partial<LocationData>): Promise<LocationData> {
    const { country, city, state } = locationData;
    
    if (!country || !city) {
      return {
        country: country || 'Unknown',
        city: city || 'Unknown',
        region: 'Unknown',
      };
    }

    // Normalize country code to region
    const region = this.getRegionFromCountry(country);
    
    // Get coordinates if not provided
    let coordinates: { latitude?: number; longitude?: number } = { latitude: undefined, longitude: undefined };
    if (!locationData.latitude || !locationData.longitude) {
      coordinates = await this.getCoordinates(city, state, country);
    } else {
      coordinates = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      };
    }

    return {
      country: this.normalizeCountryName(country),
      city: this.normalizeCityName(city),
      state: state ? this.normalizeStateName(state) : undefined,
      region,
      ...coordinates,
    };
  }

  /**
   * Get region from country code or name
   */
  private getRegionFromCountry(country: string): string {
    // Handle common country names
    const countryMappings: { [key: string]: string } = {
      'United States': 'US',
      'USA': 'US',
      'United Kingdom': 'GB',
      'UK': 'GB',
      'Great Britain': 'GB',
      'England': 'GB',
      'Scotland': 'GB',
      'Wales': 'GB',
      'Northern Ireland': 'GB',
      'Canada': 'CA',
      'Australia': 'AU',
      'New Zealand': 'NZ',
      'Germany': 'DE',
      'France': 'FR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Switzerland': 'CH',
      'Austria': 'AT',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'Poland': 'PL',
      'Czech Republic': 'CZ',
      'Hungary': 'HU',
      'Romania': 'RO',
      'Bulgaria': 'BG',
      'Croatia': 'HR',
      'Slovenia': 'SI',
      'Slovakia': 'SK',
      'Lithuania': 'LT',
      'Latvia': 'LV',
      'Estonia': 'EE',
      'Ireland': 'IE',
      'Portugal': 'PT',
      'Greece': 'GR',
      'China': 'CN',
      'Japan': 'JP',
      'South Korea': 'KR',
      'Korea': 'KR',
      'India': 'IN',
      'Singapore': 'SG',
      'Malaysia': 'MY',
      'Thailand': 'TH',
      'Vietnam': 'VN',
      'Philippines': 'PH',
      'Indonesia': 'ID',
      'Taiwan': 'TW',
      'Hong Kong': 'HK',
      'South Africa': 'ZA',
      'Nigeria': 'NG',
      'Egypt': 'EG',
      'Kenya': 'KE',
      'Ghana': 'GH',
      'Ethiopia': 'ET',
      'Tanzania': 'TZ',
      'Uganda': 'UG',
      'Algeria': 'DZ',
      'Morocco': 'MA',
      'Tunisia': 'TN',
      'Brazil': 'BR',
      'Argentina': 'AR',
      'Colombia': 'CO',
      'Peru': 'PE',
      'Chile': 'CL',
      'Venezuela': 'VE',
      'Ecuador': 'EC',
      'Bolivia': 'BO',
      'Paraguay': 'PY',
      'Uruguay': 'UY',
      'Mexico': 'MX',
      'Saudi Arabia': 'SA',
      'United Arab Emirates': 'AE',
      'Israel': 'IL',
      'Turkey': 'TR',
      'Iran': 'IR',
      'Iraq': 'IQ',
      'Jordan': 'JO',
      'Lebanon': 'LB',
      'Syria': 'SY',
      'Kuwait': 'KW',
      'Qatar': 'QA',
      'Bahrain': 'BH',
      'Oman': 'OM',
      'Yemen': 'YE',
    };

    const countryCode = countryMappings[country] || country;
    return this.regionMappings[countryCode] || 'Other';
  }

  /**
   * Get coordinates for a location
   * In production, integrate with geocoding service like Google Maps, Mapbox, etc.
   */
  async getCoordinates(city: string, state?: string, country?: string): Promise<{ latitude?: number; longitude?: number }> {
    try {
      // This is a placeholder implementation
      // In production, you would integrate with a geocoding service
      // For now, we'll return undefined coordinates
      // Example integration with external service:
      /*
      const apiKey = this.configService.get<string>('GEOCODING_API_KEY');
      const response = await fetch(
        `https://api.geocoding-service.com/geocode?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state || '')}&country=${encodeURIComponent(country || '')}&key=${apiKey}`
      );
      const data = await response.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
      };
      */
      
      this.logger.debug(`Geocoding requested for: ${city}, ${state}, ${country}`);
      return { latitude: undefined, longitude: undefined };
    } catch (error) {
      this.logger.error(`Error geocoding location: ${error.message}`);
      return { latitude: undefined, longitude: undefined };
    }
  }

  /**
   * Normalize country name
   */
  private normalizeCountryName(country: string): string {
    return country.trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalize city name
   */
  private normalizeCityName(city: string): string {
    return city.trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalize state name
   */
  private normalizeStateName(state: string): string {
    return state.trim().replace(/\s+/g, ' ');
  }

  /**
   * Get all available regions
   */
  getAvailableRegions(): string[] {
    return [...new Set(Object.values(this.regionMappings))];
  }

  /**
   * Get countries by region
   */
  getCountriesByRegion(region: string): string[] {
    return Object.entries(this.regionMappings)
      .filter(([_, mappedRegion]) => mappedRegion === region)
      .map(([countryCode, _]) => countryCode);
  }
} 