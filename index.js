#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import readline from 'readline';
import { encode } from 'gpt-tokenizer';

const VERSION = '1.0.0';

// Pricing per 1M tokens (as of Feb 2025)
const PRICING = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00, context: 128000 },
  'gpt-4o-mini': { input: 0.15, output: 0.60, context: 128000 },
  'gpt-4-turbo': { input: 10.00, output: 30.00, context: 128000 },
  'gpt-4': { input: 30.00, output: 60.00, context: 8192 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50, context: 16385 },
  'o1': { input: 15.00, output: 60.00, context: 200000 },
  'o1-mini': { input: 3.00, output: 12.00, context: 128000 },
  'o3-mini': { input: 1.10, output: 4.40, context: 200000 },
  
  // Anthropic
  'claude-3-opus': { input: 15.00, output: 75.00, context: 200000 },
  'claude-3.5-sonnet': { input: 3.00, output: 15.00, context: 200000 },
  'claude-3.5-haiku': { input: 0.80, output: 4.00, context: 200000 },
  'claude-3-haiku': { input: 0.25, output: 1.25, context: 200000 },
  
  // Google
  'gemini-1.5-pro': { input: 1.25, output: 5.00, context: 2000000 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30, context: 1000000 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40, context: 1000000 },
  
  // Mistral
  'mistral-large': { input: 2.00, output: 6.00, context: 128000 },
  'mistral-small': { input: 0.20, output: 0.60, context: 32000 },
  'codestral': { input: 0.20, output: 0.60, context: 32000 },
  
  // DeepSeek
  'deepseek-v3': { input: 0.27, output: 1.10, context: 64000 },
  'deepseek-r1': { input: 0.55, output: 2.19, context: 64000 },
};

program
  .name('ai-token-cost')
  .description('Estimate LLM API costs before you send')
  .version(VERSION)
  .option('-m, --model <model>', 'Model to estimate for', 'gpt-4o')
  .option('-f, --file <path>', 'Read prompt from file')
  .option('-o, --output-tokens <n>', 'Expected output tokens', '500')
  .option('-r, --requests <n>', 'Number of requests to estimate', '1')
  .option('--list', 'List all supported models')
  .option('--compare', 'Compare costs across all models')
  .option('--json', 'Output as JSON')
  .parse();

const opts = program.opts();

function countTokens(text) {
  try {
    return encode(text).length;
  } catch {
    // Fallback: rough estimate
    return Math.ceil(text.length / 4);
  }
}

