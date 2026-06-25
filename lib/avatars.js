// lib/avatars.js
// 给每个用户随机分配一个"动物代号"，纯粹是好玩的身份标识，跟问卷内容无关。
export const ANIMALS = [
  { name: "松鼠", emoji: "🐿️" },
  { name: "小熊", emoji: "🐻" },
  { name: "兔子", emoji: "🐰" },
  { name: "狐狸", emoji: "🦊" },
  { name: "猫头鹰", emoji: "🦉" },
  { name: "水獭", emoji: "🦦" },
  { name: "刺猬", emoji: "🦔" },
  { name: "小鹿", emoji: "🦌" },
  { name: "熊猫", emoji: "🐼" },
  { name: "考拉", emoji: "🐨" },
];

export function randomAvatar() {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const code = String(Math.floor(Math.random() * 900) + 100); // 三位数代号
  return { name: animal.name, emoji: animal.emoji, code };
}
