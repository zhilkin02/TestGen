'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Save, Trash2, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EditableQuestionItem } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface QuestionEditorProps {
  initialQuestions: EditableQuestionItem[];
  isLoading?: boolean;
}

export default function QuestionEditor({ initialQuestions, isLoading = false }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<EditableQuestionItem[]>(initialQuestions);
  const { toast } = useToast();

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  const handleQuestionChange = (id: string, field: 'question' | 'answer', value: string) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) =>
        q.id === id ? { ...q, [field === 'question' ? 'editedQuestion' : 'editedAnswer']: value } : q
      )
    );
  };

  const handleSelectionChange = (id: string, selected: boolean) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) => (q.id === id ? { ...q, selected } : q))
    );
  };
  
  const handleDeleteQuestion = (id: string) => {
    setQuestions((prevQuestions) => prevQuestions.filter(q => q.id !== id));
    toast({ title: "Вопрос удален" });
  };

  const handleSaveSelected = () => {
    const selectedQuestions = questions.filter(q => q.selected).map(q => ({
      question: q.editedQuestion,
      answer: q.editedAnswer,
    }));

    if (selectedQuestions.length === 0) {
      toast({
        title: "Нет выбранных вопросов",
        description: "Пожалуйста, выберите вопросы для сохранения.",
        variant: "destructive",
      });
      return;
    }

    const dataStr = JSON.stringify({ questions: selectedQuestions }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'test_questions.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    linkElement.remove();

    toast({
      title: "Вопросы сохранены",
      description: "Выбранные вопросы были сохранены в файл JSON.",
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Предпросмотр и редактирование</CardTitle>
          <CardDescription>Загрузка сгенерированных вопросов...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border rounded-lg space-y-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (!questions || questions.length === 0) {
     return (
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Предпросмотр и редактирование</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Вопросы еще не сгенерированы или список пуст.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-semibold">Предпросмотр и редактирование</CardTitle>
          <CardDescription>Отметьте, отредактируйте и сохраните нужные вопросы.</CardDescription>
        </div>
        <Button onClick={handleSaveSelected} className="ml-auto text-base" variant="default">
          <Save className="mr-2 h-4 w-4" />
          Сохранить выбранные
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {questions.map((q) => (
              <Card key={q.id} className="bg-card/50 p-1 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start gap-3 p-4">
                  <Checkbox
                    id={`select-${q.id}`}
                    checked={q.selected}
                    onCheckedChange={(checked) => handleSelectionChange(q.id, !!checked)}
                    className="mt-1"
                  />
                  <Label htmlFor={`question-${q.id}`} className="flex-1 text-base font-medium sr-only">
                    Вопрос:
                  </Label>
                   <Input
                    id={`question-${q.id}`}
                    value={q.editedQuestion}
                    onChange={(e) => handleQuestionChange(q.id, 'question', e.target.value)}
                    className="text-base flex-grow font-medium p-2 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="Текст вопроса"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                     <span className="sr-only">Удалить вопрос</span>
                  </Button>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1 ml-9">
                  <Label htmlFor={`answer-${q.id}`} className="text-sm text-muted-foreground">
                    Ответ:
                  </Label>
                  <Textarea
                    id={`answer-${q.id}`}
                    value={q.editedAnswer}
                    onChange={(e) => handleQuestionChange(q.id, 'answer', e.target.value)}
                    className="text-base p-2 min-h-[60px] focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="Текст ответа"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
