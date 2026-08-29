"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, Loader2, TriangleAlert } from "lucide-react";
import { SiFacebook, SiInstagram, SiThreads } from "react-icons/si";
import { SocialAccountInfo, SocialAccounts, User, fetchMe, fetchSocialAccounts } from "@/lib/api";
import { useRouter } from "next/navigation";

const PLATFORM_LABELS: Record<keyof SocialAccounts, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
};

function formatExpiry(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTimeVN(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PlatformIcon({ platform, className = "h-12 w-12" }: { platform: keyof SocialAccounts; className?: string }) {
  if (platform === "facebook") {
    return <SiFacebook className={`${className} shrink-0 text-[#1877F2]`} />;
  }
  if (platform === "instagram") {
    return (
      <div className={`${className} flex shrink-0 items-center justify-center rounded-[22%] bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888]`}>
        <SiInstagram className="h-[55%] w-[55%] text-white" />
      </div>
    );
  }
  return (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-full bg-black`}>
      <SiThreads className="h-[55%] w-[55%] text-white" />
    </div>
  );
}

function AccountRow({ platform, info }: { platform: keyof SocialAccounts; info: SocialAccountInfo }) {
  const label = PLATFORM_LABELS[platform];

  if (!info.configured) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-5 text-center opacity-60">
        <div className="mx-auto flex aspect-square w-[70%] items-center justify-center">
          <PlatformIcon platform={platform} className="h-full w-full" />
        </div>
        <div className="leading-tight">
          <p className="text-base font-medium text-zinc-800">{label}</p>
          <p className="text-sm text-zinc-400">Chưa cấu hình</p>
        </div>
      </div>
    );
  }

  if (info.error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-5 text-center">
        <div className="mx-auto flex aspect-square w-[70%] items-center justify-center">
          <PlatformIcon platform={platform} className="h-full w-full" />
        </div>
        <div className="leading-tight">
          <p className="text-base font-medium text-zinc-800">{label}</p>
          <p className="flex items-center justify-center gap-1 text-sm text-red-500">
            <TriangleAlert className="h-4 w-4" />
            Lỗi kết nối
          </p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={info.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col items-center gap-3 rounded-xl bg-white px-4 py-5 text-center transition hover:bg-zinc-50"
    >
      <ExternalLink className="absolute right-3 top-3 h-4 w-4 shrink-0 text-zinc-300 group-hover:text-zinc-400" />
      <div className="mx-auto flex aspect-square w-[70%] items-center justify-center">
        <PlatformIcon platform={platform} className="h-full w-full" />
      </div>
      <div className="leading-tight">
        <p className="text-base font-medium text-zinc-800">{label}</p>
        <p className="text-sm text-zinc-400">{info.name}</p>
        {info.tokenExpiresAt && (
          <p className="mt-0.5 text-xs text-amber-600">
            Token cần gia hạn trước: {formatExpiry(info.tokenExpiresAt)}
          </p>
        )}
      </div>
    </a>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accounts, setAccounts] = useState<SocialAccounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then((me) => {
      if (!me) {
        router.replace("/login");
        return;
      }
      setUser(me);
      setAuthChecked(true);
    });
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    fetchSocialAccounts()
      .then(setAccounts)
      .catch(() => setAccounts(null))
      .finally(() => setLoading(false));
  }, [authChecked]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-400">
        Đang kiểm tra đăng nhập…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-[80%] items-center gap-3 py-4">
          <Link
            href="/"
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
            title="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">Cài đặt tài khoản</h1>
        </div>
      </header>

      <main className="mx-auto w-[80%] flex-1 py-8">
        <div className="rounded-xl border border-zinc-200 px-5 py-4">
          <section className="mb-8">
            <p className="mb-2 text-base font-semibold uppercase tracking-wide text-zinc-400">
              Tổ chức
            </p>
            <div className="flex items-center gap-4">
              <Image src="/Logo.png" alt="Vienify" width={160} height={160} className="h-[160px] w-[160px] shrink-0" />
              <div>
                <p className="text-2xl font-bold text-zinc-900">Công ty TNHH Vienify Software</p>
                <a
                  href="https://www.vienify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg text-zinc-500 hover:text-zinc-700 hover:underline"
                >
                  www.vienify.com
                </a>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-3">
              {[
                { label: "Miền", value: "www.vienify.com" },
                { label: "Tổ chức", value: "Vienify Software" },
                { label: "Người dùng", value: "6" },
                { label: "Nhóm", value: "0" },
                { label: "Tổng Giấy Phép", value: "30" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-zinc-50 px-3 py-2">
                  <p className="text-sm uppercase tracking-wide text-zinc-400">{item.label}</p>
                  <p className="truncate text-lg font-semibold text-zinc-800">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <p className="mb-2 text-base font-semibold uppercase tracking-wide text-zinc-400">
              Tài khoản đăng nhập
            </p>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <div>
                <p className="truncate text-lg font-medium text-zinc-700">{user?.name || "—"}</p>
                <p className="truncate text-base text-zinc-400">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-400">ID nội bộ</p>
                <p className="text-lg font-medium text-zinc-700">{user?.id ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-400">Zoho ID</p>
                <p className="text-lg font-medium text-zinc-700">{user?.zoho_id || "—"}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-400">Đăng nhập gần nhất</p>
                <p className="text-lg font-medium text-zinc-700">
                  {user?.last_login ? formatDateTimeVN(user.last_login) : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-400">Địa chỉ IP</p>
                <p className="text-lg font-medium text-zinc-700">{user?.last_login_ip || "—"}</p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-400">Vị trí</p>
                <p className="truncate text-lg font-medium text-zinc-700">
                  {user?.last_login_location || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-400">Thiết bị</p>
                <p className="truncate text-lg font-medium text-zinc-700">
                  {user?.last_login_device || "—"}
                </p>
              </div>
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Kênh mạng xã hội
            </p>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải…
              </div>
            ) : accounts ? (
              <div className="grid grid-cols-5 gap-3">
                {(Object.keys(PLATFORM_LABELS) as (keyof SocialAccounts)[]).map((key, index) => (
                  <div key={key} className={`col-span-1 ${["col-start-2", "col-start-3", "col-start-4"][index]}`}>
                    <AccountRow platform={key} info={accounts[key]} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-zinc-400">Không tải được thông tin kênh</p>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-[80%] flex-wrap items-center justify-between gap-2 py-4 text-xs text-zinc-400">
          <span>© {new Date().getFullYear()} Vienify Content Planner</span>
          <a
            href="https://www.vienify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-600 hover:underline"
          >
            www.vienify.com
          </a>
        </div>
      </footer>
    </div>
  );
}
