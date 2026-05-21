interface UploadProgressProps {
  progress: number;
}

export const UploadProgress = ({ progress }: UploadProgressProps) => (
  <div className="pt-2">
    <div className="flex justify-betweeen text-sm text-gray-600 mb-1">
      <span>Uploading...</span>
      <span>{progress}%</span>
    </div>
    <div className="w-full bg-base-300 rounded-full h-2.5">
      <div
        className="bg-primary h-2.5 rounded-full"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  </div>
)
