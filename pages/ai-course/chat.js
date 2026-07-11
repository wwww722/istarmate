import { useEffect } from "react";
import { useRouter } from "next/router";

// 旧的自由聊天页已合并进工作室，自动跳转
export default function AiCourseChatRedirect() {
  const router = useRouter();
  useEffect(() => {
    const stage = router.query.stage;
    router.replace(stage ? `/ai-course/studio?stage=${stage}` : "/ai-course/studio");
  }, [router]);
  return null;
}
