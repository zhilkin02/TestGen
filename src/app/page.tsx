
'use client';

import { useState } from 'react';
import AppHeader from '@/components/app/AppHeader';
import FileUploadForm from '@/components/app/FileUploadForm';
import FileInfoDisplay from '@/components/app/FileInfoDisplay'; // New component
import type { UploadedFileInfo } from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function Home() {
  const [processedFileInfo, setProcessedFileInfo] = useState<UploadedFileInfo | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleProcessingStart = () => {
    setIsProcessingFile(true);
    setProcessedFileInfo(null);
    setCurrentError(null);
  };

  const handleFileProcessed = (info: UploadedFileInfo) => {
    setIsProcessingFile(false);
    if (info.error) {
      setCurrentError(info.error);
      setProcessedFileInfo(null); // Clear info if there was an error during processing handled by FileUploadForm
    } else {
      setProcessedFileInfo(info);
      setCurrentError(null);
    }
  };
  
  const handleProcessingError = (error: string) => {
    setIsProcessingFile(false);
    setCurrentError(error);
    setProcessedFileInfo(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/30">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            <FileUploadForm
              onProcessingStart={handleProcessingStart}
              onFileProcessed={handleFileProcessed}
              onProcessingError={handleProcessingError}
            />
            {currentError && !isProcessingFile && (
              <Alert variant="destructive" className="shadow-md rounded-xl">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Ошибка!</AlertTitle>
                <AlertDescription>{currentError}</AlertDescription>
              </Alert>
            )}
            {isProcessingFile && (
               <div className="p-6 border rounded-xl bg-card shadow-lg">
                <p className="text-center text-primary animate-pulse">Идет обработка файла...</p>
              </div>
            )}
          </div>
          
          <div className="md:sticky md:top-8">
            {processedFileInfo && !isProcessingFile && !currentError && (
              <FileInfoDisplay fileInfo={processedFileInfo} />
            )}
            {!processedFileInfo && !isProcessingFile && !currentError && (
                 <div className="p-6 border rounded-xl bg-card shadow-lg text-center">
                    <p className="text-muted-foreground">Загрузите файл, чтобы увидеть информацию о нем.</p>
                </div>
            )}
          </div>
        </div>
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        © {new Date().getFullYear()} ФайлИнфо. Все права защищены.
      </footer>
    </div>
  );
}
