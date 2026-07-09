import { SessionProvider } from "next-auth/react";
import { TopProgressBar } from "../components/PageTransition";
import "../styles/globals.css";

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <TopProgressBar />
      <Component {...pageProps} />
    </SessionProvider>
  );
}
