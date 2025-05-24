
'use client';

import type React from 'react';
import { useRef, useState, type ChangeEvent } from 'react';
import { UploadCloud, LoaderCircle, FileText, Image as ImageIcon, FileType, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { UploadedFileInfo } from '@/types';
import mammoth from 'mammoth';

interface FileUploadFormProps {
  onFileProcessed: (info: UploadedFileInfo) => void;
  onProcessingStart: () => void;
  onProcessingError: (error: string) => void;
}

export default function FileUploadForm({ onFileProcessed, onProcessingStart, onProcessingError }: FileUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "Ошибка",
          description: "Размер файла не должен превышать 10MB.",
          variant: "destructive",
        });
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onProcessingError("Размер файла не должен превышать 10MB."); // Notify parent
        return;
      }
      setFile(selectedFile);
      onProcessingStart(); // Clear previous results when a new file is selected
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "Файл не выбран",
        description: "Пожалуйста, выберите файл.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    // onProcessingStart(); // Already called in handleFileChange, or should be called here?
                          // Let's ensure parent knows processing starts here specifically for the submit action.
    onProcessingStart(); 

    const fileName = file.name;
    const fileType = file.type || 'application/octet-stream';
    const fileSize = file.size;
    let processedInfo: UploadedFileInfo = { fileName, fileType, fileSize };

    const readFileAsDataURL = (fileToRead: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Не удалось прочитать файл изображения/PDF."));
        reader.readAsDataURL(fileToRead);
      });
    };

    try {
      if (fileType === 'text/plain' || fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.md')) {
        const textContent = await file.text();
        processedInfo = { ...processedInfo, textContent };
      } else if (fileName.toLowerCase().endsWith('.docx') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
          processedInfo = { ...processedInfo, textContent: rawText };
        } catch (extractError) {
          console.error("Error extracting text from .docx:", extractError);
          const errorMsg = "Не удалось извлечь текст из файла .docx. Возможно, файл поврежден или имеет неподдерживаемый формат.";
          processedInfo = { ...processedInfo, error: errorMsg };
        }
      } else if (fileType.startsWith('image/')) {
        const dataUri = await readFileAsDataURL(file);
        processedInfo = { ...processedInfo, dataUri };
      } else if (fileName.toLowerCase().endsWith('.pdf') || fileType === 'application/pdf') {
        const dataUri = await readFileAsDataURL(file);
        processedInfo = { ...processedInfo, dataUri }; // Pass PDF as dataUri for AI processing
      } else if (fileName.toLowerCase().endsWith('.doc') || fileType === 'application/msword') {
        const errorMsg = "Файлы .doc (старый формат Word) не могут быть проанализированы. Пожалуйста, используйте .docx или сконвертируйте файл.";
        processedInfo = { ...processedInfo, error: errorMsg };
      } else {
        const errorMsg = `Неподдерживаемый тип файла для локальной обработки или AI-анализа: ${fileType || fileName}. Поддерживаются .txt, .md, .docx, PDF, изображения.`;
        processedInfo = { ...processedInfo, error: errorMsg };
      }

      if (processedInfo.error) {
        onProcessingError(processedInfo.error);
        toast({ title: "Ошибка обработки файла", description: processedInfo.error, variant: processedInfo.error.includes(".doc ") ? "warning" : "destructive" });
      } else {
        onFileProcessed(processedInfo);
        // Toast for successful local processing can be handled by parent if needed, or here.
        // For now, parent will show toast upon AI analysis completion.
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Произошла неизвестная ошибка при обработке файла.";
      const finalErrorMsg = `Ошибка обработки файла: ${errorMessage}`;
      processedInfo = { ...processedInfo, error: finalErrorMsg };
      onProcessingError(finalErrorMsg);
      toast({ title: "Ошибка обработки файла", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return <UploadCloud className="mr-2 h-5 w-5" />;
    const lcFileName = file.name.toLowerCase();
    const fileType = file.type;

    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
    if (lcFileName.endsWith('.pdf')) return <FileQuestion className="h-5 w-5 text-red-500" />; // Using FileQuestion for PDF
    if (lcFileName.endsWith('.doc') || lcFileName.endsWith('.docx')) return <FileType className="h-5 w-5 text-blue-500" />;
    if (lcFileName.endsWith('.txt') || lcFileName.endsWith('.md')) return <FileText className="h-5 w-5 text-green-500" />;
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Загрузка и анализ лекции</CardTitle>
        <CardDescription>Загрузите файл лекции (.txt, .md, .docx, .pdf, изображение) для AI-анализа и генерации тестовых вопросов.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-upload" className="text-base">Выберите файл (до 10MB)</Label>
          <Input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            accept=".txt,.md,image/*,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,application/pdf,.doc,application/msword"
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
        <Button onClick={handleSubmit} disabled={!file || isProcessing} className="w-full text-lg py-6">
          {isProcessing ? (
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-5 w-5" />
          )}
          {isProcessing ? 'Обрабатываем...' : 'Обработать и анализировать'}
        </Button>
      </CardContent>
    </Card>
  );
}
