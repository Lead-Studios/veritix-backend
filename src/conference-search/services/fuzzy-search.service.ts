import { Injectable } from '@nestjs/common';

@Injectable()
export class FuzzySearchService {
  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Calculate similarity score (0-1) based on Levenshtein distance
   */
  calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(
      str1.toLowerCase(),
      str2.toLowerCase(),
    );
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  /**
   * Generate trigrams from a string
   */
  generateTrigrams(str: string): Set<string> {
    const trigrams = new Set<string>();
    const paddedStr = `  ${str.toLowerCase()}  `;

    for (let i = 0; i < paddedStr.length - 2; i++) {
      trigrams.add(paddedStr.substring(i, i + 3));
    }

    return trigrams;
  }

  /**
   * Calculate trigram similarity
   */
  calculateTrigramSimilarity(str1: string, str2: string): number {
    const trigrams1 = this.generateTrigrams(str1);
    const trigrams2 = this.generateTrigrams(str2);

    const intersection = new Set(
      [...trigrams1].filter((x) => trigrams2.has(x)),
    );
    const union = new Set([...trigrams1, ...trigrams2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculate combined fuzzy score
   */
  calculateFuzzyScore(searchTerm: string, targetString: string): number {
    if (!searchTerm || !targetString) return 0;

    const searchLower = searchTerm.toLowerCase().trim();
    const targetLower = targetString.toLowerCase().trim();

    // Exact match gets highest score
    if (searchLower === targetLower) return 1;

    // Partial match (contains)
    if (targetLower.includes(searchLower)) return 0.8;

    // Word boundary matches
    const searchWords = searchLower.split(/\s+/);
    const targetWords = targetLower.split(/\s+/);

    let wordMatches = 0;
    for (const searchWord of searchWords) {
      for (const targetWord of targetWords) {
        if (
          targetWord.includes(searchWord) ||
          searchWord.includes(targetWord)
        ) {
          wordMatches++;
          break;
        }
      }
    }

    if (wordMatches > 0) {
      return 0.6 + (wordMatches / searchWords.length) * 0.2;
    }

    // Fuzzy matching
    const levenshteinScore = this.calculateSimilarity(searchLower, targetLower);
    const trigramScore = this.calculateTrigramSimilarity(
      searchLower,
      targetLower,
    );

    // Combine scores with weights
    const combinedScore = levenshteinScore * 0.6 + trigramScore * 0.4;

    // Only return scores above threshold
    return combinedScore > 0.3 ? combinedScore : 0;
  }
}
