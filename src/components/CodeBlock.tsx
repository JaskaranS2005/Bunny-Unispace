import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../contexts/AppContext';
import { toast } from 'react-hot-toast';

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, filename }) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`${filename || 'Code'} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className="code-block-container">
      {filename && (
        <div className="code-block-header">
          <span className="code-filename">{filename}</span>
          <button 
            className="copy-code-button"
            onClick={copyToClipboard}
            title={`Copy ${filename}`}
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>
      )}
      
      <div className="code-block-wrapper">
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? vscDarkPlus : vs}
          showLineNumbers={true}
          wrapLines={true}
          customStyle={{
            margin: 0,
            borderRadius: filename ? '0 0 0.5rem 0.5rem' : '0.5rem',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
      
      {!filename && (
        <button 
          className="copy-code-button-overlay"
          onClick={copyToClipboard}
          title="Copy code"
        >
          {copied ? '✅ Copied' : '📋 Copy'}
        </button>
      )}
    </div>
  );
};

export default CodeBlock;
