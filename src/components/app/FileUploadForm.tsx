
'use client';

import type React from 'react';
import { useRef, useState, type ChangeEvent } from 'react';
import { UploadCloud, LoaderCircle, FileText, Image as ImageIcon, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { handleAnalyzeContent } from '@/lib/actions';
import type { AnalyzeLectureContentOutput } from '@/ai/flows/analyze-lecture-content';
import mammoth from 'mammoth';

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
      let analysisInput: { contentDataUri: string; contentType: 'text' | 'image' | 'pdf' } | null = null;
      let successMessage = "Анализ завершен. Ключевые понятия и темы были успешно извлечены.";

      // Handle text files (.txt, .md)
      if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        const textContent = await file.text();
        const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(textContent)}`;
        analysisInput = { contentDataUri: dataUri, contentType: 'text' };
      }
      // Handle .docx files
      else if (fileName.endsWith('.docx') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
          const dataUri = `data:text/plain;charset=utf-8,${encodeURIComponent(rawText)}`;
          analysisInput = { contentDataUri: dataUri, contentType: 'text' };
          successMessage = "Текст из .docx файла успешно извлечен и проанализирован.";
        } catch (extractError) {
          console.error("Error extracting text from .docx:", extractError);
          const errorMsg = "Не удалось извлечь текст из файла .docx. Возможно, файл поврежден или имеет неподдерживаемый формат.";
          onAnalysisError(errorMsg);
          toast({ title: "Ошибка обработки .docx", description: errorMsg, variant: "destructive" });
          setIsAnalyzing(false);
          return;
        }
      }
      // Handle image files
      else if (fileType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const contentDataUri = reader.result as string;
          try {
            const result = await handleAnalyzeContent({ contentDataUri, contentType: 'image' });
            if ('error' in result) {
              onAnalysisError(result.error);
              toast({ title: "Ошибка анализа изображения", description: result.error, variant: "destructive" });
            } else {
              onAnalysisComplete(result);
              toast({ title: "Анализ изображения завершен", description: "Ключевые понятия и темы были успешно извлечены." });
            }
          } catch (e) {
             const errorMsg = e instanceof Error ? e.message : "Произошла неизвестная ошибка при анализе изображения.";
             onAnalysisError(errorMsg);
             toast({ title: "Ошибка анализа изображения", description: errorMsg, variant: "destructive" });
          } finally {
            setIsAnalyzing(false);
          }
        };
        reader.onerror = () => {
          const errorMsg = "Не удалось прочитать файл изображения.";
          onAnalysisError(errorMsg);
          toast({ title: "Ошибка чтения файла", description: errorMsg, variant: "destructive" });
          setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
        return; // Async handling for images
      }
      // Handle PDF files
      else if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const contentDataUri = reader.result as string;
           try {
            const result = await handleAnalyzeContent({ contentDataUri, contentType: 'pdf' });
            if ('error' in result) {
              onAnalysisError(result.error);
              toast({ title: "Ошибка анализа PDF", description: result.error, variant: "destructive" });
            } else {
              onAnalysisComplete(result);
              toast({ title: "Анализ PDF завершен", description: "Ключевые понятия и темы были успешно извлечены из PDF." });
            }
          } catch (e) {
             const errorMsg = e instanceof Error ? e.message : "Произошла неизвестная ошибка при анализе PDF.";
             onAnalysisError(errorMsg);
             toast({ title: "Ошибка анализа PDF", description: errorMsg, variant: "destructive" });
          } finally {
            setIsAnalyzing(false);
          }
        };
        reader.onerror = () => {
          const errorMsg = "Не удалось прочитать PDF файл.";
          onAnalysisError(errorMsg);
          toast({ title: "Ошибка чтения файла PDF", description: errorMsg, variant: "destructive" });
          setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
        return; // Async handling for PDF
      }
      // Handle .doc files (analysis not supported)
      else if (fileName.endsWith('.doc') || fileType === 'application/msword') {
        const errorMsg = "Анализ файлов .doc (старый формат Word) пока не поддерживается. Пожалуйста, используйте формат .docx, .pdf, текстовый файл или изображение.";
        onAnalysisError(errorMsg);
        toast({
          title: "Формат .doc не поддерживается для анализа",
          description: errorMsg,
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }
      // Handle other unsupported file types
      else {
        const errorMsg = "Неподдерживаемый тип файла. Пожалуйста, загрузите текстовый (.txt, .md), .docx, .pdf или файл изображения.";
        onAnalysisError(errorMsg);
        toast({
          title: "Ошибка типа файла",
          description: errorMsg,
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }

      if (analysisInput) {
        const result = await handleAnalyzeContent(analysisInput);
        if ('error' in result) {
          onAnalysisError(result.error);
          toast({ title: "Ошибка анализа", description: result.error, variant: "destructive" });
        } else {
          onAnalysisComplete(result);
          toast({ title: "Анализ завершен", description: successMessage });
        }
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
    } finally {
      // For non-async paths (text, docx), set isAnalyzing to false. Async paths (image, pdf) handle it in their callbacks.
      if (!(fileType.startsWith('image/') || fileName.endsWith('.pdf') || fileType === 'application/pdf')) {
        setIsAnalyzing(false);
      }
    }
  };
  
  const getFileIcon = () => {
    if (!file) return <UploadCloud className="mr-2 h-5 w-5" />;
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
    if (fileName.endsWith('.pdf')) return <FileType className="h-5 w-5 text-muted-foreground" />; // Or a specific PDF icon if available
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return <FileType className="h-5 w-5 text-muted-foreground" />; // Or a specific Word icon
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };


  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Загрузка файла лекции</CardTitle>
        <CardDescription>Загрузите файл для анализа (.txt, .md, .docx, .pdf или изображение). Анализ файлов .doc пока не поддерживается.</CardDescription>
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
            {getFileIcon()}
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
