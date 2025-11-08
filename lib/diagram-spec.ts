import OpenAI from 'openai';

// Types for diagram specification
export interface DiagramNode {
  id: string;
  label: string;
  type: 'client' | 'service' | 'db' | 'queue' | 'other';
  x: number;
  y: number;
}

export interface DiagramFlow {
  from: string;
  to: string;
  label: string;
}

export interface DiagramFrame {
  index: number;
  highlightNodes?: string[];
  highlightFlows?: Array<{ from: string; to: string }>;
  caption?: string;
}

export interface DiagramSpec {
  title: string;
  nodes: DiagramNode[];
  flows: DiagramFlow[];
  frames: DiagramFrame[];
}

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

/**
 * Generate diagram specification from article text using OpenAI
 */
export async function generateDiagramSpecFromText(articleText: string): Promise<DiagramSpec> {
  const client = getOpenAIClient();

  const prompt = `You are a senior backend architect.

Input is a technical blog post. 
1. Identify main components (services, db, queues, clients).
2. Identify data flow between them.
3. Return STRICT JSON with:
{
  "title": string,
  "nodes": [
    { "id": string, "label": string, "type": "client|service|db|queue|other", "x": number, "y": number }
  ],
  "flows": [
    { "from": string, "to": string, "label": string }
  ],
  "frames": [
    {
      "index": number,
      "highlightNodes": [string],
      "highlightFlows": [ { "from": string, "to": string } ],
      "caption": string
    }
  ]
}
Coordinates in range x:[100,900], y:[100,500].
Max 10 nodes, max 12 frames.
Now analyze and respond with JSON only.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You output valid minified JSON only. Analyze technical blog posts and extract data flow diagrams.' },
        { role: 'user', content: `${prompt}\n\nARTICLE:\n${articleText}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API returned empty response');
    }

    const spec = JSON.parse(content) as DiagramSpec;

    // Validate spec structure
    if (!spec.title || !Array.isArray(spec.nodes) || !Array.isArray(spec.flows) || !Array.isArray(spec.frames)) {
      throw new Error('Invalid diagram spec structure from OpenAI');
    }

    // Ensure frames are sorted by index
    spec.frames.sort((a, b) => a.index - b.index);

    return spec;
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse OpenAI JSON response: ${error.message}`);
    }
    if (error.message?.includes('OPENAI_API_KEY')) {
      throw error;
    }
    throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`);
  }
}

