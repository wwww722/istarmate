import { useEffect } from "react";
import { useRouter } from "next/router";

// 学习地图已合并进工作室，自动跳转
export default function PathRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/ai-course/studio"); }, [router]);
  return null;
}
