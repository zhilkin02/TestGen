
'use client';

import type React from 'react';
import { useRef, useState, type ChangeEvent } from 'react';
import { UploadCloud, LoaderCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { handleAnalyzeContent } from '@/lib/actions';
import type { AnalyzeLectureContentOutput } from '@/ai/flows/analyze-lecture-content';

interface FileUploadFormProps {
  onAnalysisStart: () => void;
  onAnalysisComplete: (result: AnalyzeLectureContentOutput) => void;
  onAnalysisError: (error: string) => void;
}

export default function FileUploadForm({ onAnalysisStart, onAnalysisComplete, onAnalysisError }: FileUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Ошибка",
          description: "Размер файла не должен превышать 5MB.",
          variant: "destructive",
        });
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "Файл не выбран",
        description: "Пожалуйста, выберите файл для анализа.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    onAnalysisStart();

    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    try {
      // Handle text files (.txt, .md)
      if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        const textContent = await file.text();
        const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(textContent)}`;
        
        const result = await handleAnalyzeContent({ contentDataUri: dataUri, contentType: 'text' });
        
        if ('error' in result) {
          onAnalysisError(result.error);
          toast({ title: "Ошибка анализа", description: result.error, variant: "destructive" });
        } else {
          onAnalysisComplete(result);
          toast({ title: "Анализ завершен", description: "Ключевые понятия и темы были успешно извлечены." });
        }
        setIsAnalyzing(false);
      } 
      // Handle image files
      else if (fileType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const contentDataUri = reader.result as string;
          const result = await handleAnalyzeContent({ contentDataUri, contentType: 'image' });

          if ('error' in result) {
            onAnalysisError(result.error);
            toast({ title: "Ошибка анализа", description: result.error, variant: "destructive" });
          } else {
            onAnalysisComplete(result);
            toast({ title: "Анализ завершен", description: "Ключевые понятия и темы были успешно извлечены." });
          }
          setIsAnalyzing(false);
        };
        reader.onerror = () => {
          const errorMsg = "Не удалось прочитать файл изображения.";
          onAnalysisError(errorMsg);
          toast({ title: "Ошибка чтения файла", description: errorMsg, variant: "destructive" });
          setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
        // For image files, setIsAnalyzing(false) is handled in onloadend/onerror, so we return early.
        return; 
      }
      // Handle DOC, DOCX, PDF (selectable but not processable by current AI flow)
      else if (
        fileName.endsWith('.doc') || fileName.endsWith('.docx') || 
        fileType === 'application/msword' || 
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.pdf') || fileType === 'application/pdf'
      ) {
        const errorMsg = "Анализ файлов DOC, DOCX и PDF пока не поддерживается. Пожалуйста, выберите текстовый файл (.txt, .md) или изображение.";
        onAnalysisError(errorMsg);
        toast({
          title: "Формат файла не поддерживается для анализа",
          description: errorMsg,
          variant: "destructive",
        });
        setIsAnalyzing(false);
      }
      // Handle other unsupported file types
      else {
        const errorMsg = "Неподдерживаемый тип файла. Пожалуйста, загрузите текстовый (.txt, .md), изображение, DOC, DOCX или PDF файл.";
        onAnalysisError(errorMsg);
        toast({
          title: "Ошибка типа файла",
          description: errorMsg,
          variant: "destructive",
        });
        setIsAnalyzing(false);
      }
    } catch (error) { // Catch errors from file.text() or other unexpected issues
      const errorMessage = error instanceof Error ? error.message : "Произошла неизвестная ошибка при обработке файла.";
      const finalErrorMsg = `Ошибка обработки файла: ${errorMessage}`;
      onAnalysisError(finalErrorMsg);
      toast({
        title: "Ошибка обработки файла",
        description: errorMessage,
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
    // No finally block for setIsAnalyzing(false) because image processing handles it asynchronously.
    // For non-image paths, it's handled directly within their blocks.
  };

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Загрузка файла лекции</CardTitle>
        <CardDescription>Загрузите файл для анализа (.txt, .md, .doc, .docx, .pdf или изображение).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-upload" className="text-base">Выберите файл</Label>
          <Input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            accept=".txt,.md,image/*,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf"
            onChange={handleFileChange}
            className="text-base file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
        </div>
        {file && (
          <div className="p-3 border rounded-md bg-secondary/50 flex items-center gap-3">
            {file.type.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-muted-foreground" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
            <span className="text-sm text-foreground truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground ml-auto">({(file.size / 1024).toFixed(2)} KB)</span>
          </div>
        )}
        <Button onClick={handleSubmit} disabled={!file || isAnalyzing} className="w-full text-lg py-6">
          {isAnalyzing ? (
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-5 w-5" />
          )}
          {isAnalyzing ? 'Анализируем...' : 'Анализировать'}
        </Button>
      </CardContent>
    </Card>
  );
}

    