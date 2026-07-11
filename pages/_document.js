import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh">
      <Head>
        {/* 开屏前就应用主题，避免深色模式闪白 */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('istarmate_theme') || 'light';
              document.documentElement.setAttribute('data-theme', t);
            } catch(e) {}
          })();
        ` }} />
        <meta name="description" content="IStarMate — 陪伴青少年认识情绪、学会用AI创造的成长伙伴" />
        <meta property="og:title" content="IStarMate" />
        <meta property="og:description" content="每天几分钟，陪你认识自己今天的心情，学会用AI做出你的第一个作品。" />
        <meta property="og:type" content="website" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
