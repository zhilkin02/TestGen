
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
} from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, LoaderCircle, Info } from "lucide-react";
import { handleAnalyzeContent, type AnalyzeLectureContentInput } from '@/lib/actions';
import { handleGenerateQuestions } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";


export default function Home() {
  const [processedFileInfo, setProcessedFileInfo] = useState<UploadedFileInfo | null>(null); // Info for the *last* successfully processed file
  
  const [isProcessingBatch, setIsProcessingBatch] = useState(false); // True if FileUploadForm is processing a batch
  const [batchProcessingErrors, setBatchProcessingErrors] = useState<{fileName: string, error: string}[]>([]);

  const [analysisResult, setAnalysisResult] = useState<LectureAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [editableQuestions, setEditableQuestions] = useState<EditableQuestionItem[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionGenerationError, setQuestionGenerationError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetUIState = useCallback(() => {
    setProcessedFileInfo(null);
    setBatchProcessingErrors([]);
    setAnalysisResult(null);
    setAnalysisError(null);
    setEditableQuestions([]);
    setQuestionGenerationError(null);
  }, []);

  const handleBatchProcessingStart = useCallback(() => {
    setIsProcessingBatch(true);
    resetUIState(); // Clear all previous results and errors for a new batch
  }, [resetUIState]);

  const handleFileSuccessfullyProcessed = useCallback((info: UploadedFileInfo) => {
    // This will be called for each file in the batch.
    // The UI will reflect the *last* processed file for analysis.
    setProcessedFileInfo(info); 
    // Errors for *this specific file* are handled by its `info.error` if it's a validation/local processing error.
    // `batchProcessingErrors` handles errors from the loop in FileUploadForm.
    // If a file is successful, it won't have an error from the loop, so no need to clear batchProcessingErrors here.
  }, []);
  
  const handleFileProcessingFailure = useCallback((fileName: string, error: string) => {
    setBatchProcessingErrors(prev => [...prev, {fileName, error}]);
    // Potentially clear processedFileInfo if the last attempt was for this failed file
    // setProcessedFileInfo(null); // Or leave it to show the last successful one
  }, []);

  const handleBatchProcessingComplete = useCallback(() => {
    setIsProcessingBatch(false);
    if (batchProcessingErrors.length === 0 && !processedFileInfo) {
       // This case can happen if all files failed or no files were processed to success
       // or if only one file was uploaded and it failed.
    }
  }, [batchProcessingErrors.length, processedFileInfo]);


  useEffect(() => {
    // This effect triggers analysis for the `processedFileInfo` (i.e., the last successfully processed file from a batch)
    if (processedFileInfo && !processedFileInfo.error && !isProcessingBatch) { // Check !isProcessingBatch to avoid triggering during batch
      const analyze = async () => {
        setIsAnalyzing(true);
        setAnalysisError(null);
        // Keep existing analysisResult if a new file from batch is being analyzed,
        // or clear it if it's a totally new operation (handleBatchProcessingStart clears it).
        // setAnalysisResult(null); 
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
          consterrMsg = `Файл ${processedFileInfo.fileName} (${processedFileInfo.fileType}) не поддерживается для AI анализа.`;
          setAnalysisError(errMsg);
          setIsAnalyzing(false);
          toast({ title: "Ошибка анализа", description: errMsg, variant: "destructive" });
          return;
        }
        
        try {
          toast({ title: `Анализ файла: ${processedFileInfo.fileName}`, description: "Начало AI-анализа контента..." });
          const result = await handleAnalyzeContent(analysisInput);
          if ('error' in result) {
            setAnalysisError(result.error);
            setAnalysisResult(null);
            toast({ title: `Ошибка анализа: ${processedFileInfo.fileName}`, description: result.error, variant: "destructive" });
          } else {
            setAnalysisResult(result);
            setAnalysisError(null);
            toast({ title: `Анализ завершен: ${processedFileInfo.fileName}`, description: "Контент успешно проанализирован." });
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Неизвестная ошибка при анализе.";
          setAnalysisError(`Ошибка анализа для ${processedFileInfo.fileName}: ${errorMsg}`);
          setAnalysisResult(null);
          toast({ title: `Критическая ошибка анализа: ${processedFileInfo.fileName}`, description: errorMsg, variant: "destructive" });
        } finally {
          setIsAnalyzing(false);
        }
      };
      analyze();
    }
  }, [processedFileInfo, isProcessingBatch, toast]);

  const onQuestionGenerationStartCallback = useCallback(async (numQuestions: number, difficulty: 'easy' | 'medium' | 'hard', questionType: QuestionType) => {
    if (!analysisResult || !analysisResult.summary) {
      setQuestionGenerationError("Нет данных анализа для генерации вопросов.");
      toast({ title: "Ошибка", description: "Нет данных анализа для генерации вопросов.", variant: "destructive"});
      return;
    }
    if (!processedFileInfo) {
       setQuestionGenerationError("Нет информации о файле для контекста генерации.");
      toast({ title: "Ошибка", description: "Нет информации о файле для контекста генерации.", variant: "destructive"});
      return;
    }


    setIsGeneratingQuestions(true);
    setQuestionGenerationError(null);
    setEditableQuestions([]);

    try {
      toast({ title: `Генерация вопросов для: ${processedFileInfo.fileName}`, description: "Начало генерации тестовых вопросов..." });
      const result = await handleGenerateQuestions({
        lectureContent: analysisResult.summary,
        numberOfQuestions: numQuestions,
        questionDifficulty: difficulty,
        questionType: questionType,
      });

      if ('error'in result) {
        setQuestionGenerationError(result.error);
        setEditableQuestions([]);
        toast({ title: `Ошибка генерации вопросов: ${processedFileInfo.fileName}`, description: result.error, variant: "destructive"});
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
              console.error("Unknown question type from AI:", q);
              return null; 
          }
        }).filter(q => q !== null) as EditableQuestionItem[];
        
        setEditableQuestions(newEditableQuestions);
        setQuestionGenerationError(null);
        toast({ title: `Вопросы сгенерированы: ${processedFileInfo.fileName}`, description: "Тестовые вопросы успешно созданы."});
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Неизвестная ошибка при генерации вопросов.";
      setQuestionGenerationError(`Ошибка генерации для ${processedFileInfo.fileName}: ${errorMsg}`);
      setEditableQuestions([]);
      toast({ title: `Критическая ошибка генерации: ${processedFileInfo.fileName}`, description: errorMsg, variant: "destructive"});
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [analysisResult, processedFileInfo, toast]);

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
              onBatchProcessingStart={handleBatchProcessingStart}
              onFileSuccessfullyProcessed={handleFileSuccessfullyProcessed}
              onFileProcessingFailure={handleFileProcessingFailure}
              onBatchProcessingComplete={handleBatchProcessingComplete}
            />
            {isProcessingBatch && (
               <div className="p-6 border rounded-xl bg-card shadow-lg">
                <p className="text-center text-primary animate-pulse flex items-center justify-center"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Идет пакетная обработка файлов...</p>
              </div>
            )}
            {batchProcessingErrors.length > 0 && !isProcessingBatch && (
              <Alert variant="destructive" className="shadow-md rounded-xl">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Ошибки при обработке файлов в пакете!</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 space-y-1">
                    {batchProcessingErrors.map((err, index) => (
                      <li key={index}><strong>{err.fileName}:</strong> {err.error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {isAnalyzing && (
              <div className="p-6 border rounded-xl bg-card shadow-lg mt-4">
                 <p className="text-center text-primary animate-pulse flex items-center justify-center"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Идет анализ контента {processedFileInfo ? `для ${processedFileInfo.fileName}` : ''}...</p>
              </div>
            )}
            {analysisError && !isAnalyzing && ( // Shows error for the last analysis attempt
              <Alert variant="destructive" className="shadow-md rounded-xl mt-4">
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
             {!isProcessingBatch && !processedFileInfo && batchProcessingErrors.length === 0 && !analysisResult && !isAnalyzing && !analysisError && (
                 <div className="p-6 border rounded-xl bg-card shadow-lg text-center mt-8">
                    <Info className="h-6 w-6 mx-auto mb-2 text-muted-foreground"/>
                    <p className="text-muted-foreground">Загрузите файлы, чтобы начать.</p>
                </div>
            )}
          </div>
          
          <div className="md:sticky md:top-8 space-y-8">
            {/* FileInfoDisplay shows info for the LAST successfully processed file that triggered analysis */}
            {processedFileInfo && !isProcessingBatch && (
              <FileInfoDisplay fileInfo={processedFileInfo} />
            )}
            
            {isGeneratingQuestions && (
              <div className="p-6 border rounded-xl bg-card shadow-lg">
                <p className="text-center text-primary animate-pulse flex items-center justify-center"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Идет генерация вопросов {processedFileInfo ? `для ${processedFileInfo.fileName}` : ''}...</p>
              </div>
            )}
            {questionGenerationError && !isGeneratingQuestions && ( // Shows error for last question gen attempt
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
            {/* Placeholder when analysis is done but no questions generated yet */}
            {analysisResult && !isAnalyzing && !analysisError && editableQuestions.length === 0 && !isGeneratingQuestions && !questionGenerationError && (
              <div className="p-6 border rounded-xl bg-card shadow-lg text-center">
                  <p className="text-muted-foreground">Сгенерируйте вопросы на основе результатов анализа {processedFileInfo ? `для ${processedFileInfo.fileName}` : ''}.</p>
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

