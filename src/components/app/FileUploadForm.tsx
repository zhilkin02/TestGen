
'use client';

import type React from 'react';
import { useRef, useState, type ChangeEvent } from 'react';
import { UploadCloud, LoaderCircle, FileText, Image as ImageIcon, FileType } from 'lucide-react';
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
    onProcessingStart();

    const fileName = file.name;
    const fileType = file.type || 'application/octet-stream'; // Fallback for unknown types
    const fileSize = file.size;
    let processedInfo: UploadedFileInfo = { fileName, fileType, fileSize };

    try {
      // Handle text files (.txt, .md)
      if (fileType === 'text/plain' || fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.md')) {
        const textContent = await file.text();
        processedInfo = { ...processedInfo, textContent };
        toast({ title: "Файл обработан", description: "Текст из файла успешно извлечен." });
      }
      // Handle .docx files
      else if (fileName.toLowerCase().endsWith('.docx') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
          processedInfo = { ...processedInfo, textContent: rawText };
          toast({ title: "Файл .docx обработан", description: "Текст из .docx файла успешно извлечен." });
        } catch (extractError) {
          console.error("Error extracting text from .docx:", extractError);
          const errorMsg = "Не удалось извлечь текст из файла .docx. Возможно, файл поврежден или имеет неподдерживаемый формат.";
          processedInfo = { ...processedInfo, error: errorMsg };
          onProcessingError(errorMsg);
          toast({ title: "Ошибка обработки .docx", description: errorMsg, variant: "destructive" });
        }
      }
      // Handle image files
      else if (fileType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUri = reader.result as string;
          onFileProcessed({ ...processedInfo, dataUri });
          toast({ title: "Изображение загружено", description: "Файл изображения готов к предпросмотру." });
          setIsProcessing(false);
        };
        reader.onerror = () => {
          const errorMsg = "Не удалось прочитать файл изображения.";
          onFileProcessed({ ...processedInfo, error: errorMsg });
          onProcessingError(errorMsg);
          toast({ title: "Ошибка чтения файла", description: errorMsg, variant: "destructive" });
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
        return; // Async handling for images, return early
      }
      // Handle PDF and .doc files (no content extraction for these without AI)
      else if (fileName.toLowerCase().endsWith('.pdf') || fileType === 'application/pdf') {
        processedInfo = { ...processedInfo }; // No specific content extraction for PDF here
        toast({ title: "PDF файл загружен", description: "Информация о PDF файле отображена. Предпросмотр содержимого не выполняется." });
      }
      else if (fileName.toLowerCase().endsWith('.doc') || fileType === 'application/msword') {
        const errorMsg = "Файлы .doc (старый формат Word) не могут быть обработаны для извлечения текста. Пожалуйста, используйте .docx.";
        processedInfo = { ...processedInfo, error: errorMsg };
        onProcessingError(errorMsg);
        toast({ title: "Формат .doc не поддерживается", description: errorMsg, variant: "warning" });
      }
      // Handle other unsupported file types
      else {
        const errorMsg = `Неподдерживаемый тип файла: ${fileType || fileName}. Поддерживаются .txt, .md, .docx, изображения.`;
        processedInfo = { ...processedInfo, error: errorMsg };
        onProcessingError(errorMsg);
        toast({ title: "Ошибка типа файла", description: errorMsg, variant: "destructive" });
      }

      onFileProcessed(processedInfo);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Произошла неизвестная ошибка при обработке файла.";
      const finalErrorMsg = `Ошибка обработки файла: ${errorMessage}`;
      processedInfo = { ...processedInfo, error: finalErrorMsg };
      onFileProcessed(processedInfo);
      onProcessingError(finalErrorMsg);
      toast({ title: "Ошибка обработки файла", description: errorMessage, variant: "destructive" });
    } finally {
      // For non-async paths, set isProcessing to false. Async paths (image) handle it in their callbacks.
      if (!fileType.startsWith('image/')) {
        setIsProcessing(false);
      }
    }
  };

  const getFileIcon = () => {
    if (!file) return <UploadCloud className="mr-2 h-5 w-5" />;
    const lcFileName = file.name.toLowerCase();
    const fileType = file.type;

    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
    if (lcFileName.endsWith('.pdf')) return <FileType className="h-5 w-5 text-red-500" />;
    if (lcFileName.endsWith('.doc') || lcFileName.endsWith('.docx')) return <FileType className="h-5 w-5 text-blue-500" />;
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Загрузка файла</CardTitle>
        <CardDescription>Загрузите файл для извлечения текста или предпросмотра (.txt, .md, .docx, изображение). Для .pdf и .doc будет показана информация о файле.</CardDescription>
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
        <Button onClick={handleSubmit} disabled={!file || isProcessing} className="w-full text-lg py-6">
          {isProcessing ? (
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-5 w-5" />
          )}
          {isProcessing ? 'Обрабатываем...' : 'Обработать файл'}
        </Button>
      </CardContent>
    </Card>
  );
}
