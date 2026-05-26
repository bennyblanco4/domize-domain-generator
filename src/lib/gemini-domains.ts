/**
 * Shared Gemini domain suggestion logic used by API routes and the CLI.
 */

export type GenerateDomainOptions = {
  tlds?: string[];
  maxLength?: number;
  minLength?: number;
  previousDomains?: string[];
  attempt?: number;
  minPrice?: number;
  maxPrice?: number;
  quiet?: boolean;
};

const MIN_DOMAINS = 12;
const MAX_GENERATION_ATTEMPTS = 5;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function generateDomainSuggestions(
  description: string,
  options?: GenerateDomainOptions,
  attempt: number = 1
): Promise<string[]> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
    return [];
  }

  const tryNum = options?.attempt ?? attempt;

  // Extract required words from quotes
  const requiredWords: string[] = [];
  const regex = /"([^"]+)"/g;
  let match: RegExpExecArray | null;
  let processedDescription = description;

  while ((match = regex.exec(description)) !== null) {
    requiredWords.push(match[1].toLowerCase());
    processedDescription = processedDescription.replace(`"${match[1]}"`, match[1]);
  }

  let requiredWordsSpecification = '';
  if (requiredWords.length > 0) {
    requiredWordsSpecification = `CRITICAL REQUIREMENT: Each domain name MUST include the following word${requiredWords.length > 1 ? 's' : ''}: ${requiredWords.join(', ')}. This is mandatory - do not generate any domains that don't include ${requiredWords.length > 1 ? 'these words' : 'this word'}. `;
  }

  let tldSpecification = '';
  if (options?.tlds && options.tlds.length > 0) {
    tldSpecification = `Use only these specific TLDs: ${options.tlds.join(', ')}. `;
  }

  let lengthSpecification = '';
  if (options?.minLength && options?.maxLength) {
    lengthSpecification = `Make sure domain names (excluding the TLD) are between ${options.minLength} and ${options.maxLength} characters. `;
  } else if (options?.maxLength && options.maxLength < 20) {
    lengthSpecification = `Make sure domain names (excluding the TLD) are no longer than ${options.maxLength} characters. `;
  } else if (options?.minLength && options.minLength > 2) {
    lengthSpecification = `Make sure domain names (excluding the TLD) are at least ${options.minLength} characters. `;
  }

  let uniqueSpecification = '';
  if (options?.previousDomains && options.previousDomains.length > 0) {
    uniqueSpecification = `IMPORTANT: Do NOT include any of these previously generated domains: ${options.previousDomains.join(', ')}. Generate completely different domains. `;
  }

  let attemptSpecification = '';
  if (tryNum > 1) {
    attemptSpecification = `This is attempt #${tryNum}. Be even more creative and unique than before. Try different word combinations, prefixes, suffixes, and completely new terms. `;
  }

  const requestCount = MIN_DOMAINS * (1 + tryNum * 0.5);

  const prompt = `Generate at least ${Math.ceil(requestCount)} domain name suggestions for a project described as: "${processedDescription}".
${requiredWordsSpecification}${tldSpecification}${lengthSpecification}${uniqueSpecification}${attemptSpecification}

Format requirements:
1. Return ONLY the domain names, one per line.
2. Include the TLD (like .com, .io) in each domain.
3. Names should be brandable, memorable, and relate to the project.
4. Do not add any explanation, commentary, or numbering.
5. Never include spaces or special characters not valid in domain names.
6. IMPORTANT: ONLY generate root domains in the format "domain.tld" (like example.com). Do NOT generate subdomains like "name.example.com".`;

  const validateDomains = (domains: string[]) => {
    return domains.filter((domain) => {
      const domainWithoutTld = domain.split('.')[0].toLowerCase();
      const hasRequiredWords =
        requiredWords.length === 0 ||
        requiredWords.every((word) => domainWithoutTld.includes(word.toLowerCase()));
      const isValidLength = !options?.maxLength || domainWithoutTld.length <= options.maxLength;
      return hasRequiredWords && isValidLength;
    });
  };

  try {
    const allDomains: string[] = [];
    let generationAttempt = 0;

    while (allDomains.length < MIN_DOMAINS && generationAttempt < MAX_GENERATION_ATTEMPTS) {
      generationAttempt++;

      let attemptPrompt = prompt;
      if (generationAttempt > 1) {
        attemptPrompt += `\n\nURGENT: This is generation attempt #${generationAttempt}. Previous attempts didn't yield enough unique domains. Be extremely creative and use completely different word patterns than before. I NEED at least ${MIN_DOMAINS - allDomains.length} more unique domains that are completely different from previous ones.`;
      }

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: attemptPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.9 + generationAttempt * 0.15,
            topK: 32 + generationAttempt * 8,
            topP: 1,
            maxOutputTokens: 1024,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error(
          'Gemini API error:',
          typeof data.error === 'object' && data.error.message
            ? data.error.message
            : data.error
        );
        continue;
      }

      if (!data.candidates || !data.candidates[0]?.content?.parts || !data.candidates[0]?.content?.parts[0]?.text) {
        console.error('Unexpected Gemini API response structure:', data);
        continue;
      }

      const text = data.candidates[0].content.parts[0].text;

      const newDomains = text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && line.includes('.'));

      if (!options?.quiet) {
        console.log(`Generation attempt ${generationAttempt} produced ${newDomains.length} domains`);
      }

      for (const domain of newDomains) {
        const isDuplicate =
          allDomains.includes(domain.toLowerCase()) ||
          (options?.previousDomains &&
            options.previousDomains.includes(domain.toLowerCase()));

        if (!isDuplicate) {
          allDomains.push(domain.toLowerCase());
        }
      }
    }

    return validateDomains(allDomains);
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    return [];
  }
}
