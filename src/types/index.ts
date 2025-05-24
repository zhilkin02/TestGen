
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

export interface Question {
  question: string;
  answer: string;
}

export interface EditableQuestionItem extends Question {
  id: string;
  editedQuestion: string;
  editedAnswer: string;
  selected: boolean;
}
