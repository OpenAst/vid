"use client";

const SkeletonLine = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-full bg-white/16 ${className}`} />
);

const FeedSkeleton = ({ count = 2 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-[90vh] w-full snap-start flex items-center justify-center relative mb-2"
          aria-hidden="true"
        >
          <div className="relative h-full w-[47vh] max-w-full overflow-hidden rounded-2xl bg-neutral-950 shadow-xl">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950" />
            <div className="absolute left-4 right-14 bottom-5 z-10 space-y-3">
              <div className="flex items-center gap-2">
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="h-2.5 w-14 bg-white/10" />
              </div>
              <SkeletonLine className="h-3 w-4/5" />
              <SkeletonLine className="h-3 w-1/2 bg-white/10" />
            </div>
            <div className="absolute bottom-12 right-2 z-10 flex flex-col items-center gap-4">
              {Array.from({ length: 4 }).map((__, actionIndex) => (
                <div key={actionIndex} className="flex flex-col items-center gap-1.5">
                  <div className="h-9 w-9 rounded-full bg-white/14 animate-pulse" />
                  <SkeletonLine className="h-2 w-7 bg-white/10" />
                </div>
              ))}
            </div>
            <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-white/12">
              <div className="h-full w-1/3 bg-white/24" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default FeedSkeleton;
