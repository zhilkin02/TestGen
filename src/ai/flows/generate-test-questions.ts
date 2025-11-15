
// use server'
'use server';

/**
 * @fileOverview Generates test questions based on analyzed lecture content and desired question type.
 *
 * - generateTestQuestions - A function that generates test questions.
 * - GenerateTestQuestionsInput - The input type for the generateTestQuestions function.
 * - GenerateTestQuestionsOutput - The return type for the generateTestQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { QuestionType } from '@/types'; // Import QuestionType

const QuestionTypeEnumSchema = z.enum(['fill-in-the-blank', 'single-choice', 'multiple-choice']);

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
  questionType: QuestionTypeEnumSchema.describe('The desired type of questions to generate.'),
});
export type GenerateTestQuestionsInput = z.infer<typeof GenerateTestQuestionsInputSchema>;

// Schemas for different question types
const BaseQuestionOutputSchema = z.object({
  questionText: z.string().describe("The main text of the question. For fill-in-the-blank, use '___' as a placeholder for the blank space."),
});

const FillInTheBlankOutputSchema = BaseQuestionOutputSchema.extend({
  type: z.enum(['fill-in-the-blank']).describe("The type of the question."),
  correctAnswer: z.string().describe("The word or phrase that correctly fills the blank."),
});

const SingleChoiceOutputSchema = BaseQuestionOutputSchema.extend({
  type: z.enum(['single-choice']).describe("The type of the question."),
  options: z.array(z.string()).min(3).max(5).describe("An array of 3 to 5 unique answer options."),
  correctAnswer: z.string().describe("The single correct answer, which must exactly match one of the provided options."),
});

const MultipleChoiceOutputSchema = BaseQuestionOutputSchema.extend({
  type: z.enum(['multiple-choice']).describe("The type of the question."),
  options: z.array(z.string()).min(3).max(5).describe("An array of 3 to 5 unique answer options."),
  correctAnswers: z.array(z.string()).min(1).describe("An array of one or more correct answers, each must exactly match one of the provided options."),
});

const GeneratedQuestionSchema = z.discriminatedUnion("type", [
  FillInTheBlankOutputSchema,
  SingleChoiceOutputSchema,
  MultipleChoiceOutputSchema,
]);

const GenerateTestQuestionsOutputSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).describe('An array of generated test questions.'),
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
The questions should be of type: {{questionType}}.
**Important**: Ensure that the questions, options, and answers are generated in the same language as the provided 'Lecture Content'.

**ЕСЛИ КОНТЕНТ НА РУССКОМ ЯЗЫКЕ, ВЕСЬ ВЫВОД (вопросы, варианты, ответы) В JSON ДОЛЖЕН БЫТЬ СТРОГО НА РУССКОМ ЯЗЫКЕ.**
**IF THE CONTENT IS IN RUSSIAN, ALL OUTPUT (questions, options, answers) IN THE JSON MUST BE STRICTLY IN RUSSIAN.**

Lecture Content:
{{{lectureContent}}}

Format your response as a JSON object containing a "questions" array. Each object in the array must adhere to the schema for the specified question type.

Here are examples for each question type:

1. If questionType is 'fill-in-the-blank':
   The "questionText" should include "___" to denote the blank.
   The "type" field must be "fill-in-the-blank".
   Example:
   {
     "questions": [
       {
         "type": "fill-in-the-blank",
         "questionText": "The capital of France is ___, known for the Eiffel Tower.",
         "correctAnswer": "Paris"
       }
     ]
   }

2. If questionType is 'single-choice':
   Provide 3 to 5 unique options. "correctAnswer" must be one of these options.
   The "type" field must be "single-choice".
   Example:
   {
     "questions": [
       {
         "type": "single-choice",
         "questionText": "What is the chemical symbol for water?",
         "options": ["O2", "H2O", "CO2", "NaCl"],
         "correctAnswer": "H2O"
       }
     ]
   }

3. If questionType is 'multiple-choice':
   Provide 3 to 5 unique options. "correctAnswers" must be an array containing one or more of these options.
   The "type" field must be "multiple-choice".
   Example:
   {
     "questions": [
       {
         "type": "multiple-choice",
         "questionText": "Which of the following are primary colors?",
         "options": ["Red", "Green", "Blue", "Yellow"],
         "correctAnswers": ["Red", "Blue", "Yellow"]
       }
     ]
   }
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
