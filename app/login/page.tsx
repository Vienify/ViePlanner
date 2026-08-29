"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { SiZoho } from "react-icons/si";
import { fetchMe, zohoLoginUrl } from "@/lib/api";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Phiên đăng nhập không hợp lệ, vui lòng thử lại.",
  token_failed: "Không lấy được token từ Zoho. Kiểm tra Client ID/Secret.",
  userinfo_failed: "Không lấy được thông tin tài khoản Zoho.",
  server_error: "Lỗi máy chủ, vui lòng thử lại.",
  access_denied: "Bạn đã từ chối cấp quyền đăng nhập.",
  domain_not_allowed: "Chỉ tài khoản email @vienify.com mới được phép đăng nhập.",
};

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    fetchMe().then((me) => {
      if (me) router.replace("/");
    });
  }, [router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-zinc-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-red-100/60 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-3xl border border-zinc-200 bg-white/90 p-8 text-center shadow-2xl backdrop-blur">
        <Image src="/Logo.png" alt="Vienify" width={100} height={100} className="mx-auto mb-4 h-30 w-30" />
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Vienify Content Planner</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Quản lý ý tưởng nội dung cho FB · IG · Threads
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {ERROR_MESSAGES[error] || `Đăng nhập thất bại: ${error}`}
          </div>
        )}

        <a
          href={zohoLoginUrl}
          className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#C8202F] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-900/20 transition hover:bg-[#a91a27] active:scale-[0.99]"
        >
          <SiZoho className="h-12 w-12 shrink-0 text-white" />
          Đăng nhập bằng Zoho Mail
          <ArrowRight className="h-4 w-4 shrink-0" />
        </a>

        {/* <p className="mt-5 text-xs text-zinc-400">
          Bạn sẽ được chuyển đến trang đăng nhập an toàn của Zoho.
        </p> */}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
