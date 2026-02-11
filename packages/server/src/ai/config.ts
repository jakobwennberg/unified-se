import { z } from 'zod';

const AIConfigSchema = z.object({
  // AWS Bedrock
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  awsRegion: z.string().default('eu-west-1'),
  bedrockModelId: z
    .string()
    .default('eu.anthropic.claude-sonnet-4-5-20250929-v1:0'),
  bedrockMaxTokens: z.number().default(8192),
  // LangSmith Observability
  langchainTracingV2: z.boolean().default(false),
  langchainApiKey: z.string().optional(),
  langchainProject: z.string().default('arcim-ai-workflows'),
  // Timeouts & Retries
  generateCompanyTimeout: z.number().default(90_000),
  maxRetries: z.number().default(3),
  initialBackoffMs: z.number().default(1000),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

export function getAIConfig(): AIConfig {
  return AIConfigSchema.parse({
    awsAccessKeyId: process.env['AWS_ACCESS_KEY_ID'],
    awsSecretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
    awsRegion: process.env['AWS_REGION'] || undefined,
    bedrockModelId: process.env['BEDROCK_MODEL_ID'] || undefined,
    bedrockMaxTokens: process.env['BEDROCK_MAX_TOKENS']
      ? parseInt(process.env['BEDROCK_MAX_TOKENS'], 10)
      : undefined,
    langchainTracingV2: process.env['LANGCHAIN_TRACING_V2'] === 'true',
    langchainApiKey: process.env['LANGCHAIN_API_KEY'],
    langchainProject: process.env['LANGCHAIN_PROJECT'] || undefined,
    generateCompanyTimeout: process.env['GENERATE_COMPANY_TIMEOUT']
      ? parseInt(process.env['GENERATE_COMPANY_TIMEOUT'], 10)
      : undefined,
    maxRetries: process.env['AI_MAX_RETRIES']
      ? parseInt(process.env['AI_MAX_RETRIES'], 10)
      : undefined,
    initialBackoffMs: process.env['AI_INITIAL_BACKOFF_MS']
      ? parseInt(process.env['AI_INITIAL_BACKOFF_MS'], 10)
      : undefined,
  });
}

export function hasAWSCredentials(config?: AIConfig): boolean {
  const c = config ?? getAIConfig();
  return Boolean(c.awsAccessKeyId && c.awsSecretAccessKey);
}

export function isTracingEnabled(config?: AIConfig): boolean {
  const c = config ?? getAIConfig();
  return c.langchainTracingV2 && Boolean(c.langchainApiKey);
}
