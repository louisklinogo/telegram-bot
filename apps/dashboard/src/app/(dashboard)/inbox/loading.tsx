import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <main className="p-6">
      <div className="h-[calc(100vh-118px)] overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-[300px]" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 gap-4 overflow-hidden pt-4">
            {/* List */}
            <div className="w-80 space-y-2 overflow-hidden border-r pr-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="flex items-start gap-3 rounded-lg border p-3" key={i}>
                  <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="mb-2 h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="mt-2 h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>

            {/* Details */}
            <div className="flex-1">
              <div className="rounded-lg border p-6">
                <div className="mb-6 flex items-center gap-3">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div>
                    <Skeleton className="mb-2 h-5 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>

                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                      key={i}
                    >
                      <div className="max-w-[70%]">
                        <Skeleton className={`h-16 ${i % 2 === 0 ? "w-64" : "w-48"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
