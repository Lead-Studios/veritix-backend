import { Injectable } from '@nestjs/common';

interface DisclosureEntry {
  jurisdictions: string[];   // ISO-3166-1 alpha-2 country codes
  text: string;
}

/**
 * Returns the correct regulatory disclosure text for a given jurisdiction.
 *
 * Extend the DISCLOSURES map as you expand to new markets. A null jurisdiction
 * falls back to the GLOBAL disclosure so every quote always carries a disclosure.
 */
@Injectable()
export class RegulatoryDisclosureService {
  private readonly DISCLOSURES: DisclosureEntry[] = [
    {
      jurisdictions: ['NG'],
      text:
        'This transaction is subject to the CBN Foreign Exchange (Monitoring and ' +
        'Miscellaneous Provisions) Act. Exchange rates are indicative and may differ ' +
        'from the official CBN mid-rate. All transactions are reported to the CBN in ' +
        'accordance with the Anti-Money Laundering Act.',
    },
    {
      jurisdictions: ['GB'],
      text:
        'NexaFx is authorised by the Financial Conduct Authority (FCA) as an ' +
        'Electronic Money Institution. This currency conversion is covered under the ' +
        'Payment Services Regulations 2017. The exchange rate shown includes our ' +
        'service margin. For complaints, contact our FCA-regulated disputes team.',
    },
    {
      jurisdictions: ['US'],
      text:
        'NexaFx is registered as a Money Services Business (MSB) with FinCEN. State ' +
        'money transmission licences may apply. This transaction is subject to Bank ' +
        'Secrecy Act reporting requirements. Exchange rates fluctuate; the rate shown ' +
        'is locked for 60 seconds only.',
    },
    {
      jurisdictions: ['EU', 'DE', 'FR', 'NL', 'ES', 'IT', 'PL', 'SE'],
      text:
        'NexaFx is authorised as a Payment Institution under PSD2 (EU Directive ' +
        '2015/2366). This conversion is not a deposit and is not covered by the ' +
        'Deposit Guarantee Scheme. Rate includes our mark-up; see the fee breakdown ' +
        'for full cost disclosure as required by Article 45 of PSD2.',
    },
    {
      jurisdictions: ['ZA'],
      text:
        'NexaFx operates under an Authorised Dealer licence issued by the South ' +
        'African Reserve Bank (SARB). Foreign currency transactions are subject to ' +
        'the Currency and Exchanges Act, 1933 (Act 9 of 1933) and SARB Exchange ' +
        'Control Regulations.',
    },
    {
      jurisdictions: ['KE', 'GH', 'TZ', 'UG'],
      text:
        'Currency conversion services are provided in accordance with local central ' +
        'bank guidelines. Rates are subject to market fluctuation. Anti-money ' +
        'laundering checks apply to all cross-border transfers.',
    },
  ];

  private readonly GLOBAL_DISCLOSURE =
    'Currency conversion rates include a margin above the mid-market rate. ' +
    'The rate displayed is locked for 60 seconds. Past rates are not indicative ' +
    'of future rates. NexaFx is not liable for losses arising from exchange rate ' +
    'movements after the quote expires.';

  /** Returns the disclosure text applicable for a given jurisdiction code. */
  getDisclosure(jurisdiction: string | null | undefined): string {
    if (!jurisdiction) return this.GLOBAL_DISCLOSURE;

    const code = jurisdiction.toUpperCase();
    const entry = this.DISCLOSURES.find((d) =>
      d.jurisdictions.includes(code),
    );
    return entry?.text ?? this.GLOBAL_DISCLOSURE;
  }

  /** Returns the jurisdiction code from a User object (or null) */
  extractJurisdiction(user: { country?: string | null }): string | null {
    return user.country?.toUpperCase().slice(0, 2) ?? null;
  }
}