function formatCost(cost) {
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatNumber(n) {
  return n.toLocaleString();
}

function calculateCost(model, inputTokens, outputTokens, requests = 1) {
  const pricing = PRICING[model];
  if (!pricing) return null;
  
  const inputCost = (inputTokens / 1_000_000) * pricing.input * requests;
  const outputCost = (outputTokens / 1_000_000) * pricing.output * requests;
  const totalCost = inputCost + outputCost;
  
  return {
    model,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
    requests,
    contextWindow: pricing.context,
    withinContext: inputTokens < pricing.context
  };
}

async function readFromStdin() {
  return new Promise((resolve) => {
    let input = '';
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    
    rl.on('line', (line) => {
      input += line + '\n';
    });
    
    rl.on('close', () => {
      resolve(input.trim());
    });
    
    // Timeout for interactive mode
    if (process.stdin.isTTY) {
      console.log(chalk.cyan('Paste your prompt (Ctrl+D to finish):\n'));
    }
  });
}

function listModels() {
  console.log(chalk.bold.cyan('\n💰 Supported Models & Pricing\n'));
  
  const providers = {
    'OpenAI': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini'],
    'Anthropic': ['claude-3-opus', 'claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3-haiku'],
    'Google': ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
    'Mistral': ['mistral-large', 'mistral-small', 'codestral'],
    'DeepSeek': ['deepseek-v3', 'deepseek-r1']
  };
  
  for (const [provider, models] of Object.entries(providers)) {
    console.log(chalk.yellow(`\n${provider}:`));
    for (const model of models) {
      const p = PRICING[model];
      console.log(
        chalk.white(`  ${model.padEnd(20)}`),
        chalk.gray(`$${p.input.toFixed(2)}/M in`.padEnd(12)),
        chalk.gray(`$${p.output.toFixed(2)}/M out`.padEnd(14)),
        chalk.gray(`${formatNumber(p.context)} ctx`)
      );
    }
  }
  console.log();
}

function compareModels(inputTokens, outputTokens, requests) {
  console.log(chalk.bold.cyan('\n📊 Cost Comparison Across Models\n'));
  console.log(chalk.gray(`Input: ${formatNumber(inputTokens)} tokens | Output: ${formatNumber(outputTokens)} tokens | Requests: ${requests}\n`));
  
  const results = [];
  for (const model of Object.keys(PRICING)) {
    const cost = calculateCost(model, inputTokens, outputTokens, requests);
    if (cost) results.push(cost);
  }
  
  // Sort by total cost
  results.sort((a, b) => a.totalCost - b.totalCost);
  
  const cheapest = results[0].totalCost;
  
  for (const r of results) {
    const multiple = r.totalCost / cheapest;
    const bar = '█'.repeat(Math.min(Math.ceil(multiple * 2), 30));
    const multipleStr = multiple > 1.1 ? chalk.gray(` (${multiple.toFixed(1)}x)`) : '';
    
    console.log(
      chalk.white(r.model.padEnd(20)),
      chalk.green(formatCost(r.totalCost).padStart(10)),
      chalk.cyan(bar),
      multipleStr
    );
  }
  
  console.log(chalk.gray('\n💡 Cheapest: ' + results[0].model));
  console.log(chalk.gray('💪 Most capable: claude-3-opus, gpt-4, o1'));
  console.log();
}

async function main() {
  // List models
  if (opts.list) {
    listModels();
    return;
  }
  
  // Get input
  let text;
  if (opts.file) {
    try {
      text = await fs.readFile(opts.file, 'utf-8');
    } catch (err) {
      console.error(chalk.red(`Cannot read file: ${opts.file}`));
      process.exit(1);
    }
  } else if (!process.stdin.isTTY) {
    text = await readFromStdin();
  } else {
    text = await readFromStdin();
  }
  
  if (!text || text.trim().length === 0) {
    console.error(chalk.red('\nNo input provided'));
    console.log(chalk.gray('\nUsage:'));
    console.log(chalk.gray('  echo "your prompt" | npx ai-token-cost'));
    console.log(chalk.gray('  npx ai-token-cost -f prompt.txt'));
    console.log(chalk.gray('  npx ai-token-cost --list'));
    process.exit(1);
  }
  
  const inputTokens = countTokens(text);
  const outputTokens = parseInt(opts.outputTokens);
  const requests = parseInt(opts.requests);
  
  // Compare all models
  if (opts.compare) {
    compareModels(inputTokens, outputTokens, requests);
    return;
  }
  
  // Single model estimate
  const model = opts.model;
  if (!PRICING[model]) {
    console.error(chalk.red(`Unknown model: ${model}`));
    console.log(chalk.gray('\nRun with --list to see supported models'));
    process.exit(1);
  }
  
  const result = calculateCost(model, inputTokens, outputTokens, requests);
  
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  console.log(chalk.bold.cyan('\n💰 Token Cost Estimate\n'));
  console.log(chalk.white(`Model: ${chalk.yellow(model)}`));
  console.log(chalk.white(`Context Window: ${formatNumber(result.contextWindow)} tokens`));
  console.log();
  
  console.log(chalk.gray('Tokens:'));
  console.log(`  Input:  ${chalk.cyan(formatNumber(inputTokens))} tokens`);
  console.log(`  Output: ${chalk.cyan(formatNumber(outputTokens))} tokens (estimated)`);
  console.log(`  Total:  ${chalk.cyan(formatNumber(inputTokens + outputTokens))} tokens`);
  
  if (!result.withinContext) {
    console.log(chalk.red(`\n⚠️  Warning: Input exceeds context window!`));
  }
  
  console.log(chalk.gray('\nCost:'));
  console.log(`  Input:  ${chalk.green(formatCost(result.inputCost))}`);
  console.log(`  Output: ${chalk.green(formatCost(result.outputCost))}`);
  
  if (requests > 1) {
    console.log(`  × ${requests} requests`);
  }
  
  console.log(chalk.bold(`\n  Total:  ${chalk.green(formatCost(result.totalCost))}`));
  
  // Suggestions
  console.log(chalk.gray('\n💡 Tips:'));
  if (model === 'gpt-4' || model === 'gpt-4-turbo') {
    console.log(chalk.gray('   Try gpt-4o-mini for 90% quality at 5% cost'));
  }
  if (model.includes('claude-3-opus')) {
    console.log(chalk.gray('   Try claude-3.5-sonnet for similar quality at 20% cost'));
  }
  console.log(chalk.gray('   Run with --compare to see all model costs'));
  console.log();
}

main();
