// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";

// 微信网页登录不是标准 OAuth2/OIDC，next-auth 没有内置 provider，
// 这里用一个自定义 OAuth provider 对接微信开放平台的网页授权流程。
// 文档: https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
function WeChatProvider(options) {
  return {
    id: "wechat",
    name: "微信",
    type: "oauth",
    authorization: {
      url: "https://open.weixin.qq.com/connect/qrconnect",
      params: { appid: options.clientId, response_type: "code", scope: "snsapi_login" },
    },
    token: "https://api.weixin.qq.com/sns/oauth2/access_token",
    userinfo: "https://api.weixin.qq.com/sns/userinfo",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    profile(profile) {
      return {
        id: profile.unionid || profile.openid,
        name: profile.nickname,
        image: profile.headimgurl,
      };
    },
  };
}

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }),
    WeChatProvider({
      clientId: process.env.WECHAT_APP_ID,
      clientSecret: process.env.WECHAT_APP_SECRET,
    }),
    // 邮箱+密码注册登录（最简单的兜底方式，先用内存/数据库自行替换）
    CredentialsProvider({
      name: "邮箱密码",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        // TODO: 这里接你自己的用户数据库做真实校验（比如查 Postgres / Supabase）
        // 目前先做一个占位实现：任何邮箱密码都能登录，方便你先跑通流程。
        if (!credentials?.email || !credentials?.password) return null;
        return { id: credentials.email, name: credentials.email, email: credentials.email };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
