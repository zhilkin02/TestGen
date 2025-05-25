
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Save, Trash2, PlusCircle, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { 
  EditableQuestionItem, 
  EditableFillInTheBlankQuestion,
  EditableSingleChoiceQuestion,
  EditableMultipleChoiceQuestion,
  EditableOption,
  GeneratedQuestion // For export
} from '@/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface QuestionEditorProps {
  questions: EditableQuestionItem[];
  isLoading?: boolean;
  onQuestionUpdate: (updatedQuestion: EditableQuestionItem) => void;
  onQuestionDelete: (questionId: string) => void;
}

export default function QuestionEditor({ 
  questions: initialQuestions, 
  isLoading = false,
  onQuestionUpdate,
  onQuestionDelete
}: QuestionEditorProps) {
  const [questions, setQuestions] = useState<EditableQuestionItem[]>(initialQuestions);
  const { toast } = useToast();

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  const handleQuestionTextChange = (id: string, value: string) => {
    const question = questions.find(q => q.id === id);
    if (question) {
      onQuestionUpdate({ ...question, editedQuestionText: value });
    }
  };

  const handleSelectionChange = (id: string, selected: boolean) => {
     const question = questions.find(q => q.id === id);
    if (question) {
      onQuestionUpdate({ ...question, selected });
    }
  };
  
  // Specific handlers for question types
  const handleFillInTheBlankAnswerChange = (id: string, answer: string) => {
    const question = questions.find(q => q.id === id) as EditableFillInTheBlankQuestion | undefined;
    if (question && question.type === 'fill-in-the-blank') {
      onQuestionUpdate({ ...question, editedCorrectAnswer: answer });
    }
  };

  const handleOptionTextChange = (questionId: string, optionId: string, newText: string) => {
    const question = questions.find(q => q.id === questionId) as EditableSingleChoiceQuestion | EditableMultipleChoiceQuestion | undefined;
    if (question && (question.type === 'single-choice' || question.type === 'multiple-choice')) {
      const updatedOptions = question.editedOptions.map(opt => 
        opt.id === optionId ? { ...opt, text: newText } : opt
      );
      // If the changed option was a correct answer, update the correct answer text as well
      let updatedCorrectAnswer = (question as EditableSingleChoiceQuestion).editedCorrectAnswer;
      let updatedCorrectAnswers = (question as EditableMultipleChoiceQuestion).editedCorrectAnswers;

      if (question.type === 'single-choice') {
        const oldOptionText = question.editedOptions.find(o => o.id === optionId)?.text;
        if (oldOptionText === question.editedCorrectAnswer) {
          updatedCorrectAnswer = newText;
        }
         onQuestionUpdate({ ...question, editedOptions: updatedOptions, editedCorrectAnswer: updatedCorrectAnswer as string });
      } else if (question.type === 'multiple-choice') {
         const oldOptionText = question.editedOptions.find(o => o.id === optionId)?.text;
         if (question.editedCorrectAnswers.includes(oldOptionText!)) {
            updatedCorrectAnswers = question.editedCorrectAnswers.map(ca => ca === oldOptionText ? newText : ca);
         }
        onQuestionUpdate({ ...question, editedOptions: updatedOptions, editedCorrectAnswers: updatedCorrectAnswers as string[] });
      }
    }
  };
  
  const handleSingleChoiceCorrectAnswerChange = (questionId: string, correctAnswerText: string) => {
    const question = questions.find(q => q.id === questionId) as EditableSingleChoiceQuestion | undefined;
    if (question && question.type === 'single-choice') {
      onQuestionUpdate({ ...question, editedCorrectAnswer: correctAnswerText });
    }
  };

  const handleMultipleChoiceCorrectAnswerChange = (questionId: string, optionText: string, isChecked: boolean) => {
    const question = questions.find(q => q.id === questionId) as EditableMultipleChoiceQuestion | undefined;
    if (question && question.type === 'multiple-choice') {
      let updatedCorrectAnswers: string[];
      if (isChecked) {
        updatedCorrectAnswers = [...question.editedCorrectAnswers, optionText];
      } else {
        updatedCorrectAnswers = question.editedCorrectAnswers.filter(ans => ans !== optionText);
      }
      onQuestionUpdate({ ...question, editedCorrectAnswers });
    }
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId) as EditableSingleChoiceQuestion | EditableMultipleChoiceQuestion | undefined;
    if (question && (question.type === 'single-choice' || question.type === 'multiple-choice')) {
      if (question.editedOptions.length < 5) { // Max 5 options
        const newOption: EditableOption = { id: uuidv4(), text: `Новый вариант ${question.editedOptions.length + 1}` };
        onQuestionUpdate({ ...question, editedOptions: [...question.editedOptions, newOption] });
      } else {
        toast({ title: "Максимум вариантов", description: "Можно добавить не более 5 вариантов ответа.", variant: "default"});
      }
    }
  };

  const removeOption = (questionId: string, optionIdToRemove: string) => {
     const question = questions.find(q => q.id === questionId) as EditableSingleChoiceQuestion | EditableMultipleChoiceQuestion | undefined;
    if (question && (question.type === 'single-choice' || question.type === 'multiple-choice')) {
      if (question.editedOptions.length > 2) { // Min 2 options
        const optionToRemove = question.editedOptions.find(opt => opt.id === optionIdToRemove);
        const updatedOptions = question.editedOptions.filter(opt => opt.id !== optionIdToRemove);
        
        let updatedQuestion = { ...question, editedOptions: updatedOptions };

        if (question.type === 'single-choice' && question.editedCorrectAnswer === optionToRemove?.text) {
          updatedQuestion.editedCorrectAnswer = updatedOptions.length > 0 ? updatedOptions[0].text : ""; // Default to first if current correct is removed
        } else if (question.type === 'multiple-choice' && question.editedCorrectAnswers.includes(optionToRemove?.text || '')) {
           updatedQuestion.editedCorrectAnswers = question.editedCorrectAnswers.filter(ans => ans !== optionToRemove?.text);
        }
        onQuestionUpdate(updatedQuestion);
      } else {
         toast({ title: "Минимум вариантов", description: "Должно быть не менее 2 вариантов ответа.", variant: "default"});
      }
    }
  };


  const handleSaveSelected = () => {
    const selectedQuestionsToExport: GeneratedQuestion[] = questions
      .filter(q => q.selected)
      .map(q => {
        switch (q.type) {
          case 'fill-in-the-blank':
            return {
              type: q.type,
              questionText: q.editedQuestionText,
              correctAnswer: q.editedCorrectAnswer,
            } as GeneratedQuestion;
          case 'single-choice':
            return {
              type: q.type,
              questionText: q.editedQuestionText,
              options: q.editedOptions.map(opt => opt.text),
              correctAnswer: q.editedCorrectAnswer,
            } as GeneratedQuestion;
          case 'multiple-choice':
            return {
              type: q.type,
              questionText: q.editedQuestionText,
              options: q.editedOptions.map(opt => opt.text),
              correctAnswers: q.editedCorrectAnswers,
            } as GeneratedQuestion;
          default:
            return null; // Should not happen
        }
      }).filter(Boolean) as GeneratedQuestion[];

    if (selectedQuestionsToExport.length === 0) {
      toast({
        title: "Нет выбранных вопросов",
        description: "Пожалуйста, выберите вопросы для сохранения.",
        variant: "destructive",
      });
      return;
    }

    const dataStr = JSON.stringify({ questions: selectedQuestionsToExport }, null, 2);
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
    // Skeleton loading state
    return (
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Предпросмотр и редактирование</CardTitle>
          <CardDescription>Загрузка сгенерированных вопросов...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border rounded-lg space-y-3 animate-pulse">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              <div className="h-8 bg-muted rounded mt-2"></div>
              <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              <div className="h-12 bg-muted rounded mt-2"></div>
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

  const renderQuestionContent = (q: EditableQuestionItem) => {
    switch (q.type) {
      case 'fill-in-the-blank':
        return (
          <div className="space-y-2">
            <Label htmlFor={`answer-${q.id}`} className="text-sm text-muted-foreground">
              Правильный ответ (заполняет "___"):
            </Label>
            <Input
              id={`answer-${q.id}`}
              value={q.editedCorrectAnswer}
              onChange={(e) => handleFillInTheBlankAnswerChange(q.id, e.target.value)}
              className="text-base p-2"
              placeholder="Ответ для пропуска"
            />
          </div>
        );
      case 'single-choice':
        return (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Варианты ответа (выберите один правильный):</Label>
            <RadioGroup
              value={q.editedCorrectAnswer}
              onValueChange={(value) => handleSingleChoiceCorrectAnswerChange(q.id, value)}
            >
              {q.editedOptions.map((opt, index) => (
                <div key={opt.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.text} id={`${q.id}-option-${opt.id}`} />
                  <Input
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(q.id, opt.id, e.target.value)}
                    className="flex-grow text-base p-2"
                    placeholder={`Вариант ${index + 1}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeOption(q.id, opt.id)} className="text-destructive hover:bg-destructive/10" disabled={q.editedOptions.length <= 2}>
                      <MinusCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </RadioGroup>
            <Button variant="outline" size="sm" onClick={() => addOption(q.id)} disabled={q.editedOptions.length >= 5}>
              <PlusCircle className="mr-2 h-4 w-4" /> Добавить вариант
            </Button>
          </div>
        );
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Варианты ответа (выберите один или несколько правильных):</Label>
            {q.editedOptions.map((opt, index) => (
              <div key={opt.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`${q.id}-option-${opt.id}`}
                  checked={q.editedCorrectAnswers.includes(opt.text)}
                  onCheckedChange={(checked) => handleMultipleChoiceCorrectAnswerChange(q.id, opt.text, !!checked)}
                />
                <Input
                  value={opt.text}
                  onChange={(e) => handleOptionTextChange(q.id, opt.id, e.target.value)}
                  className="flex-grow text-base p-2"
                  placeholder={`Вариант ${index + 1}`}
                />
                 <Button variant="ghost" size="icon" onClick={() => removeOption(q.id, opt.id)} className="text-destructive hover:bg-destructive/10" disabled={q.editedOptions.length <= 2}>
                    <MinusCircle className="h-4 w-4" />
                 </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addOption(q.id)} disabled={q.editedOptions.length >= 5}>
              <PlusCircle className="mr-2 h-4 w-4" /> Добавить вариант
            </Button>
          </div>
        );
      default:
        return <p>Неизвестный тип вопроса</p>;
    }
  };

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader className="flex flex-row items-start sm:items-center justify-between">
        <div className="flex-grow">
          <CardTitle className="text-2xl font-semibold">Предпросмотр и редактирование</CardTitle>
          <CardDescription>Отметьте, отредактируйте и сохраните нужные вопросы.</CardDescription>
        </div>
        <Button onClick={handleSaveSelected} className="ml-auto text-base shrink-0" variant="default">
          <Save className="mr-2 h-4 w-4" />
          Сохранить выбранные
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[550px] pr-0 sm:pr-4"> {/* Adjusted height and padding for scrollbar */}
          <div className="space-y-6">
            {questions.map((q) => (
              <Card key={q.id} className="bg-card/50 p-1 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start gap-3 p-4">
                   <Checkbox
                    id={`select-${q.id}`}
                    checked={q.selected}
                    onCheckedChange={(checked) => handleSelectionChange(q.id, !!checked)}
                    className="mt-1"
                    aria-label={`Выбрать вопрос ${q.id}`}
                  />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`question-${q.id}`} className="text-base font-medium sr-only">
                      Текст вопроса:
                    </Label>
                    <Textarea
                      id={`question-${q.id}`}
                      value={q.editedQuestionText}
                      onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                      className="text-base flex-grow font-medium p-2 border-0 focus-visible:ring-1 focus-visible:ring-primary min-h-[60px]"
                      placeholder="Текст вопроса (для 'Заполнить пропуск' используйте ___)"
                    />
                     <p className="text-xs text-muted-foreground">
                      Тип: {q.type === 'fill-in-the-blank' ? 'Заполнить пропуск' : q.type === 'single-choice' ? 'Одиночный выбор' : 'Множественный выбор'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => onQuestionDelete(q.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                     <span className="sr-only">Удалить вопрос</span>
                  </Button>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1 ml-3 sm:ml-9"> {/* Adjusted margin */}
                  {renderQuestionContent(q)}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
