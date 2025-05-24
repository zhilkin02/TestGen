
'use client';

import type { UploadedFileInfo } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';

interface FileInfoDisplayProps {
  fileInfo: UploadedFileInfo;
}

export default function FileInfoDisplay({ fileInfo }: FileInfoDisplayProps) {
  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Информация о файле</CardTitle>
        <CardDescription>
          {fileInfo.fileName} ({(fileInfo.fileSize / 1024).toFixed(2)} KB) - {fileInfo.fileType}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fileInfo.error && (
          <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Ошибка обработки файла:</p>
              <p className="text-sm">{fileInfo.error}</p>
            </div>
          </div>
        )}
        {fileInfo.textContent && (
          <div>
            <h3 className="text-lg font-medium mb-2">Извлеченный текст:</h3>
            <ScrollArea className="h-60 max-h-[40vh] rounded-md border p-3 bg-muted/30">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{fileInfo.textContent}</p>
            </ScrollArea>
          </div>
        )}
        {fileInfo.fileType.startsWith('image/') && fileInfo.dataUri && (
          <div>
            <h3 className="text-lg font-medium mb-2">Предпросмотр изображения:</h3>
            <div className="relative w-full aspect-video max-h-[40vh] border rounded-md overflow-hidden bg-muted/30">
              <Image 
                src={fileInfo.dataUri} 
                alt={fileInfo.fileName} 
                layout="fill"
                objectFit="contain" 
                data-ai-hint="uploaded image"
              />
            </div>
          </div>
        )}
        {!fileInfo.textContent && !fileInfo.dataUri && !fileInfo.error && (
            <p className="text-muted-foreground">Для этого типа файла предпросмотр содержимого или извлечение текста не выполнены. Отображена основная информация о файле.</p>
        )}
      </CardContent>
    </Card>
  );
}
