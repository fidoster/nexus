/**
 * API Cost Calculator
 * Tracks and calculates costs for AI API usage across different models
 */

/**
 * Pricing per 1000 tokens (as of 2025)
 * Update these values as pricing changes
 */
export const MODEL_PRICING: {
  [key: string]: {
    input: number;  // Cost per 1K input tokens
    output: number; // Cost per 1K output tokens
  };
} = {
  'GPT': {
    input: 0.150 / 1000,   // GPT-4o-mini: $0.150 per 1M input tokens
    output: 0.600 / 1000,  // GPT-4o-mini: $0.600 per 1M output tokens
  },
  'Claude': {
    input: 0.800 / 1000,   // Claude 3.5 Haiku: $0.80 per 1M input tokens
    output: 4.000 / 1000,  // Claude 3.5 Haiku: $4.00 per 1M output tokens
  },
  'Gemini': {
    input: 0.075 / 1000,   // Gemini 1.5 Flash: $0.075 per 1M input tokens
    output: 0.300 / 1000,  // Gemini 1.5 Flash: $0.30 per 1M output tokens
  },
  'DeepSeek': {
    input: 0.140 / 1000,   // DeepSeek Chat: $0.14 per 1M input tokens
    output: 0.280 / 1000,  // DeepSeek Chat: $0.28 per 1M output tokens
  },
  'Mistral': {
    input: 0.200 / 1000,   // Mistral Small: $0.2 per 1M input tokens
    output: 0.600 / 1000,  // Mistral Small: $0.6 per 1M output tokens
  },
  'Groq': {
    input: 0.050 / 1000,   // Llama 3.3 70B on Groq: ~$0.05 per 1M input tokens (estimated)
    output: 0.080 / 1000,  // Llama 3.3 70B on Groq: ~$0.08 per 1M output tokens (estimated)
  },
  'Perplexity': {
    input: 0.200 / 1000,   // Sonar Small: $0.2 per 1M input tokens
    output: 0.200 / 1000,  // Sonar Small: $0.2 per 1M output tokens
  },
};

/**
 * Estimate token count from text
 * Rough approximation: 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(text: string): number {
  // More accurate estimation considering:
  // - Average word length
  // - Punctuation
  // - Whitespace
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const avgTokensPerWord = 1.3; // Common average for English
  return Math.ceil(words.length * avgTokensPerWord);
}

/**
 * Calculate cost for a single API call
 *
 * @param modelName - Name of the AI model
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelName];

  if (!pricing) {
    console.warn(`No pricing found for model: ${modelName}, using default pricing`);
    // Default pricing (use GPT as fallback)
    return (inputTokens * MODEL_PRICING['GPT'].input) + (outputTokens * MODEL_PRICING['GPT'].output);
  }

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Calculate total cost for multiple API calls
 */
