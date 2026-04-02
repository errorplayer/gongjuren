# 希望这个项目能帮到你  

## text-heal  

|想做什么|修改哪个文件|location|  
|---|---|---|   
|增加/删除/修改场景（名称、描述等）|app/lib/text-heal-scenes.js|sceneList 数组|  
|修改场景图标|	app/tools/text-heal/page.js|第 103-112 行 getSceneIcon 函数|  
|修改每个场景的 prompt 细节|	app/lib/text-heal-scenes.js|	对应场景的 description 字段|  
|修改整体 prompt 模板（如"保持原意不变"等规则）|	app/api/text-heal/providers/kimi.js|	第 23-33 行|  
|  |app/api/text-heal/providers/deepseek.js|	第 23-30 行 |  
|修改场景卡片的 UI 样式|	app/tools/text-heal/page.js	第 122-137 行（HTML 结构）|  
|  | app/globals.css|	.scene-card 相关样式|  



This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



