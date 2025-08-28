import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantDomain, DomainType, DomainStatus } from '../entities/tenant-domain.entity';
import { CreateDomainDto } from '../dto/create-domain.dto';

@Injectable()
export class TenantDomainService {
  constructor(
    @InjectRepository(TenantDomain)
    private domainRepository: Repository<TenantDomain>,
  ) {}

  async create(tenantId: string, createDomainDto: CreateDomainDto): Promise<TenantDomain> {
    // Check if domain already exists
    const existing = await this.domainRepository.findOne({
      where: { domain: createDomainDto.domain },
    });

    if (existing) {
      throw new ConflictException('Domain already exists');
    }

    // Validate domain format
    if (!this.isValidDomain(createDomainDto.domain)) {
      throw new BadRequestException('Invalid domain format');
    }

    // If setting as primary, unset other primary domains
    if (createDomainDto.isPrimary) {
      await this.unsetPrimaryDomains(tenantId);
    }

    const domain = this.domainRepository.create({
      ...createDomainDto,
      tenantId,
      status: DomainStatus.PENDING,
      verificationToken: this.generateVerificationToken(),
    });

    const savedDomain = await this.domainRepository.save(domain);

    // Start domain verification process
    await this.startVerification(savedDomain.id);

    return savedDomain;
  }

  async findByTenant(tenantId: string): Promise<TenantDomain[]> {
    return this.domainRepository.find({
      where: { tenantId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<TenantDomain> {
    const domain = await this.domainRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return domain;
  }

  async findByDomain(domain: string): Promise<TenantDomain> {
    const tenantDomain = await this.domainRepository.findOne({
      where: { domain },
      relations: ['tenant'],
    });

    if (!tenantDomain) {
      throw new NotFoundException('Domain not found');
    }

    return tenantDomain;
  }

  async update(id: string, updateData: Partial<CreateDomainDto>): Promise<TenantDomain> {
    const domain = await this.findOne(id);

    // If setting as primary, unset other primary domains
    if (updateData.isPrimary && !domain.isPrimary) {
      await this.unsetPrimaryDomains(domain.tenantId);
    }

    Object.assign(domain, updateData);
    return this.domainRepository.save(domain);
  }

  async delete(id: string): Promise<void> {
    const domain = await this.findOne(id);
    
    if (domain.isPrimary) {
      throw new BadRequestException('Cannot delete primary domain');
    }

    await this.domainRepository.remove(domain);
  }

  async setPrimary(id: string): Promise<TenantDomain> {
    const domain = await this.findOne(id);

    if (domain.status !== DomainStatus.ACTIVE) {
      throw new BadRequestException('Only active domains can be set as primary');
    }

    // Unset other primary domains
    await this.unsetPrimaryDomains(domain.tenantId);

    domain.isPrimary = true;
    return this.domainRepository.save(domain);
  }

  async verify(id: string): Promise<TenantDomain> {
    const domain = await this.findOne(id);

    // Perform DNS verification
    const isVerified = await this.performDnsVerification(domain);

    if (isVerified) {
      domain.status = DomainStatus.ACTIVE;
      domain.verifiedAt = new Date();
      domain.errorMessage = null;
    } else {
      domain.status = DomainStatus.FAILED;
      domain.errorMessage = 'DNS verification failed';
    }

    domain.lastCheckedAt = new Date();
    return this.domainRepository.save(domain);
  }

  async setupSsl(id: string, certificate?: string): Promise<TenantDomain> {
    const domain = await this.findOne(id);

    if (domain.status !== DomainStatus.ACTIVE) {
      throw new BadRequestException('Domain must be active to setup SSL');
    }

    // If no certificate provided, generate Let's Encrypt certificate
    if (!certificate) {
      certificate = await this.generateLetsEncryptCertificate(domain.domain);
    }

    domain.sslEnabled = true;
    domain.sslCertificate = certificate;
    domain.sslExpiresAt = this.calculateSslExpiration();

    return this.domainRepository.save(domain);
  }

  async checkSslExpiration(): Promise<TenantDomain[]> {
    const expiringDomains = await this.domainRepository
      .createQueryBuilder('domain')
      .where('domain.sslEnabled = :enabled', { enabled: true })
      .andWhere('domain.sslExpiresAt <= :expirationDate', {
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .getMany();

    return expiringDomains;
  }

  private async unsetPrimaryDomains(tenantId: string): Promise<void> {
    await this.domainRepository.update(
      { tenantId, isPrimary: true },
      { isPrimary: false }
    );
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  private generateVerificationToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private async startVerification(domainId: string): Promise<void> {
    // This would typically queue a background job for domain verification
    // For now, we'll just update the last checked timestamp
    await this.domainRepository.update(domainId, {
      lastCheckedAt: new Date(),
    });
  }

  private async performDnsVerification(domain: TenantDomain): Promise<boolean> {
    // This would perform actual DNS verification
    // For now, returning true for subdomains and false for custom domains (to simulate pending verification)
    if (domain.type === DomainType.SUBDOMAIN) {
      return true;
    }

    // Simulate DNS verification for custom domains
    // In real implementation, this would check for TXT records or CNAME records
    return Math.random() > 0.5; // 50% success rate for demo
  }

  private async generateLetsEncryptCertificate(domain: string): Promise<string> {
    // This would integrate with Let's Encrypt or other certificate authority
    // For now, returning a placeholder certificate
    return `-----BEGIN CERTIFICATE-----
MIIFakeCertificate...
-----END CERTIFICATE-----`;
  }

  private calculateSslExpiration(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 90); // 90 days for Let's Encrypt
    return expiration;
  }
}
