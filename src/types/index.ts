
export interface UploadedFileInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
  textContent?: string; // For extracted text from .txt, .md, .docx
  dataUri?: string; // For images to display
  error?: string; // If there was an error processing the file
}
