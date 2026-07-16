import { MODELS } from "../../lib/models";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getMoodLogs, getRecentChatSummaries, getProfile, getMonthlyReports, saveMonthlyReport } from "../../lib/db";

const MOOD_VALUES = { great: 4, ok: 3, meh: 2, down: 1, bad: 0 };
const MOOD_LABEL  = { great: "很好", ok: "还行", meh: "一般", down: "低落", bad: "很差" };
const MOOD_EMOJI  = { great: "😄", ok: "🙂", meh: "😐", down: "😔", bad: "😣" };


export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const reports = await getMonthlyReports(userId);
    return res.status(200).json({ reports });
  }

  if (req.method === "POST") {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const monthStart = yearMonth + "-01";
    const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);

    const [profile, allLogs, summaries] = await Promise.all([
      getProfile(userId), getMoodLogs(userId, 60), getRecentChatSummaries(userId, 8),
    ]);

    const logs = allLogs.filter(l => {
      const d = typeof l.log_date === "string" ? l.log_date : new Date(l.log_date).toISOString().slice(0,10);
      return d >= monthStart && d <= monthEnd;
    });

    if (logs.length < 3) return res.status(200).json({ error: "本月打卡不足3天，暂时无法生成报告" });

    const moodVals = logs.map(l => MOOD_VALUES[l.mood] ?? 2);
    const avg = (moodVals.reduce((a,b)=>a+b,0)/moodVals.length).toFixed(1);
    const best = logs.reduce((a,b)=>MOOD_VALUES[a.mood]>MOOD_VALUES[b.mood]?a:b);
    const worst = logs.reduce((a,b)=>MOOD_VALUES[a.mood]<MOOD_VALUES[b.mood]?a:b);
    const moodCounts = {};
    logs.forEach(l=>{moodCounts[l.mood]=(moodCounts[l.mood]||0)+1;});
    const dominant = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const mid = Math.floor(logs.length/2);
    const f = logs.slice(0,mid).map(l=>MOOD_VALUES[l.mood]??2);
    const s = logs.slice(mid).map(l=>MOOD_VALUES[l.mood]??2);
    const fAvg = f.reduce((a,b)=>a+b,0)/f.length;
    const sAvg = s.reduce((a,b)=>a+b,0)/s.length;
    const trend = sAvg>fAvg+0.3?"上升":sAvg<fAvg-0.3?"下降":"平稳";

    const getDate = l => typeof l.log_date==="string"?l.log_date:new Date(l.log_date).toISOString().slice(0,10);

    if (!process.env.SILICONFLOW_API_KEY) return res.status(500).json({ error: "未配置API Key" });

    const prompt = `你是一个有温度的心理成长记录员，帮一个青少年写这个月的成长报告。

用户：${profile?.nickname||"这位朋友"}，${profile?.age||""}岁
本月（${yearMonth}）数据：
- 打卡${logs.length}天，平均心情${avg}/4，整体趋势${trend}
- 最好的一天：${getDate(best)}（${MOOD_LABEL[best.mood]}）
- 最常见的心情：${MOOD_LABEL[dominant]||"一般"}
最近聊天提到的事：
${summaries.slice(0,5).map(s=>"- "+s.summary).join("\n")||"（本月没有对话记录）"}

请写一份100-150字的月度成长报告：
1. 用第二人称，像懂你的朋友在回顾这个月
2. 从数据出发但有温度，不要堆砌数字
3. 提到这个月值得被看见的变化
4. 结尾给一句对下个月的期待或鼓励
5. 不说教，不用"你应该"，直接开始`;

    try {
      const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}` },
        body: JSON.stringify({ model: MODELS.utility, messages: [{ role: "user", content: prompt }], max_tokens: 300, temperature: 0.7 }),
      });
      const data = await r.json();
      const narrative = data?.choices?.[0]?.message?.content?.trim() || "";
      const report = {
        type: "monthly", yearMonth, checkIns: logs.length,
        avgScore: Number(avg), trend, dominant,
        dominantEmoji: MOOD_EMOJI[dominant]||"😐", dominantLabel: MOOD_LABEL[dominant]||"一般",
        bestDay: { date: getDate(best), mood: best.mood, label: MOOD_LABEL[best.mood] },
        worstDay: { date: getDate(worst), mood: worst.mood, label: MOOD_LABEL[worst.mood] },
        narrative, generatedAt: new Date().toISOString(),
      };
      await saveMonthlyReport(userId, yearMonth + "-01", report);
      return res.status(200).json({ ok: true, report });
    } catch(err) {
      return res.status(500).json({ error: String(err).slice(0,100) });
    }
  }
  return res.status(405).end();
}
