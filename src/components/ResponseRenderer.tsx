import React from 'react';
import CodeBlock from './CodeBlock';

interface ResponseRendererProps {
  content: string;
  serviceName: string;
  serviceIcon: string; // ✨ CORRECTED: Changed to string
}

interface ParsedSection {
  type: 'text' | 'code';
  content: string;
  language?: string;
  filename?: string;
}

const ResponseRenderer: React.FC<ResponseRendererProps> = ({ content }) => {
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'html': 'html', 'css': 'css', 'js': 'javascript', 'jsx': 'jsx',
      'ts': 'typescript', 'tsx': 'tsx', 'py': 'python', 'json': 'json',
      'xml': 'xml', 'md': 'markdown'
    };
    return languageMap[ext || ''] || 'text';
  };

  const parseResponse = (text: string): ParsedSection[] => {
    const sections: ParsedSection[] = [];
    let currentIndex = 0;
    const patterns = [
      /\[File:\s*([^\]]+)\]\s*```(\w*)?\s*\n([\s\S]*?)```/g,
      /###\s+([^\n]+\.(?:html|css|js|jsx|ts|tsx|py|json|xml|md))\s*```(\w*)?\s*\n([\s\S]*?)```/g,
      /\*\*([^*]+\.(?:html|css|js|jsx|ts|tsx|py|json|xml|md))\*\*\s*```(\w*)?\s*\n([\s\S]*?)```/g,
      /```(\w*)\s*\n([\s\S]*?)```/g
    ];
    const allMatches: Array<{ index: number; length: number; filename?: string; language: string; code: string; }> = [];
    patterns.forEach((pattern) => {
      for (const match of text.matchAll(pattern)) {
        if (match.index === undefined) continue;
        const isFilenamePattern = patterns.indexOf(pattern) < 3;
        allMatches.push({
          index: match.index,
          length: match[0].length,
          filename: isFilenamePattern ? match[1] : undefined,
          language: isFilenamePattern ? (match[2] || getLanguageFromFilename(match[1])) : (match[1] || 'text'),
          code: isFilenamePattern ? match[3] : match[2]
        });
      }
    });
    if (allMatches.length === 0) {
      return [{ type: 'text', content: text }];
    }
    allMatches.sort((a, b) => a.index - b.index);
    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === 0 || match.index >= self[index - 1].index + self[index - 1].length
    );
    uniqueMatches.forEach(match => {
      if (match.index > currentIndex) {
        sections.push({ type: 'text', content: text.slice(currentIndex, match.index) });
      }
      sections.push({ type: 'code', content: match.code, language: match.language, filename: match.filename });
      currentIndex = match.index + match.length;
    });
    if (currentIndex < text.length) {
      sections.push({ type: 'text', content: text.slice(currentIndex) });
    }
    return sections;
  };

  const renderWithInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const formatTextContent = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    const renderList = () => {
      if (currentList.length > 0) {
        elements.push(<ul key={`ul-${elements.length}`} className="list-disc space-y-1 pl-5">{currentList.map((item, i) => <li key={i}>{renderWithInlineFormatting(item)}</li>)}</ul>);
        currentList = [];
      }
    };
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        currentList.push(trimmedLine.replace(/^[\s]*[\*\-]\s*/, ''));
      } else if (trimmedLine.startsWith('#')) {
        renderList();
        const level = trimmedLine.match(/^#+/)?.[0].length || 1;
        const headerText = trimmedLine.replace(/^#+\s*/, '');
        const HeaderTag = `h${Math.min(level + 1, 6)}` as keyof JSX.IntrinsicElements;
        elements.push(<HeaderTag key={`h-${index}`}>{renderWithInlineFormatting(headerText)}</HeaderTag>);
      } else {
        renderList();
        elements.push(<p key={`p-${index}`}>{renderWithInlineFormatting(line)}</p>);
      }
    });
    renderList();
    return <div className="response-text-content space-y-4">{elements}</div>;
  };

  const sections = parseResponse(content);

  return (
    <div className="response-renderer">
      {sections.map((section, index) => (
        <div key={index} className="response-section">
          {section.type === 'code' ? (
            <CodeBlock code={section.content} language={section.language || 'text'} filename={section.filename} />
          ) : (
            formatTextContent(section.content)
          )}
        </div>
      ))}
    </div>
  );
};

export default ResponseRenderer;

