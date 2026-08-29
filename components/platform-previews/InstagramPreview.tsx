"use client";

import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { Asset, Idea, formatDateVN } from "@/lib/api";
import { Carousel } from "./Carousel";
import { Avatar, Theme, TruncatedCaption } from "./shared";

export function InstagramPreview({ idea, media, theme }: { idea: Idea; media: Asset[]; theme: Theme }) {
  const dark = theme === "dark";
  return (
    <div
      className={`mx-auto max-h-[62vh] max-w-md overflow-y-auto overflow-x-hidden rounded-xl border shadow ${
        dark ? "border-zinc-800 bg-black text-white" : "border-zinc-300 bg-white text-zinc-900"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
          <div className={`rounded-full p-0.5 ${dark ? "bg-black" : "bg-white"}`}>
            <Avatar dark={dark} />
          </div>
        </div>
        <p className="text-sm font-semibold">kenh_cua_toi</p>
        <MoreHorizontal className={`ml-auto h-5 w-5 ${dark ? "text-zinc-500" : "text-zinc-400"}`} />
      </div>
      {media.length > 0 ? (
        <Carousel media={media} aspectMin={0.8} aspectMax={1} theme={theme} />
      ) : (
        <div className={`flex aspect-square items-center justify-center text-sm ${dark ? "bg-zinc-900 text-zinc-500" : "bg-zinc-100 text-zinc-400"}`}>
          Chưa có ảnh — hãy tải ảnh lên
        </div>
      )}
      <div className="flex items-center gap-4 px-4 py-3">
        <Heart className="h-6 w-6" />
        <MessageCircle className="h-6 w-6" />
        <Send className="h-6 w-6" />
        <Bookmark className="ml-auto h-6 w-6" />
      </div>
      <p className="px-4 text-sm font-semibold">1.024 lượt thích</p>
      <TruncatedCaption text={idea.content} limit={125} prefix="kenh_cua_toi" className="px-4 pb-1 text-sm" />
      <p className={`px-4 pb-3 text-xs uppercase ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
        {formatDateVN(idea.post_date)} · {idea.time_ig || "--:--"}
      </p>
    </div>
  );
}
