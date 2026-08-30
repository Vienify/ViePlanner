import {
  CheckCircle2,
  Clapperboard,
  Clock,
  GalleryVerticalEnd,
  Image as ImageIcon,
  Images,
  Lightbulb,
  MonitorPlay,
  Video,
  type LucideIcon,
} from "lucide-react";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type AssetKind = "image" | "demo";
export type AssetPlatform = "fb" | "ig_threads" | "general";
export type IdeaStatus = "idea" | "scheduled" | "posted";
export type PostFormat = "image" | "carousel" | "video" | "reel" | "story_image" | "story_video";

export interface Asset {
  id: number;
  idea_id: number;
  file_path: string;
  original_name: string;
  kind: AssetKind;
  platform: AssetPlatform;
}

export interface Idea {
  id: number;
  post_date: string; // YYYY-MM-DD
  category: string;
  post_format: PostFormat;
  content: string;
  detail_content: string;
  asset_note: string;
  time_fb: string;
  time_ig: string;
  time_threads: string;
  status: IdeaStatus;
  fb_post_id: string | null;
  ig_post_id: string | null;
  threads_post_id: string | null;
  assets: Asset[];
}

export type IdeaInput = Omit<
  Idea,
  "id" | "assets" | "fb_post_id" | "ig_post_id" | "threads_post_id"
>;

export type SocialPlatform = "facebook" | "instagram" | "threads";

export interface SocialStatus {
  facebook: boolean;
  instagram: boolean;
  threads: boolean;
}

export interface SocialAccountInfo {
  configured: boolean;
  name?: string;
  url?: string;
  avatar?: string | null;
  tokenExpiresAt?: string | null;
  error?: string;
}

export interface SocialAccounts {
  facebook: SocialAccountInfo;
  instagram: SocialAccountInfo;
  threads: SocialAccountInfo;
}

export interface User {
  id: number;
  email: string;
  name: string;
  zoho_id?: string | null;
  created_at?: string | null;
  last_login?: string | null;
  last_login_ip?: string | null;
  last_login_device?: string | null;
  last_login_location?: string | null;
}

export interface Category {
  id: number;
  name: string;
}

export const STATUS_LABELS: Record<IdeaStatus, string> = {
  idea: "Lên ý tưởng",
  scheduled: "Chờ đăng",
  posted: "Đã đăng",
};

export const STATUS_ICONS: Record<IdeaStatus, LucideIcon> = {
  idea: Lightbulb,
  scheduled: Clock,
  posted: CheckCircle2,
};

export const STATUS_COLORS: Record<IdeaStatus, string> = {
  idea: "bg-red-50 text-red-600 border-red-400",
  scheduled: "bg-amber-50 text-amber-700 border-amber-400",
  posted: "bg-emerald-50 text-emerald-700 border-emerald-400",
};

export const POST_FORMAT_LABELS: Record<PostFormat, string> = {
  image: "Bài viết ảnh",
  carousel: "Album nhiều ảnh",
  video: "Bài viết video",
  reel: "Reel / Video ngắn",
  story_image: "Story ảnh",
  story_video: "Story video",
};

export const POST_FORMAT_ICONS: Record<PostFormat, LucideIcon> = {
  image: ImageIcon,
  carousel: Images,
  video: Video,
  reel: Clapperboard,
  story_image: GalleryVerticalEnd,
  story_video: MonitorPlay,
};

const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export function weekdayVN(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? "" : WEEKDAYS[d.getDay()];
}

export function formatDateVN(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function assetUrl(a: Asset): string {
  return `${API_URL}${a.file_path}`;
}

export function isVideo(a: Asset): boolean {
  return /\.(mp4|webm|mov)$/i.test(a.file_path);
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Lỗi ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const zohoLoginUrl = `${API_URL}/auth/zoho`;

const TOKEN_KEY = "vieplanner_token";

// Frontend (Vercel) và backend (Render) khác domain nhau nên không dùng
// cookie được (bị trình duyệt chặn cookie cross-site trên nhiều máy/trình
// duyệt) — lưu token đăng nhập vào localStorage và gửi qua header Authorization.
export function saveToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchMe(): Promise<User | null> {
  if (!getToken()) return null;
  const res = await fetch(`${API_URL}/api/me`, { headers: authHeaders(), cache: "no-store" });
  if (res.status === 401) return null;
  return handle(res);
}

export async function logout(): Promise<void> {
  clearToken();
  await fetch(`${API_URL}/auth/logout`, { method: "POST" });
}

export async function fetchIdeas(month?: string): Promise<Idea[]> {
  const q = month ? `?month=${month}` : "";
  return handle(
    await fetch(`${API_URL}/api/ideas${q}`, { cache: "no-store", headers: authHeaders() })
  );
}

export async function fetchCategories(): Promise<Category[]> {
  return handle(
    await fetch(`${API_URL}/api/categories`, { cache: "no-store", headers: authHeaders() })
  );
}

export async function createIdea(data: Partial<IdeaInput>): Promise<Idea> {
  return handle(
    await fetch(`${API_URL}/api/ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    })
  );
}

export async function updateIdea(id: number, data: Partial<IdeaInput>): Promise<Idea> {
  return handle(
    await fetch(`${API_URL}/api/ideas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    })
  );
}

export async function deleteIdea(id: number): Promise<void> {
  await handle(
    await fetch(`${API_URL}/api/ideas/${id}`, { method: "DELETE", headers: authHeaders() })
  );
}

export async function uploadAssets(
  ideaId: number,
  files: FileList | File[],
  kind: AssetKind,
  platform: AssetPlatform = "general"
): Promise<Asset[]> {
  const fd = new FormData();
  for (const f of Array.from(files)) fd.append("files", f);
  fd.append("kind", kind);
  fd.append("platform", platform);
  return handle(
    await fetch(`${API_URL}/api/ideas/${ideaId}/assets`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    })
  );
}

export async function deleteAsset(id: number): Promise<void> {
  await handle(
    await fetch(`${API_URL}/api/assets/${id}`, { method: "DELETE", headers: authHeaders() })
  );
}

export async function fetchSocialStatus(): Promise<SocialStatus> {
  return handle(
    await fetch(`${API_URL}/api/social/status`, { cache: "no-store", headers: authHeaders() })
  );
}

export async function fetchSocialAccounts(): Promise<SocialAccounts> {
  return handle(
    await fetch(`${API_URL}/api/social/accounts`, { cache: "no-store", headers: authHeaders() })
  );
}

export async function publishIdea(id: number, platform: SocialPlatform): Promise<Idea> {
  return handle(
    await fetch(`${API_URL}/api/ideas/${id}/publish/${platform}`, {
      method: "POST",
      headers: authHeaders(),
    })
  );
}
