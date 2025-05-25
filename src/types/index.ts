
export interface UploadedFileInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
  textContent?: string; // For extracted text from .txt, .md, .docx
  dataUri?: string; // For images or PDF to display/pass to AI
  error?: string; // If there was an error processing the file locally
}

export interface LectureAnalysisResult {
  keyConcepts: string[];
  themes: string[];
  summary: string;
}

// --- Question Types ---
export type QuestionType = 'fill-in-the-blank' | 'single-choice' | 'multiple-choice';

export interface BaseQuestion {
  questionText: string;
}

export interface FillInTheBlankQuestion extends BaseQuestion {
  type: 'fill-in-the-blank';
  correctAnswer: string;
}

export interface SingleChoiceQuestion extends BaseQuestion {
  type: 'single-choice';
  options: string[];
  correctAnswer: string; 
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctAnswers: string[]; 
}

export type GeneratedQuestion = FillInTheBlankQuestion | SingleChoiceQuestion | MultipleChoiceQuestion;


// --- Editable Question Item (Discriminated Union) ---
interface EditableBaseQuestion {
  id: string;
  selected: boolean;
  editedQuestionText: string;
}

export interface EditableFillInTheBlankQuestion extends EditableBaseQuestion {
  type: 'fill-in-the-blank';
  originalQuestion: FillInTheBlankQuestion; 
  editedCorrectAnswer: string;
}

export interface EditableOption {
  id: string; 
  text: string;
}

export interface EditableSingleChoiceQuestion extends EditableBaseQuestion {
  type: 'single-choice';
  originalQuestion: SingleChoiceQuestion;
  editedOptions: EditableOption[];
  editedCorrectAnswer: string; 
}

export interface EditableMultipleChoiceQuestion extends EditableBaseQuestion {
  type: 'multiple-choice';
  originalQuestion: MultipleChoiceQuestion;
  editedOptions: EditableOption[];
  editedCorrectAnswers: string[];
}

export type EditableQuestionItem = 
  | EditableFillInTheBlankQuestion 
  | EditableSingleChoiceQuestion 
  | EditableMultipleChoiceQuestion;

// Defines the structure for a single content item to be analyzed by AI
export interface LectureContentItem {
  fileName: string;
  contentType: 'text' | 'image' | 'pdf';
  rawTextContent?: string;
  contentDataUri?: string;
}
