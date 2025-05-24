'use client';

import type React from 'react';
import { useState } from 'react';
import { Wand2, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// This interface needs to be defined here or imported if used across modules.
// For now, let's assume page.tsx will handle the actual GenerateTestQuestionsOutput.
// import type { GenerateTestQuestionsOutput } from '@/ai/flows/generate-test-questions';

export interface QuestionGenerationFormProps {
  analysisSummary: string;
  onGenerationStartParams: (numQuestions: number, difficulty: 'easy' | 'medium' | 'hard') => void;
  isLoading?: boolean; // Controlled by parent
}

export default function QuestionGenerationForm({
  analysisSummary,
  onGenerationStartParams,
  isLoading = false,
}: QuestionGenerationFormProps) {
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (numQuestions <= 0 || numQuestions > 20) { // Added max check
      toast({
        title: "Неверное количество",
        description: "Количество вопросов должно быть от 1 до 20.",
        variant: "destructive",
      });
      return;
    }
    onGenerationStartParams(numQuestions, difficulty);
  };

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Генерация вопросов</CardTitle>
        <CardDescription>Укажите параметры для генерации тестовых вопросов на основе анализа.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="num-questions" className="text-base">Количество вопросов (1-20)</Label>
          <Input
            id="num-questions"
            type="number"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
            min="1"
            max="20"
            className="text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="difficulty" className="text-base">Уровень сложности</Label>
          <Select value={difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}>
            <SelectTrigger id="difficulty" className="w-full text-base">
              <SelectValue placeholder="Выберите сложность" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Легкий</SelectItem>
              <SelectItem value="medium">Средний</SelectItem>
              <SelectItem value="hard">Сложный</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !analysisSummary} 
          className="w-full text-lg py-6"
        >
          {isLoading ? (
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-5 w-5" />
          )}
          {isLoading ? 'Генерируем...' : 'Сгенерировать вопросы'}
        </Button>
      </CardContent>
    </Card>
  );
}
