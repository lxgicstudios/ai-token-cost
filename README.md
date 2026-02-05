# ai-token-cost

Estimate LLM API costs before you send. Supports OpenAI, Anthropic, Google, Mistral, and DeepSeek.

## Install & Run

```bash
npx ai-token-cost
```

## What It Does

- Counts tokens in your prompt
- Calculates exact API costs
- Compares pricing across 20+ models
- Warns if prompt exceeds context window

## Usage

```bash
# Estimate for default model (gpt-4o)
echo "Your prompt here" | npx ai-token-cost

# From file
npx ai-token-cost -f prompt.txt

# Different model
npx ai-token-cost -f prompt.txt -m claude-3.5-sonnet

# Expected output tokens (default: 500)
npx ai-token-cost -f prompt.txt -o 2000

# Multiple requests
npx ai-token-cost -f prompt.txt -r 100

# Compare all models
npx ai-token-cost -f prompt.txt --compare

# List supported models
npx ai-token-cost --list
```

## Example

```bash
$ cat system-prompt.txt | npx ai-token-cost -m gpt-4o -o 1000

💰 Token Cost Estimate

Model: gpt-4o
Context Window: 128,000 tokens

Tokens:
  Input:  2,450 tokens
  Output: 1,000 tokens (estimated)
  Total:  3,450 tokens

Cost:
  Input:  $0.0061
  Output: $0.0100

  Total:  $0.0161

💡 Tips:
   Try gpt-4o-mini for 90% quality at 5% cost
   Run with --compare to see all model costs
```

## Compare Models

```bash
$ npx ai-token-cost -f prompt.txt --compare

📊 Cost Comparison Across Models

Input: 5,000 tokens | Output: 500 tokens | Requests: 1

gemini-1.5-flash    $0.0005   ██
deepseek-v3         $0.0019   ████
gpt-4o-mini         $0.0011   ██
claude-3.5-sonnet   $0.0225   ██████████████ (15x)
gpt-4o              $0.0175   ████████████ (12x)
claude-3-opus       $0.1125   ████████████████████████████████ (75x)
```

## Supported Models

**OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo, o1, o1-mini, o3-mini

**Anthropic**: claude-3-opus, claude-3.5-sonnet, claude-3.5-haiku, claude-3-haiku

**Google**: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash

**Mistral**: mistral-large, mistral-small, codestral

**DeepSeek**: deepseek-v3, deepseek-r1

## License

MIT - Built by [LXGIC Studios](https://github.com/lxgicstudios)
