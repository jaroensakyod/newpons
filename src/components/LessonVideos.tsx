export type LessonVideo = {
  url: string;
  title: string;
  channel?: string;
};

function toEmbedId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

export default function LessonVideos({ videos }: { videos: LessonVideo[] }) {
  const embeddable = videos
    .map((v) => ({ ...v, embedId: toEmbedId(v.url) }))
    .filter((v) => v.embedId);

  if (embeddable.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">🎬 คลิปประกอบการเรียน</h2>
      <p className="mt-1 text-sm text-slate-500">
        คลิปฟรีจากแหล่งภายนอก (ฝังจาก YouTube) — ดูคู่กับบทเรียนด้านบน
      </p>
      <div className="mt-4 space-y-6">
        {embeddable.map((v) => (
          <div
            key={v.embedId}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${v.embedId}`}
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{v.title}</p>
                {v.channel && (
                  <p className="truncate text-xs text-slate-400">{v.channel}</p>
                )}
              </div>
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-indigo-600 hover:underline"
              >
                เปิดบน YouTube ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
