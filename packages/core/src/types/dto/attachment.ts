export type AttachmentType = 'pdf' | 'image' | 'xml' | 'other';

export interface AttachmentDto {
  id: string;
  fileName: string;
  mimeType?: string;
  type?: AttachmentType;
  size?: number;
  /** URL to download the attachment (may be a signed URL) */
  downloadUrl?: string;
  createdAt?: string;
  _raw?: Record<string, unknown>;
}
