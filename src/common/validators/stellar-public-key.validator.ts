import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isStellarPublicKey', async: false })
export class IsStellarPublicKey implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    // Stellar public keys start with 'G' and are exactly 56 characters long
    if (!value) {
      return true; // Optional field
    }
    const stellarPublicKeyRegex = /^G[A-Z2-7]{54}$/;
    return stellarPublicKeyRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid Stellar public key (starts with G and is 56 characters)`;
  }
}
