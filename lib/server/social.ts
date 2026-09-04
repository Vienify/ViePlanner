import "server-only";
import type { Asset, Idea, SocialAccountInfo, SocialAccounts, SocialPlatform, SocialStatus } from "@/lib/api";

const FB_GRAPH_URL = "https://graph.facebook.com/v21.0";
const THREADS_GRAPH_URL = "https://graph.threads.net/v1.0";

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const THREADS_USER_ID = process.env.THREADS_USER_ID;
const THREADS_TOKEN_EXPIRES_AT = process.env.THREADS_TOKEN_EXPIRES_AT || null;

export function socialStatus(): SocialStatus {
  return {
    facebook: Boolean(FB_PAGE_ACCESS_TOKEN && FB_PAGE_ID),
    instagram: Boolean(IG_ACCESS_TOKEN && IG_BUSINESS_ACCOUNT_ID),
    threads: Boolean(THREADS_ACCESS_TOKEN && THREADS_USER_ID),
  };
}

async function graphGet(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } })?.error?.message || `Lỗi Graph API (${res.status})`;
    throw new Error(message);
  }
  return body;
}

async function graphPost(url: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } })?.error?.message || `Lỗi Graph API (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export async function fetchSocialAccounts(): Promise<SocialAccounts> {
  const status = socialStatus();

  const facebook: SocialAccountInfo = { configured: status.facebook };
  if (status.facebook) {
    try {
      const info = await graphGet(
        `${FB_GRAPH_URL}/${FB_PAGE_ID}?fields=name,link,picture&access_token=${FB_PAGE_ACCESS_TOKEN}`
      );
      facebook.name = info.name as string;
      facebook.url = info.link as string;
      facebook.avatar = ((info.picture as { data?: { url?: string } })?.data?.url as string) ?? null;
    } catch (e) {
      facebook.error = e instanceof Error ? e.message : "Lỗi kết nối";
    }
  }

  const instagram: SocialAccountInfo = { configured: status.instagram };
  if (status.instagram) {
    try {
      const info = await graphGet(
        `${FB_GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}?fields=username,profile_picture_url&access_token=${IG_ACCESS_TOKEN}`
      );
      instagram.name = (info.username as string) ? `@${info.username}` : undefined;
      instagram.url = info.username ? `https://instagram.com/${info.username}` : undefined;
      instagram.avatar = (info.profile_picture_url as string) ?? null;
    } catch (e) {
      instagram.error = e instanceof Error ? e.message : "Lỗi kết nối";
    }
  }

  const threads: SocialAccountInfo = { configured: status.threads };
  if (status.threads) {
    try {
      const info = await graphGet(
        `${THREADS_GRAPH_URL}/${THREADS_USER_ID}?fields=username,threads_profile_picture_url&access_token=${THREADS_ACCESS_TOKEN}`
      );
      threads.name = (info.username as string) ? `@${info.username}` : undefined;
      threads.url = info.username ? `https://www.threads.net/@${info.username}` : undefined;
      threads.avatar = (info.threads_profile_picture_url as string) ?? null;
      threads.tokenExpiresAt = THREADS_TOKEN_EXPIRES_AT;
    } catch (e) {
      threads.error = e instanceof Error ? e.message : "Lỗi kết nối";
    }
  }

  return { facebook, instagram, threads };
}

function assetsFor(idea: Idea, platform: "fb" | "ig_threads"): Asset[] {
  return (idea.assets || []).filter((a) => a.kind === "image" && a.platform === platform);
}

function videoAssetFor(idea: Idea): Asset | undefined {
  return (idea.assets || []).find((a) => a.kind === "demo");
}

function captionFor(idea: Idea): string {
  return idea.detail_content || idea.content || "";
}

/** Đăng lên Facebook Page: 1 ảnh, nhiều ảnh (album) hoặc video, tuỳ post_format/assets. */
export async function publishToFacebook(idea: Idea): Promise<string> {
  if (!FB_PAGE_ACCESS_TOKEN || !FB_PAGE_ID) throw new Error("Chưa cấu hình Facebook trong .env");
  const message = captionFor(idea);
  const video = idea.post_format === "video" || idea.post_format === "reel" ? videoAssetFor(idea) : undefined;

  if (video) {
    const res = await graphPost(`${FB_GRAPH_URL}/${FB_PAGE_ID}/videos`, {
      file_url: video.file_path,
      description: message,
      access_token: FB_PAGE_ACCESS_TOKEN,
    });
    return String(res.id);
  }

  const images = assetsFor(idea, "fb");
  if (images.length === 0) {
    const res = await graphPost(`${FB_GRAPH_URL}/${FB_PAGE_ID}/feed`, {
      message,
      access_token: FB_PAGE_ACCESS_TOKEN,
    });
    return String(res.id);
  }

  if (images.length === 1) {
    const res = await graphPost(`${FB_GRAPH_URL}/${FB_PAGE_ID}/photos`, {
      url: images[0].file_path,
      caption: message,
      access_token: FB_PAGE_ACCESS_TOKEN,
    });
    return String(res.post_id || res.id);
  }

  // Nhiều ảnh -> upload từng ảnh ở chế độ chưa publish, rồi gộp thành 1 bài đăng (album).
  const photoIds: string[] = [];
  for (const img of images) {
    const res = await graphPost(`${FB_GRAPH_URL}/${FB_PAGE_ID}/photos`, {
      url: img.file_path,
      published: "false",
      access_token: FB_PAGE_ACCESS_TOKEN,
    });
    photoIds.push(String(res.id));
  }
  const attached = photoIds.map((id, i) => [`attached_media[${i}]`, JSON.stringify({ media_fbid: id })] as const);
  const res = await graphPost(`${FB_GRAPH_URL}/${FB_PAGE_ID}/feed`, {
    message,
    access_token: FB_PAGE_ACCESS_TOKEN,
    ...Object.fromEntries(attached),
  });
  return String(res.id);
}

