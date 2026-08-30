"use client";

import { Heart, MessageCircle, MoreHorizontal, Repeat2, Send } from "lucide-react";
import { Asset, Idea, SocialAccountInfo } from "@/lib/api";
import { splitThreadsContent, THREADS_CHAR_LIMIT, ThreadsImageRow } from "./ThreadsImageRow";
import { Avatar, Theme } from "./shared";

export function ThreadsPreview({
  idea,
  media,
  theme,
  account,
}: {
  idea: Idea;
  media: Asset[];
  theme: Theme;
  account?: SocialAccountInfo;
}) {
  const dark = theme === "dark";
  const username = account?.configured && account.name ? account.name : "kenh_cua_toi";
  const parts = splitThreadsContent(idea.content || "", THREADS_CHAR_LIMIT);
  const [mainText, ...replyParts] = parts;
  return (
    <div
      className={`mx-auto max-h-[62vh] max-w-md overflow-y-auto overflow-x-hidden rounded-xl border p-4 shadow ${
        dark ? "border-zinc-800 bg-black text-white" : "border-zinc-200 bg-white text-zinc-900"
      }`}
    >
      <div className="flex gap-3">
        <Avatar dark={dark} src={account?.avatar || "/ThreadsLogo.png"} name={username} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{username}</p>
            <p className={`text-xs ${dark ? "text-zinc-400" : "text-zinc-500"}`}>{idea.time_threads || "--:--"}</p>
            <MoreHorizontal className={`ml-auto h-5 w-5 ${dark ? "text-zinc-500" : "text-zinc-400"}`} />
          </div>
          <p className="mt-1 whitespace-pre-line text-sm">{mainText}</p>
          {media.length > 0 && (
            <div className="-mr-4 mt-3">
              <ThreadsImageRow media={media} theme={theme} />
            </div>
          )}
          <div className={`mt-3 flex items-center gap-4 text-sm ${dark ? "text-zinc-300" : "text-zinc-600"}`}>
            <span className="flex items-center gap-1.5">
              <Heart className="h-5 w-5" /> 9,2K
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-5 w-5" /> 768
            </span>
            <span className="flex items-center gap-1.5">
              <Repeat2 className="h-5 w-5" /> 321
            </span>
            <span className="flex items-center gap-1.5">
              <Send className="h-5 w-5" /> 1,3K
            </span>
          </div>
        </div>
      </div>

      {replyParts.length > 0 && (
        <div className={`ml-[22px] mt-1 space-y-4 border-l pl-[26px] ${dark ? "border-zinc-800" : "border-zinc-200"}`}>
          {replyParts.map((part, i) => (
            <div key={i} className="flex gap-3 pt-3">
              <Avatar dark={dark} src={account?.avatar || "/ThreadsLogo.png"} name={username} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{username}</p>
                  <p className={`text-xs ${dark ? "text-zinc-400" : "text-zinc-500"}`}>{idea.time_threads || "--:--"}</p>
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm">
                  <span className="font-semibold">[{i + 1}]</span> {part}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
