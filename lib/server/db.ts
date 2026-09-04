import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  throw new Error(
    "Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SECRET_KEY. Kiểm tra file .env."
  );
}

// Client dùng secret key (service role) -> chỉ được dùng ở phía server (route handlers),
// không bao giờ import file này từ component "use client".
export const db = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
