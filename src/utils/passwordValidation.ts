/**
 * Password Strength Validation
 * Ensures strong passwords for user accounts
 */

import zxcvbn from 'zxcvbn';

export interface PasswordStrength {
  score: number; // 0-4 (0 = weak, 4 = very strong)
  feedback: string[];
  isValid: boolean;
}

/**
 * Validate password strength using zxcvbn
 * Minimum score of 3 required (out of 4)
 */
export const validatePassword = (password: string, userInputs: string[] = []): PasswordStrength => {
  if (!password) {
    return {
      score: 0,
      feedback: ['Password is required'],
      isValid: false,
    };
  }

  // Minimum length check
  if (password.length < 8) {
    return {
      score: 0,
      feedback: ['Password must be at least 8 characters long'],
      isValid: false,
    };
  }

  // Use zxcvbn for advanced password strength checking
  const result = zxcvbn(password, userInputs);

  const feedback: string[] = [];

  // Score < 3 is too weak
  if (result.score < 3) {
    if (result.feedback.warning) {
      feedback.push(result.feedback.warning);
    }

    result.feedback.suggestions.forEach(suggestion => {
      feedback.push(suggestion);
    });

    // Add generic advice if no specific feedback
    if (feedback.length === 0) {
      feedback.push('Password is too weak. Use a mix of letters, numbers, and symbols.');
      feedback.push('Avoid common words and patterns.');
    }

    return {
      score: result.score,
      feedback,
      isValid: false,
    };
  }

  return {
    score: result.score,
    feedback: ['Password strength: ' + getStrengthLabel(result.score)],
    isValid: true,
  };
};

/**
 * Get human-readable strength label
 */
const getStrengthLabel = (score: number): string => {
  switch (score) {
    case 0:
      return 'Very Weak';
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Unknown';
  }
};

/**
 * Get color for password strength indicator
 */
export const getStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'bg-red-500';
    case 2:
      return 'bg-yellow-500';
    case 3:
      return 'bg-blue-500';
    case 4:
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};
