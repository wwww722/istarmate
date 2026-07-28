// pages/_app.js （超级升级替换版）
// 挂载了：游戏化 HUD + 全局 Footer + 全局样式 minHeight flex 布局
import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { TopProgressBar } from "../components/PageTransition";
import ErrorBoundary from "../components/ErrorBoundary";
import { getTheme, applyTheme } from "../lib/theme";
import GamificationHUD from "../components/GamificationHUD";
import GlobalFooter from "../components/GlobalFooter";
import { useRouter } from "next/router";
import "../styles/globals.css";

function Shell({ children }) {
  const { data: sess } = useSession();
  const router = useRouter();
  const NO_CHROME_PATHS = ["/login","/register","/forgot-password","/reset-password"];
  const noChrome = NO_CHROME_PATHS.includes(router.pathname) || (!sess);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {sess && !noChrome && <GamificationHUD />}
      <div style={{ flex: 1 }}>{children}</div>
      {!noChrome && <GlobalFooter />}
    </div>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  useEffect(() => { applyTheme(getTheme()); }, []);
  return (
    <SessionProvider session={session} refetchInterval={5 * 60}>
      <TopProgressBar />
      <ErrorBoundary>
        <Shell>
          <Component {...pageProps} />
        </Shell>
      </ErrorBoundary>
    </SessionProvider>
  );
}
