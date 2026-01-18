import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = 'd:\\002. 코딩\\naver-blog-wizard\\src\\App.jsx';

try {
    let content = fs.readFileSync(targetPath, 'utf8');

    // Find generateBlogPost
    const funcStart = content.indexOf('const generateBlogPost = async () => {');
    if (funcStart === -1) throw new Error('Function not found');

    // Find prompt start within basic range
    const promptStartSearch = content.indexOf('const prompt = `', funcStart);
    if (promptStartSearch === -1) throw new Error('Prompt start not found');

    // Find prompt end (backtick followed by semicolon) - need to be careful
    // We can look for `const result = await model.generateContent` and go back
    const nextLine = content.indexOf('const result = await model.generateContent', promptStartSearch);
    if (nextLine === -1) throw new Error('Next line not found');

    // Find the end of prompt before nextLine
    const promptEnd = content.lastIndexOf('`;', nextLine);
    if (promptEnd === -1) throw new Error('Prompt end not found');

    // New prompt (escape backticks properly)
    const newPrompt = `const prompt = \`
당신은 '나(사용자)'의 입장에서 기록을 정리해주는 **나의 분신**입니다.
가장 중요한 원칙은 **"진실성 있는 경험(Authenticity)"**입니다.
AI가 쓴 티가 나는 "정보성 어투(~에 대해 알아봅시다)"나 "기계적인 텐션"은 절대 금지입니다. 🚫

\${userStylePrompt ? \`
[⭐⭐⭐ 특별 지시: 사용자 스타일 적용 ⭐⭐⭐]
다음은 사용자의 평소 글쓰기 스타일입니다. 이 스타일을 **반드시** 따르세요.
\${userStylePrompt}
\` : \`
[작성 원칙]
1. **나의 이야기로 쓰세요**: 제 3자가 설명하는 글이 아니라, 내가 직접 겪고 느낀 것처럼 **1인칭 시점**("저", "제가")으로 쓰세요.
2. **팩트에 감성을 더하세요**: 
   - ✖️ "커피를 마셨습니다. 맛있었습니다." (너무 딱딱함)
   - ✖️ "최고급 원두의 황홀한 맛이 혀끝을 감쌌습니다." (없는 사실/과장 금지)
   - ⭕️ "오랜만에 따뜻한 커피 한 잔 마시니 마음까지 차분해지는 기분이었어요. ☕️" (팩트+자연스러운 감정)
3. **간단한 메모도 정성스럽게**: 사용자가 "친구랑 밥 먹음"이라고만 해도, "좋은 사람과 함께하는 한 끼는 언제나 즐겁죠."처럼 문맥을 부드럽게 이어주세요.
\`}
4. **구성**:
   - 억지스러운 서론/결론 배제.
   - 자연스러운 흐름으로 이어지게.

다음 대화 내용을 바탕으로 블로그 포스트를 JSON 형식으로 작성하세요.
형식: { "title": "꾸미지 않은 듯 감각적인 제목", "content_blocks": ["(소제목 선택사항) 문단1", "문단2", ...], "tags": ["태그1", "태그2"] }

대화 내용:
\${chatSummary}\`;`;

    // Replace
    const before = content.substring(0, promptStartSearch);
    const after = content.substring(promptEnd + 2); // skip `;`
    const newContent = before + newPrompt + after;

    fs.writeFileSync(targetPath, newContent, 'utf8');
    console.log('Successfully updated prompt');

} catch (e) {
    console.error(e);
}
