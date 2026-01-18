import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const targetPath = 'd:\\002. 코딩\\naver-blog-wizard\\src\\App.jsx';

try {
    let content = fs.readFileSync(targetPath, 'utf8');

    const firstIndex = content.indexOf('const analyzeUserStyle = async () => {');
    if (firstIndex === -1) {
        console.log('Function not found even once.');
        process.exit(0);
    }

    const secondIndex = content.indexOf('const analyzeUserStyle = async () => {', firstIndex + 1);
    if (secondIndex === -1) {
        console.log('No duplicate found.');
        process.exit(0);
    }

    // Find the start of the duplicate block (including comment)
    const commentStr = '// --- Style Analysis Logic ---';
    const commentIndex = content.lastIndexOf(commentStr, secondIndex);

    let startRemove = secondIndex;
    if (commentIndex !== -1 && commentIndex > firstIndex) {
        startRemove = commentIndex;
    }

    // Find the end: The start of generateBlogPost's comment
    const genBlogIndex = content.indexOf('const generateBlogPost = async () => {', secondIndex);
    if (genBlogIndex === -1) throw new Error('generateBlogPost not found after duplicate');

    const blogCommentIndex = content.lastIndexOf('// --- Blog Generation ---', genBlogIndex);

    let endRemove = genBlogIndex; // default to function start
    if (blogCommentIndex !== -1 && blogCommentIndex > secondIndex) {
        endRemove = blogCommentIndex;
    }

    // Perform deletion
    const newContent = content.substring(0, startRemove) + '\n' + content.substring(endRemove);

    fs.writeFileSync(targetPath, newContent, 'utf8');
    console.log('Duplicate removed successfully.');

} catch (e) {
    console.error('Error:', e);
}
