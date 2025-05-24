'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AppHeader from '@/components/app/AppHeader';
import FileUploadForm from '@/components/app/FileUploadForm';
import AnalysisResults from '@/components/app/AnalysisResults';
import QuestionGenerationForm from '@/components/app/QuestionGenerationForm';
import QuestionEditor from '@/components/app/QuestionEditor';
import type { LectureAnalysisResult, EditableQuestionItem } from '@/types';
import type { GenerateTestQuestionsOutput } from '@/ai/flows/generate-test-questions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<LectureAnalysisResult | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<EditableQuestionItem[]>([]);
  const [currentError, setCurrentError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const handleAnalysisStart = () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setGeneratedQuestions([]);
    setCurrentError(null);
  };

  const handleAnalysisComplete = (result: LectureAnalysisResult) => {
    setIsAnalyzing(false);
    setAnalysisResult(result);
    setCurrentError(null);
  };

  const handleAnalysisError = (error: string) => {
    setIsAnalyzing(false);
    setCurrentError(error);
  };

  const handleGenerationStart = () => {
    setIsGeneratingQuestions(true);
    setGeneratedQuestions([]);
    setCurrentError(null);
  };

  const handleGenerationComplete = (questions: GenerateTestQuestionsOutput['questions']) => {
    setIsGeneratingQuestions(false);
    const editableQuestions: EditableQuestionItem[] = questions.map((q, index) => ({
      ...q,
      id: `q-${Date.now()}-${index}`, // Simple unique ID
      selected: true, // Auto-select new questions
      editedQuestion: q.question,
      editedAnswer: q.answer,
    }));
    setGeneratedQuestions(editableQuestions);
    setCurrentError(null);
  };

  const handleGenerationError = (error: string) => {
    setIsGeneratingQuestions(false);
    setCurrentError(error);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/30">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            <FileUploadForm
              onAnalysisStart={handleAnalysisStart}
              onAnalysisComplete={handleAnalysisComplete}
              onAnalysisError={handleAnalysisError}
            />
            {currentError && (
              <Alert variant="destructive" className="shadow-md rounded-xl">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Ошибка!</AlertTitle>
                <AlertDescription>{currentError}</AlertDescription>
              </Alert>
            )}
            {isAnalyzing && !analysisResult && (
               <div className="p-6 border rounded-xl bg-card shadow-lg">
                <p className="text-center text-primary animate-pulse">Идет анализ файла...</p>
              </div>
            )}
            {analysisResult && (
              <>
                <AnalysisResults results={analysisResult} />
                <QuestionGenerationForm
                  analysisSummary={analysisResult.summary}
                  onGenerationStart={handleGenerationStart}
                  onGenerationComplete={handleGenerationComplete}
                  onGenerationError={handleGenerationError}
                />
              </>
            )}
             {isGeneratingQuestions && !generatedQuestions.length && (
               <div className="p-6 border rounded-xl bg-card shadow-lg">
                <p className="text-center text-primary animate-pulse">Идет генерация вопросов...</p>
              </div>
            )}
          </div>
          
          <div className="md:sticky md:top-8">
             <QuestionEditor 
                initialQuestions={generatedQuestions} 
                isLoading={isGeneratingQuestions && generatedQuestions.length === 0} 
              />
          </div>
        </div>
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        © {new Date().getFullYear()} ТестГен. Все права защищены.
      </footer>
    </div>
  );
}
