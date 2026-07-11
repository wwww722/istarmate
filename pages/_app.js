import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { TopProgressBar } from "../components/PageTransition";
import ErrorBoundary from "../components/ErrorBoundary";
import { getTheme, applyTheme } from "../lib/theme";
import "../styles/globals.css";

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  useEffect(() => {
    // 应用保存的主题（避免闪烁，尽早执行）
    applyTheme(getTheme());
  }, []);

  return (
    <SessionProvider session={session}>
      <TopProgressBar />
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </SessionProvider>
  );
}
