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

    const reader = new FileReader();
    reader.onloadend = async () => {
      const contentDataUri = reader.result as string;
      const contentType = file.type.startsWith('image/') ? 'image' : 'text';
      
      if (contentType === 'text' && !file.type.startsWith('text/')) {
         toast({
          title: "Неподдерживаемый тип файла",
          description: "Для текстового анализа поддерживаются только файлы .txt или .md.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        onAnalysisError("Неподдерживаемый тип файла");
        return;
      }


      const result = await handleAnalyzeContent({ contentDataUri, contentType });

      setIsAnalyzing(false);
      if ('error' in result) {
        onAnalysisError(result.error);
        toast({
          title: "Ошибка анализа",
          description: result.error,
          variant: "destructive",
        });
      } else {
        onAnalysisComplete(result);
        toast({
          title: "Анализ завершен",
          description: "Ключевые понятия и темы были успешно извлечены.",
        });
      }
    };

    reader.onerror = () => {
      setIsAnalyzing(false);
      const errorMsg = "Не удалось прочитать файл.";
      onAnalysisError(errorMsg);
      toast({
        title: "Ошибка чтения файла",
        description: errorMsg,
        variant: "destructive",
      });
    };
    
    if (file.type.startsWith('text/plain') || file.name.endsWith('.md')) {
      reader.readAsText(file); // Read as text, then convert to data URI manually if needed.
      // The AI flow expects a data URI. We'll construct it.
      const textContent = await file.text();
      const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(textContent)}`;
      const contentType = 'text';
      
      const result = await handleAnalyzeContent({ contentDataUri: dataUri, contentType });
      setIsAnalyzing(false);
      if ('error' in result) {
        onAnalysisError(result.error);
        toast({
          title: "Ошибка анализа",
          description: result.error,
          variant: "destructive",
        });
      } else {
        onAnalysisComplete(result);
        toast({
          title: "Анализ завершен",
          description: "Ключевые понятия и темы были успешно извлечены.",
        });
      }

    } else if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      setIsAnalyzing(false);
      const errorMsg = "Неподдерживаемый тип файла. Пожалуйста, загрузите текстовый файл (.txt, .md) или изображение.";
      onAnalysisError(errorMsg);
      toast({
          title: "Ошибка типа файла",
          description: errorMsg,
          variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Загрузка файла лекции</CardTitle>
        <CardDescription>Загрузите текстовый файл (.txt, .md) или изображение для анализа.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-upload" className="text-base">Выберите файл</Label>
          <Input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            accept=".txt,.md,image/*"
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
