// use server'
'use server';

/**
 * @fileOverview Generates test questions based on analyzed lecture content.
 *
 * - generateTestQuestions - A function that generates test questions.
 * - GenerateTestQuestionsInput - The input type for the generateTestQuestions function.
 * - GenerateTestQuestionsOutput - The return type for the generateTestQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTestQuestionsInputSchema = z.object({
  lectureContent: z
    .string()
    .describe('The content of the lecture to generate test questions from.'),
  numberOfQuestions: z
    .number()
    .default(5)
    .describe('The number of test questions to generate.'),
  questionDifficulty: z
    .enum(['easy', 'medium', 'hard'])
    .default('medium')
    .describe('The difficulty level of the test questions.'),
});
export type GenerateTestQuestionsInput = z.infer<typeof GenerateTestQuestionsInputSchema>;

const GenerateTestQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The text of the test question.'),
      answer: z.string().describe('The correct answer to the test question.'),
    })
  ).describe('An array of generated test questions and their answers.'),
});
export type GenerateTestQuestionsOutput = z.infer<typeof GenerateTestQuestionsOutputSchema>;

export async function generateTestQuestions(input: GenerateTestQuestionsInput): Promise<GenerateTestQuestionsOutput> {
  return generateTestQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTestQuestionsPrompt',
  input: {schema: GenerateTestQuestionsInputSchema},
  output: {schema: GenerateTestQuestionsOutputSchema},
  prompt: `You are an expert educator creating practice test questions for students.

  Based on the following lecture content, generate {{numberOfQuestions}} test questions of {{questionDifficulty}} difficulty.
  **Important**: Ensure that the questions and answers are generated in the same language as the provided 'Lecture Content'.

  Lecture Content: {{{lectureContent}}}

  Format your response as a JSON array of objects, where each object has a "question" and an "answer" key.
  Example:
  [
    {
      "question": "What is the capital of France?",
      "answer": "Paris"
    },
    {
      "question": "What is the value of PI?",
      "answer": "3.14159"
    }
  ]
  `,
});

const generateTestQuestionsFlow = ai.defineFlow(
  {
    name: 'generateTestQuestionsFlow',
    inputSchema: GenerateTestQuestionsInputSchema,
    outputSchema: GenerateTestQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
