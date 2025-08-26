import { PartialType } from '@nestjs/swagger';
import { CreatePricingRuleDto } from './create-pricing-rule.dto';

export class UpdatePricingRuleDto extends PartialType(CreatePricingRuleDto) {}
