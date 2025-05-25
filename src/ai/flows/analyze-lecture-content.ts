
// src/ai/flows/analyze-lecture-content.ts
'use server';
/**
 * @fileOverview Analyzes a batch of lecture content (text, images, or PDF) 
 * to identify key concepts, themes, and generate a combined summary.
 *
 * - analyzeLectureContent - A function that handles the lecture content analysis for a batch.
 * - AnalyzeLectureContentInput - The input type for the analyzeLectureContent function.
 * - AnalyzeLectureContentOutput - The return type for the analyzeLectureContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { LectureContentItem } from '@/types'; // Ensure this type is defined

const LectureContentItemSchema = z.object({
  fileName: z.string().describe("The name of the file."),
  contentType: z.enum(['text', 'image', 'pdf']).describe('The type of the lecture content.'),
  rawTextContent: z.string().optional().describe("Raw text content for text files."),
  contentDataUri: z.string().optional().describe("Lecture content (image, or PDF) as a data URI. It must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});

const AnalyzeLectureContentInputSchema = z.object({
  contents: z.array(LectureContentItemSchema).min(1).describe('An array of lecture content items to be analyzed together.'),
});
export type AnalyzeLectureContentInput = z.infer<typeof AnalyzeLectureContentInputSchema>;

const AnalyzeLectureContentOutputSchema = z.object({
  keyConcepts: z.array(z.string()).describe('Key concepts identified from all lecture contents.'),
  themes: z.array(z.string()).describe('Main themes identified from all lecture contents.'),
  summary: z.string().describe('A brief combined summary of all lecture contents.'),
});
export type AnalyzeLectureContentOutput = z.infer<typeof AnalyzeLectureContentOutputSchema>;

export async function analyzeLectureContent(input: AnalyzeLectureContentInput): Promise<AnalyzeLectureContentOutput> {
  return analyzeLectureContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeLectureBatchContentPrompt', // Renamed for clarity
  input: {schema: AnalyzeLectureContentInputSchema},
  output: {schema: AnalyzeLectureContentOutputSchema},
  prompt: `You are an expert in analyzing multiple lecture materials and synthesizing information.
Analyze the following lecture contents. Identify the key concepts and themes that span across all materials, and provide a single, coherent summary that integrates information from all provided content.
**Important**: Ensure that all outputs (key concepts, themes, and summary) are in the same language as the predominant language of the input content(s). If multiple languages are present, use the language of the first content item.

{{#each contents}}
--- START FILE: {{this.fileName}} (Type: {{this.contentType}}) ---
{{#ifEquals this.contentType "text"}}
{{{this.rawTextContent}}}
{{else}}
{{media url=this.contentDataUri}}
{{/ifEquals}}
--- END FILE: {{this.fileName}} ---
{{/each}}
  
Output the combined key concepts, themes, and summary in the specified JSON format based on ALL the provided content.
Here are some examples of content types for media:
- image
- pdf`,
  templateHelpers: {
    ifEquals: (arg1: any, arg2: any, options: any) => {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    },
  },
});

const analyzeLectureContentFlow = ai.defineFlow(
  {
    name: 'analyzeLectureBatchContentFlow', // Renamed for clarity
    inputSchema: AnalyzeLectureContentInputSchema,
    outputSchema: AnalyzeLectureContentOutputSchema,
  },
  async input => {
    // Validate that if contentType is not 'text', contentDataUri must be present
    // And if contentType is 'text', rawTextContent must be present
    // This kind of validation could also be done with Zod refine/superRefine on LectureContentItemSchema
    for (const item of input.contents) {
      if (item.contentType !== 'text' && !item.contentDataUri) {
        throw new Error(`Content item '${item.fileName}' of type '${item.contentType}' is missing 'contentDataUri'.`);
      }
      if (item.contentType === 'text' && !item.rawTextContent) {
        throw new Error(`Content item '${item.fileName}' of type 'text' is missing 'rawTextContent'.`);
      }
    }
    const {output} = await prompt(input);
    return output!;
  }
);
