import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../contexts/AppContext';
import { toast } from 'react-hot-toast';
import Icon from './Icon';

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
      toast.success((filename || 'Code') + ' copied to clipboard.');
      window.setTimeout(() => setCopied(false), 2000);
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    } catch {
      toast.error('Failed to copy code.');
    }
  };

  const copyButton = (
    <button
      type="button"
      className={filename ? 'copy-code-button' : 'copy-code-button-overlay'}
      onClick={copyToClipboard}
      title={filename ? 'Copy ' + filename : 'Copy code'}
      aria-label={filename ? 'Copy ' + filename : 'Copy code'}
    >
      <Icon name={copied ? 'FiCheck' : 'FiCopy'} aria-hidden="true" />
      {!filename && <span>{copied ? 'Copied' : 'Copy'}</span>}
    </button>
  );

  return (
    <div className="code-block-container">
      {filename && (
        <div className="code-block-header">
          <span className="code-filename">{filename}</span>
          {copyButton}
        </div>
      )}

      <div className="code-block-wrapper">
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? vscDarkPlus : vs}
          showLineNumbers
          wrapLines
          customStyle={{
            margin: 0,
            borderRadius: filename ? '0 0 0.5rem 0.5rem' : '0.5rem',
            fontSize: '0.9rem',
            lineHeight: '1.4',
          }}
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>

      {!filename && copyButton}
    </div>
  );
};

export default CodeBlock;
