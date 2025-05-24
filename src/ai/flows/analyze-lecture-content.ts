// src/ai/flows/analyze-lecture-content.ts
'use server';
/**
 * @fileOverview Analyzes lecture content (text and images) to identify key concepts and themes.
 *
 * - analyzeLectureContent - A function that handles the lecture content analysis.
 * - AnalyzeLectureContentInput - The input type for the analyzeLectureContent function.
 * - AnalyzeLectureContentOutput - The return type for the analyzeLectureContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeLectureContentInputSchema = z.object({
  contentDataUri: z.string().describe("Lecture content (text or image) as a data URI. For images, it must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. For text, use 'data:text/plain;charset=utf-8,<encoded_data>'"),
  contentType: z.enum(['text', 'image']).describe('The type of the lecture content.'),
});
export type AnalyzeLectureContentInput = z.infer<typeof AnalyzeLectureContentInputSchema>;

const AnalyzeLectureContentOutputSchema = z.object({
  keyConcepts: z.array(z.string()).describe('Key concepts identified in the lecture content.'),
  themes: z.array(z.string()).describe('Main themes identified in the lecture content.'),
  summary: z.string().describe('A brief summary of the lecture content.'),
});
export type AnalyzeLectureContentOutput = z.infer<typeof AnalyzeLectureContentOutputSchema>;

export async function analyzeLectureContent(input: AnalyzeLectureContentInput): Promise<AnalyzeLectureContentOutput> {
  return analyzeLectureContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeLectureContentPrompt',
  input: {schema: AnalyzeLectureContentInputSchema},
  output: {schema: AnalyzeLectureContentOutputSchema},
  prompt: `You are an expert in analyzing lecture content and identifying key concepts and themes.

  Analyze the following lecture content and identify the key concepts, themes, and provide a summary.

  Content type: {{{contentType}}}
  Content: {{#ifEquals contentType "image"}}{{media url=contentDataUri}}{{else}}{{{contentDataUri}}}{{/ifEquals}}
  
  Output the key concepts, themes, and summary in the specified JSON format.
  Here are some examples of content types:

  - text
  - image`,
  templateHelpers: {
    ifEquals: (arg1: any, arg2: any, options: any) => {
      return arg1 == arg2 ? options.fn(this) : options.inverse(this);
    },
  },
});

const analyzeLectureContentFlow = ai.defineFlow(
  {
    name: 'analyzeLectureContentFlow',
    inputSchema: AnalyzeLectureContentInputSchema,
    outputSchema: AnalyzeLectureContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
