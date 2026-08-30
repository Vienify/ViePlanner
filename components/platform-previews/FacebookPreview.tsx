"use client";

import { Forward, Globe, Heart, MessageCircle, MoreHorizontal, ThumbsUp } from "lucide-react";
import { Asset, Idea, SocialAccountInfo, formatDateVN } from "@/lib/api";
import { ImageGrid } from "./ImageGrid";
import { Avatar, CHANNEL_NAME, Theme, TruncatedCaption } from "./shared";

export function FacebookPreview({
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
  const name = account?.configured && account.name ? account.name : CHANNEL_NAME;
  return (
    <div
      className={`mx-auto max-h-[62vh] max-w-md overflow-y-auto overflow-x-hidden rounded-xl border shadow ${
        dark ? "border-zinc-700 bg-zinc-900 text-zinc-100" : "border-zinc-300 bg-white text-zinc-900"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar dark={dark} src={account?.avatar || "/FBLogo.jpg"} name={name} />
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className={`flex items-center gap-1 text-xs ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
            {formatDateVN(idea.post_date)} lúc {idea.time_fb || "--:--"} ·
            <Globe className="h-3 w-3" />
          </p>
        </div>
        <MoreHorizontal className={`ml-auto h-5 w-5 ${dark ? "text-zinc-500" : "text-zinc-400"}`} />
      </div>
      {idea.content && <TruncatedCaption text={idea.content} limit={250} className="px-4 pb-3 text-sm" />}
      <ImageGrid assets={media} />
      <div className={`flex items-center justify-between px-4 py-2 text-xs ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
        <span className="flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
            <ThumbsUp className="h-2.5 w-2.5 text-white" />
          </span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500">
            <Heart className="h-2.5 w-2.5 fill-white text-white" />
          </span>
          128
        </span>
        <span>24 bình luận · 8 lượt chia sẻ</span>
      </div>
      <div
        className={`mx-2 flex border-t py-1 text-sm font-medium ${
          dark ? "border-zinc-700 text-zinc-300" : "border-zinc-200 text-zinc-600"
        }`}
      >
        <button className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 ${dark ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}>
          <ThumbsUp className="h-4 w-4" /> Thích
        </button>
        <button className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 ${dark ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}>
          <MessageCircle className="h-4 w-4" /> Bình luận
        </button>
        <button className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1.5 ${dark ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}>
          <Forward className="h-4 w-4" /> Chia sẻ
        </button>
      </div>
    </div>
  );
}
