
'use client';

import { useState, useEffect, useCallback } from 'react';
import AppHeader from '@/components/app/AppHeader';
import FileUploadForm from '@/components/app/FileUploadForm';
import FileInfoDisplay from '@/components/app/FileInfoDisplay';
import AnalysisResults from '@/components/app/AnalysisResults';
import QuestionGenerationForm from '@/components/app/QuestionGenerationForm';
import QuestionEditor from '@/components/app/QuestionEditor';
import type { 
  UploadedFileInfo, 
  LectureAnalysisResult, 
  EditableQuestionItem, 
  GeneratedQuestion,
  QuestionType,
  EditableFillInTheBlankQuestion,
  EditableSingleChoiceQuestion,
  EditableMultipleChoiceQuestion,
  EditableOption
} from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, LoaderCircle } from "lucide-react";
import { handleAnalyzeContent, type AnalyzeLectureContentInput } from '@/lib/actions';
import { handleGenerateQuestions } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";


export default function Home() {
  const [processedFileInfo, setProcessedFileInfo] = useState<UploadedFileInfo | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<LectureAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [editableQuestions, setEditableQuestions] = useState<EditableQuestionItem[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionGenerationError, setQuestionGenerationError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetAIState = useCallback(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
    setEditableQuestions([]);
    setQuestionGenerationError(null);
  }, []);

  const handleProcessingStart = useCallback(() => {
    setIsProcessingFile(true);
    setProcessedFileInfo(null);
    setCurrentError(null);
    resetAIState();
  }, [resetAIState]);

  const handleFileProcessed = useCallback((info: UploadedFileInfo) => {
    setIsProcessingFile(false);
    if (info.error) {
      setCurrentError(info.error);
      setProcessedFileInfo(null); 
      resetAIState(); 
    } else {
      setProcessedFileInfo(info);
      setCurrentError(null);
    }
  }, [resetAIState]);
  
  const handleProcessingError = useCallback((error: string) => {
    setIsProcessingFile(false);
    setCurrentError(error);
    setProcessedFileInfo(null);
    resetAIState();
  }, [resetAIState]);

  useEffect(() => {
    if (processedFileInfo && !processedFileInfo.error) {
      const analyze = async () => {
        setIsAnalyzing(true);
        setAnalysisError(null);
        setAnalysisResult(null);
        setEditableQuestions([]); 
        setQuestionGenerationError(null);

        let analysisInput: AnalyzeLectureContentInput;

        if (processedFileInfo.textContent) {
          analysisInput = {
            contentType: 'text',
            rawTextContent: processedFileInfo.textContent,
          };
        } else if (processedFileInfo.dataUri && processedFileInfo.fileType.startsWith('image/')) {
          analysisInput = {
            contentType: 'image',
            contentDataUri: processedFileInfo.dataUri,
          };
        } else if (processedFileInfo.dataUri && processedFileInfo.fileType === 'application/pdf') {
           analysisInput = {
            contentType: 'pdf',
            contentDataUri: processedFileInfo.dataUri,
          };
        } else {
          setAnalysisError("Тип файла не поддерживается для AI анализа (требуется текст, изображение или PDF).");
          setIsAnalyzing(false);
          return;
        }
        
        try {
          const result = await handleAnalyzeContent(analysisInput);
          if ('error' in result) {
            setAnalysisError(result.error);
            setAnalysisResult(null);
            toast({ title: "Ошибка анализа", description: result.error, variant: "destructive" });
          } else {
            setAnalysisResult(result);
            setAnalysisError(null);
            toast({ title: "Анализ завершен", description: "Контент успешно проанализирован." });
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Неизвестная ошибка при анализе.";
          setAnalysisError(`Ошибка анализа: ${errorMsg}`);
          setAnalysisResult(null);
          toast({ title: "Критическая ошибка анализа", description: errorMsg, variant: "destructive" });
        } finally {
          setIsAnalyzing(false);
        }
      };
      analyze();
    }
  }, [processedFileInfo, toast]);

  const onQuestionGenerationStartCallback = useCallback(async (numQuestions: number, difficulty: 'easy' | 'medium' | 'hard', questionType: QuestionType) => {
    if (!analysisResult || !analysisResult.summary) {
      setQuestionGenerationError("Нет данных анализа для генерации вопросов.");
      toast({ title: "Ошибка", description: "Нет данных анализа для генерации вопросов.", variant: "destructive"});
      return;
    }

    setIsGeneratingQuestions(true);
    setQuestionGenerationError(null);
    setEditableQuestions([]);

    try {
      const result = await handleGenerateQuestions({
        lectureContent: analysisResult.summary,
        numberOfQuestions: numQuestions,
        questionDifficulty: difficulty,
        questionType: questionType,
      });

      if ('error'in result) {
        setQuestionGenerationError(result.error);
        setEditableQuestions([]);
        toast({ title: "Ошибка генерации вопросов", description: result.error, variant: "destructive"});
      } else {
        const newEditableQuestions = result.questions.map((q: GeneratedQuestion) => {
          const baseEditable = {
            id: uuidv4(),
            selected: true,
            editedQuestionText: q.questionText,
          };
          switch (q.type) {
            case 'fill-in-the-blank':
              return {
                ...baseEditable,
                type: q.type,
                originalQuestion: q,
                editedCorrectAnswer: q.correctAnswer,
              } as EditableFillInTheBlankQuestion;
            case 'single-choice':
              return {
                ...baseEditable,
                type: q.type,
                originalQuestion: q,
                editedOptions: q.options.map(opt => ({ id: uuidv4(), text: opt })),
                editedCorrectAnswer: q.correctAnswer,
              } as EditableSingleChoiceQuestion;
            case 'multiple-choice':
              return {
                ...baseEditable,
                type: q.type,
                originalQuestion: q,
                editedOptions: q.options.map(opt => ({ id: uuidv4(), text: opt })),
                editedCorrectAnswers: q.correctAnswers,
              } as EditableMultipleChoiceQuestion;
            default:
              // Should not happen if types are exhaustive
              console.error("Unknown question type from AI:", q);
              return null; 
          }
        }).filter(q => q !== null) as EditableQuestionItem[];
        
        setEditableQuestions(newEditableQuestions);
        setQuestionGenerationError(null);
        toast({ title: "Вопросы сгенерированы", description: "Тестовые вопросы успешно созданы."});
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Неизвестная ошибка при генерации вопросов.";
      setQuestionGenerationError(`Ошибка генерации: ${errorMsg}`);
      setEditableQuestions([]);
      toast({ title: "Критическая ошибка генерации", description: errorMsg, variant: "destructive"});
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [analysisResult, toast]);

  const handleUpdateEditableQuestion = (updatedQuestion: EditableQuestionItem) => {
    setEditableQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
  };

  const handleDeleteEditableQuestion = (questionId: string) => {
    setEditableQuestions(prev => prev.filter(q => q.id !== questionId));
     toast({ title: "Вопрос удален" });
  };


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/30">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <FileUploadForm
              onProcessingStart={handleProcessingStart}
              onFileProcessed={handleFileProcessed}
              onProcessingError={handleProcessingError}
            />
            {currentError && !isProcessingFile && (
              <Alert variant="destructive" className="shadow-md rounded-xl">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Ошибка загрузки файла!</AlertTitle>
                <AlertDescription>{currentError}</AlertDescription>
              </Alert>
            )}
            {isProcessingFile && (
               <div className="p-6 border rounded-xl bg-card shadow-lg">
                <p className="text-center text-primary animate-pulse flex items-center justify-center"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Идет обработка файла...</p>
              </div>
            )}

            {isAnalyzing && (
              <div className="p-6 border rounded-xl bg-card shadow-lg mt-8">
                 <p className="text-center text-primary animate-pulse flex items-center justify-center"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Идет анализ контента...</p>
              </div>
            )}
            {analysisError && !isAnalyzing && (
              <Alert variant="destructive" className="shadow-md rounded-xl mt-8">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Ошибка анализа!</AlertTitle>
                <AlertDescription>{analysisError}</AlertDescription>
              </Alert>
            )}
            {analysisResult && !isAnalyzing && !analysisError && (
              <>
                <AnalysisResults results={analysisResult} />
                 <QuestionGenerationForm
                  analysisSummary={analysisResult.summary}
                  onGenerationStartParams={onQuestionGenerationStartCallback}
                  isLoading={isGeneratingQuestions}
                />
              </>
            )}
          </div>
          
          <div className="md:sticky md:top-8 space-y-8">
            {processedFileInfo && !processedFileInfo.error && !isProcessingFile && (
              <FileInfoDisplay fileInfo={processedFileInfo} />
            )}
             {!processedFileInfo && !isProcessingFile && !currentError && !analysisResult && !isAnalyzing && !analysisError && (
                 <div className="p-6 border rounded-xl bg-card shadow-lg text-center">
                    <p className="text-muted-foreground">Загрузите файл, чтобы увидеть информацию о нем и начать анализ.</p>
                </div>
            )}
            
            {isGeneratingQuestions && (
              <div className="p-6 border rounded-xl bg-card shadow-lg">
                <p className="text-center text-primary animate-pulse flex items-center justify-center"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Идет генерация вопросов...</p>
              </div>
            )}
            {questionGenerationError && !isGeneratingQuestions && (
              <Alert variant="destructive" className="shadow-md rounded-xl">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Ошибка генерации вопросов!</AlertTitle>
                <AlertDescription>{questionGenerationError}</AlertDescription>
              </Alert>
            )}
            {(editableQuestions.length > 0 || isGeneratingQuestions) && !questionGenerationError && (
              <QuestionEditor 
                questions={editableQuestions} 
                isLoading={isGeneratingQuestions}
                onQuestionUpdate={handleUpdateEditableQuestion}
                onQuestionDelete={handleDeleteEditableQuestion}
              />
            )}
            {analysisResult && !isAnalyzing && !analysisError && editableQuestions.length === 0 && !isGeneratingQuestions && !questionGenerationError && (
              <div className="p-6 border rounded-xl bg-card shadow-lg text-center">
                  <p className="text-muted-foreground">Сгенерируйте вопросы на основе результатов анализа.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        © {new Date().getFullYear()} ТестГен. Все права защищены.
      </footer>
    </div>
  );
}

// Update prop type for QuestionGenerationForm in page.tsx scope for clarity
declare module '@/components/app/QuestionGenerationForm' {
  interface QuestionGenerationFormProps {
    analysisSummary: string;
    onGenerationStartParams: (numQuestions: number, difficulty: 'easy' | 'medium' | 'hard', questionType: QuestionType) => void;
    isLoading?: boolean;
  }
}

// Update prop types for QuestionEditor
declare module '@/components/app/QuestionEditor' {
  interface QuestionEditorProps {
    questions: EditableQuestionItem[];
    isLoading?: boolean;
    onQuestionUpdate: (updatedQuestion: EditableQuestionItem) => void;
    onQuestionDelete: (questionId: string) => void;
  }
}