export function calculateTotalCost(apiCalls: Array<{
  modelName: string;
  inputTokens: number;
  outputTokens: number;
}>): {
  totalCost: number;
  breakdown: { [modelName: string]: number };
  totalTokens: { input: number; output: number };
} {
  let totalCost = 0;
  const breakdown: { [modelName: string]: number } = {};
  const totalTokens = { input: 0, output: 0 };

  for (const call of apiCalls) {
    const cost = calculateCost(call.modelName, call.inputTokens, call.outputTokens);
    totalCost += cost;

    if (!breakdown[call.modelName]) {
      breakdown[call.modelName] = 0;
    }
    breakdown[call.modelName] += cost;

    totalTokens.input += call.inputTokens;
    totalTokens.output += call.outputTokens;
  }

  return { totalCost, breakdown, totalTokens };
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(3)}m`; // Show in millidollars for very small amounts
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Calculate cost per response for comparison
 */
export function calculateCostPerResponse(
  totalCost: number,
  responseCount: number
): number {
  if (responseCount === 0) return 0;
  return totalCost / responseCount;
}

/**
 * Project monthly cost based on current usage
 */
export function projectMonthlyCost(
  dailyUsage: Array<{ modelName: string; inputTokens: number; outputTokens: number }>,
  daysInMonth: number = 30
): {
  projectedCost: number;
  dailyAverage: number;
  breakdown: { [modelName: string]: number };
} {
  const { totalCost, breakdown } = calculateTotalCost(dailyUsage);
  const projectedCost = totalCost * daysInMonth;
  const dailyAverage = totalCost;

  // Project breakdown
  const projectedBreakdown: { [modelName: string]: number } = {};
  for (const [model, cost] of Object.entries(breakdown)) {
    projectedBreakdown[model] = cost * daysInMonth;
  }

  return {
    projectedCost,
    dailyAverage,
    breakdown: projectedBreakdown,
  };
}

/**
 * Compare cost efficiency between models
 */
export function compareCostEfficiency(responses: Array<{
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  quality: number; // Rating from 1-3 (1=best, 3=worst)
}>): Array<{
  modelName: string;
  avgCost: number;
  avgQuality: number;
  costPerQualityPoint: number;
}> {
  const modelStats: {
    [key: string]: {
      totalCost: number;
      totalQuality: number;
      count: number;
    };
  } = {};

  // Aggregate data by model
  for (const response of responses) {
    const cost = calculateCost(response.modelName, response.inputTokens, response.outputTokens);
    const qualityScore = 4 - response.quality; // Invert: 1st=3pts, 2nd=2pts, 3rd=1pt

    if (!modelStats[response.modelName]) {
      modelStats[response.modelName] = { totalCost: 0, totalQuality: 0, count: 0 };
    }

    modelStats[response.modelName].totalCost += cost;
    modelStats[response.modelName].totalQuality += qualityScore;
    modelStats[response.modelName].count++;
  }

  // Calculate averages and efficiency
  return Object.entries(modelStats).map(([modelName, stats]) => {
    const avgCost = stats.totalCost / stats.count;
    const avgQuality = stats.totalQuality / stats.count;
    const costPerQualityPoint = avgCost / avgQuality;

    return {
      modelName,
      avgCost,
      avgQuality,
      costPerQualityPoint,
    };
  }).sort((a, b) => a.costPerQualityPoint - b.costPerQualityPoint); // Best value first
}

/**
 * Calculate cost savings from using cheaper models
 */
export function calculateCostSavings(
  currentModelCosts: { [modelName: string]: number },
  alternativeModel: string
): {
  savings: number;
  savingsPercentage: number;
  recommendation: string;
} {
  const totalCurrentCost = Object.values(currentModelCosts).reduce((sum, cost) => sum + cost, 0);
  const mostExpensiveModel = Object.entries(currentModelCosts)
    .sort((a, b) => b[1] - a[1])[0];

  if (!mostExpensiveModel) {
    return { savings: 0, savingsPercentage: 0, recommendation: 'No data available' };
  }

  const [modelName] = mostExpensiveModel;
  const currentPricing = MODEL_PRICING[modelName];
  const alternativePricing = MODEL_PRICING[alternativeModel];

  if (!currentPricing || !alternativePricing) {
    return { savings: 0, savingsPercentage: 0, recommendation: 'Pricing data unavailable' };
  }

  // Estimate savings based on pricing ratio
  const pricingRatio = (alternativePricing.input + alternativePricing.output) /
                        (currentPricing.input + currentPricing.output);
  const potentialSavings = totalCurrentCost * (1 - pricingRatio);
  const savingsPercentage = ((totalCurrentCost - (totalCurrentCost * pricingRatio)) / totalCurrentCost) * 100;

  let recommendation = '';
  if (savingsPercentage > 50) {
    recommendation = `Switching to ${alternativeModel} could save ${savingsPercentage.toFixed(1)}% (${formatCost(potentialSavings)})`;
  } else if (savingsPercentage > 20) {
    recommendation = `Moderate savings possible with ${alternativeModel}`;
  } else {
    recommendation = 'Current model selection is cost-efficient';
  }

  return {
    savings: potentialSavings,
    savingsPercentage,
    recommendation,
  };
}
