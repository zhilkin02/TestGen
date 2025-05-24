'use server';

import { analyzeLectureContent, type AnalyzeLectureContentInput, type AnalyzeLectureContentOutput } from '@/ai/flows/analyze-lecture-content';
import { generateTestQuestions, type GenerateTestQuestionsInput, type GenerateTestQuestionsOutput } from '@/ai/flows/generate-test-questions';

export async function handleAnalyzeContent(input: AnalyzeLectureContentInput): Promise<AnalyzeLectureContentOutput | { error: string }> {
  try {
    const result = await analyzeLectureContent(input);
    return result;
  } catch (e) {
    console.error("Error analyzing content:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during analysis.";
    return { error: `Не удалось проанализировать контент: ${errorMessage}` };
  }
}

export async function handleGenerateQuestions(input: GenerateTestQuestionsInput): Promise<GenerateTestQuestionsOutput | { error: string }> {
  try {
    const result = await generateTestQuestions(input);
    return result;
  } catch (e) {
    console.error("Error generating questions:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during question generation.";
    return { error: `Не удалось сгенерировать вопросы: ${errorMessage}` };
  }
}
