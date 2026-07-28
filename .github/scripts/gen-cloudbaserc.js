// 由 GitHub Actions 调用，从环境变量读取并生成正确的 cloudbaserc.json
const fs = require('fs');

const config = {
  envId: process.env.TCB_ENV_ID,
  framework: {
    name: 'istarmate-cn',
    plugins: {
      client: {
        use: '@cloudbase/framework-plugin-next',
        inputs: {
          buildCommand: 'npm run build',
          entry: './',
          cloudFunctionPath: '/next',
          runtime: 'Nodejs16.13',
          envVariables: {
            DATABASE_URL: process.env.DATABASE_URL,
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
            NEXTAUTH_URL: process.env.NEXTAUTH_URL,
            SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY
          }
        }
      }
    }
  }
};

fs.writeFileSync('cloudbaserc.json', JSON.stringify(config, null, 2) + String.fromCharCode(10));
console.log('✅ cloudbaserc.json 已生成，envId =', process.env.TCB_ENV_ID);
console.log(fs.readFileSync('cloudbaserc.json', 'utf8').slice(0, 500));
