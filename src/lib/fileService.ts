// Client-side file handling service for backend-less operation

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class FileService {
  /**
   * Handle file upload for videos/shorts - in a backend-less setup,
   * this would typically integrate with external storage services
   */
  async uploadVideo(file: File, type: 'shorts' | 'general' = 'general'): Promise<FileUploadResult> {
    try {
      // For a truly backend-less solution, you might:
      // 1. Use browser File API to create object URLs for local playback
      // 2. Integrate with external storage services (AWS S3, Firebase Storage, etc.)
      // 3. Use WebRTC or other browser APIs for peer-to-peer sharing

      // For now, we'll create a local object URL that can be used for playback
      // In production, you'd upload to external storage and return the public URL
      const objectUrl = URL.createObjectURL(file);

      return {
        success: true,
        url: objectUrl
      };
    } catch (error: any) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate a thumbnail from a video file
   */
  async generateThumbnail(videoFile: File): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;

        video.onloadedmetadata = () => {
          // Seek to 1 second or 10% of duration (whichever is smaller)
          const seekTime = Math.min(1, video.duration * 0.1);
          video.currentTime = seekTime;
        };

        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(null);
            return;
          }

          canvas.width = 320;
          canvas.height = 240;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.8);
        };

        video.onerror = () => {
          resolve(null);
        };
      } catch (error) {
        console.error('Thumbnail generation error:', error);
        resolve(null);
      }
    });
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}): { valid: boolean; error?: string } {
    const { maxSize = 100 * 1024 * 1024, allowedTypes = ['video/mp4'] } = options;

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size too large. Maximum allowed: ${Math.round(maxSize / 1024 / 1024)}MB`
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Clean up object URLs to prevent memory leaks
   */
  revokeObjectUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Download a file from a URL
   */
  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      this.revokeObjectUrl(downloadUrl);
    } catch (error) {
      console.error('File download error:', error);
      throw new Error('Failed to download file');
    }
  }
}

// Export singleton instance
export const fileService = new FileService();
