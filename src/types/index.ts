import type { AnalyzeLectureContentOutput } from '@/ai/flows/analyze-lecture-content';
import type { GenerateTestQuestionsOutput } from '@/ai/flows/generate-test-questions';

export type LectureAnalysisResult = AnalyzeLectureContentOutput;

export type GeneratedQuestionItem = GenerateTestQuestionsOutput['questions'][0] & {
  id: string;
  selected: boolean;
};

export type EditableQuestionItem = GeneratedQuestionItem & {
  editedQuestion: string;
  editedAnswer: string;
};
