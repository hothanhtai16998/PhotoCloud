interface UploadProgressProps {
  uploadingIndex: number;
  totalUploads: number;
  uploadProgress: number;
}

export const UploadProgress = ({ uploadingIndex, totalUploads, uploadProgress }: UploadProgressProps) => {
  // Calculate progress for multiple uploads
  // Each image contributes 100/totalUploads to the overall progress
  const progressPerImage = 100 / totalUploads;
  const completedImages = uploadingIndex;
  const currentImageProgress = uploadProgress;
  const overallProgress = (completedImages * progressPerImage) + (currentImageProgress * progressPerImage / 100);
  const displayProgress = Math.max(0, Math.min(100, overallProgress));
  // Published count updates as each image completes
  const publishedCount = uploadProgress === 100 ? uploadingIndex + 1 : uploadingIndex;

  return (
    <div className="upload-modal-overlay">
      <div className="upload-progress-screen">
        <div className="progress-circle-container">
          <svg className="progress-circle" viewBox="0 0 100 100">
            <circle
              className="progress-circle-bg"
              cx="50"
              cy="50"
              r="45"
            />
            <circle
              className="progress-circle-fill"
              cx="50"
              cy="50"
              r="45"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - displayProgress / 100)}`}
            />
          </svg>
          <div className="progress-percentage">{Math.round(displayProgress)}%</div>
        </div>
        <p className="progress-text">Published <strong>{publishedCount}</strong> of <strong>{totalUploads}</strong> images...</p>
      </div>
    </div>
  );
};

