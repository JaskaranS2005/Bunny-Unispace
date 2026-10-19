import React, { useEffect, useState } from 'react';

interface AgentThinkingProps {
  serviceName: string;
  compact?: boolean;
}

const THINKING_PHASES = [
  'Reading your prompt',
  'Planning a response',
  'Checking the details',
];

const AgentThinking: React.FC<AgentThinkingProps> = ({ serviceName, compact = false }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhase(current => (current + 1) % THINKING_PHASES.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={`agent-thinking${compact ? ' agent-thinking-compact' : ''}`} role="status" aria-live="polite">
      <span className="thinking-orbit" aria-hidden="true">
        <span className="thinking-orbit-dot" />
      </span>
      <span className="thinking-copy">
        <strong>{serviceName} is thinking</strong>
        <span className="thinking-phase">
          {THINKING_PHASES[phase]}
          <span className="thinking-dots" aria-hidden="true">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </span>
      </span>
    </div>
  );
};

export default AgentThinking;
