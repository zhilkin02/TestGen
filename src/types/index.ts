
export interface UploadedFileInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
  textContent?: string; // For extracted text from .txt, .md, .docx
  dataUri?: string; // For images or PDF to display/pass to AI
  error?: string; // If there was an error processing the file
}

export interface LectureAnalysisResult {
  keyConcepts: string[];
  themes: string[];
  summary: string;
}

// --- New Question Types ---
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
  correctAnswer: string; // This will be one of the strings from options
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correctAnswers: string[]; // This will be a subset of strings from options
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
  originalQuestion: FillInTheBlankQuestion; // To store original for reset or comparison if needed
  editedCorrectAnswer: string;
}

export interface EditableOption {
  id: string; // For stable key in React and easier updates
  text: string;
}

export interface EditableSingleChoiceQuestion extends EditableBaseQuestion {
  type: 'single-choice';
  originalQuestion: SingleChoiceQuestion;
  editedOptions: EditableOption[];
  // Store the text of the correct answer for simplicity, or id of the correct EditableOption
  editedCorrectAnswer: string; // This should match the text of one of the editedOptions
}

export interface EditableMultipleChoiceQuestion extends EditableBaseQuestion {
  type: 'multiple-choice';
  originalQuestion: MultipleChoiceQuestion;
  editedOptions: EditableOption[];
  // Store the texts of the correct answers
  editedCorrectAnswers: string[]; // This should match texts from editedOptions
}

export type EditableQuestionItem = 
  | EditableFillInTheBlankQuestion 
  | EditableSingleChoiceQuestion 
  | EditableMultipleChoiceQuestion;

// Keep old Question type for simple question/answer if needed elsewhere or for initial state.
// However, with the new structure, this might become obsolete.
export interface Question {
  question: string;
  answer: string;
}
