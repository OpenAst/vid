"use client";

const VideoGridSkeleton = ({ count = 8 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="relative aspect-[9/16] overflow-hidden rounded-xl bg-base-300 shadow-md"
          aria-hidden="true"
        >
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-base-300 via-base-200 to-base-300" />
          <div className="absolute bottom-2 left-2 right-2 space-y-1.5">
            <div className="h-2.5 w-3/4 rounded-full bg-base-content/10" />
            <div className="h-2 w-1/2 rounded-full bg-base-content/10" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoGridSkeleton;