/** Đăng lên Instagram: ảnh đơn, carousel (nhiều ảnh) hoặc video/reel. */
export async function publishToInstagram(idea: Idea): Promise<string> {
  if (!IG_ACCESS_TOKEN || !IG_BUSINESS_ACCOUNT_ID) throw new Error("Chưa cấu hình Instagram trong .env");
  const caption = captionFor(idea);
  const video = idea.post_format === "video" || idea.post_format === "reel" ? videoAssetFor(idea) : undefined;

  if (video) {
    const container = await graphPost(`${FB_GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`, {
      media_type: "REELS",
      video_url: video.file_path,
      caption,
      access_token: IG_ACCESS_TOKEN,
    });
    return publishIgContainer(String(container.id));
  }

  const images = assetsFor(idea, "ig_threads");
  if (images.length === 0) throw new Error("Ý tưởng chưa có ảnh dành cho Instagram");

  if (images.length === 1) {
    const container = await graphPost(`${FB_GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`, {
      image_url: images[0].file_path,
      caption,
      access_token: IG_ACCESS_TOKEN,
    });
    return publishIgContainer(String(container.id));
  }

  const childIds: string[] = [];
  for (const img of images) {
    const child = await graphPost(`${FB_GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`, {
      image_url: img.file_path,
      is_carousel_item: "true",
      access_token: IG_ACCESS_TOKEN,
    });
    childIds.push(String(child.id));
  }
  const container = await graphPost(`${FB_GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media`, {
    media_type: "CAROUSEL",
    caption,
    children: childIds.join(","),
    access_token: IG_ACCESS_TOKEN,
  });
  return publishIgContainer(String(container.id));
}

async function publishIgContainer(creationId: string): Promise<string> {
  const res = await graphPost(`${FB_GRAPH_URL}/${IG_BUSINESS_ACCOUNT_ID}/media_publish`, {
    creation_id: creationId,
    access_token: IG_ACCESS_TOKEN!,
  });
  return String(res.id);
}

/** Đăng lên Threads: text thuần, 1 ảnh/video, hoặc carousel nhiều ảnh. */
export async function publishToThreads(idea: Idea): Promise<string> {
  if (!THREADS_ACCESS_TOKEN || !THREADS_USER_ID) throw new Error("Chưa cấu hình Threads trong .env");
  const text = captionFor(idea);
  const video = idea.post_format === "video" || idea.post_format === "reel" ? videoAssetFor(idea) : undefined;
  const images = assetsFor(idea, "ig_threads");

  let creationId: string;
  if (video) {
    const container = await graphPost(`${THREADS_GRAPH_URL}/${THREADS_USER_ID}/threads`, {
      media_type: "VIDEO",
      video_url: video.file_path,
      text,
      access_token: THREADS_ACCESS_TOKEN,
    });
    creationId = String(container.id);
  } else if (images.length > 1) {
    const childIds: string[] = [];
    for (const img of images) {
      const child = await graphPost(`${THREADS_GRAPH_URL}/${THREADS_USER_ID}/threads`, {
        media_type: "IMAGE",
        image_url: img.file_path,
        is_carousel_item: "true",
        access_token: THREADS_ACCESS_TOKEN,
      });
      childIds.push(String(child.id));
    }
    const container = await graphPost(`${THREADS_GRAPH_URL}/${THREADS_USER_ID}/threads`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      text,
      access_token: THREADS_ACCESS_TOKEN,
    });
    creationId = String(container.id);
  } else if (images.length === 1) {
    const container = await graphPost(`${THREADS_GRAPH_URL}/${THREADS_USER_ID}/threads`, {
      media_type: "IMAGE",
      image_url: images[0].file_path,
      text,
      access_token: THREADS_ACCESS_TOKEN,
    });
    creationId = String(container.id);
  } else {
    const container = await graphPost(`${THREADS_GRAPH_URL}/${THREADS_USER_ID}/threads`, {
      media_type: "TEXT",
      text,
      access_token: THREADS_ACCESS_TOKEN,
    });
    creationId = String(container.id);
  }

  const res = await graphPost(`${THREADS_GRAPH_URL}/${THREADS_USER_ID}/threads_publish`, {
    creation_id: creationId,
    access_token: THREADS_ACCESS_TOKEN,
  });
  return String(res.id);
}

export async function publishToPlatform(idea: Idea, platform: SocialPlatform): Promise<string> {
  if (platform === "facebook") return publishToFacebook(idea);
  if (platform === "instagram") return publishToInstagram(idea);
  return publishToThreads(idea);
}
