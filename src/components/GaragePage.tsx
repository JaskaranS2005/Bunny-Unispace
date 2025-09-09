import React, { useState } from 'react';
import { AIService } from '../services/aiService';
import GarageWorkflow from './GarageWorkflow';
import Icon, { IconName } from './Icon';

interface GaragePageProps {
  connectedServices: AIService[];
  onBack: () => void;
}

const GARAGE_OPTIONS = [
  {
    id: 'build',
    title: 'Create/Build App',
    icon: '🏗️',
    description: 'Collaborative development with specialized AI roles.',
    color: '#4F46E5',
    roles: ['Prompt Refiner', 'Backend Developer', 'Frontend Designer', 'Code Reviewer', 'Doc Specialist']
  },
  {
    id: 'research',
    title: 'Research & Analysis',
    icon: '🔍',
    description: 'Comprehensive research with data collection and analysis.',
    color: '#059669',
    roles: ['Coordinator', 'Data Collector', 'Analyst', 'Fact Checker', 'Report Writer']
  },
  {
    id: 'math',
    title: 'Solve Math Problem',
    icon: '🧮',
    description: 'Complex problem solving with step-by-step verification.',
    color: '#DC2626',
    roles: ['Interpreter', 'Strategist', 'Calculator', 'Verifier', 'Explainer']
  },
  {
    id: 'ideas',
    title: 'Creative Ideation',
    icon: '💡',
    description: 'Brainstorming new concepts with feasibility analysis.',
    color: '#7C2D12',
    roles: ['Coordinator', 'Generator', 'Analyst', 'Refiner', 'Planner']
  }
];

const GaragePage: React.FC<GaragePageProps> = ({ connectedServices, onBack }) => {
  const [selectedOption, setSelectedOption] = useState<any>(null);

  if (selectedOption) {
    return (
      <GarageWorkflow
        selectedOption={selectedOption}
        connectedServices={connectedServices}
        onBack={() => setSelectedOption(null)}
      />
    );
  }

  if (connectedServices.length < 2) {
    return (
      <div className="garage-page">
        <div className="welcome-message">
            <div className="logo-icon" style={{fontSize: '4rem'}}>⚠️</div>
            <h1>More AIs Needed</h1>
            <p style={{maxWidth: '400px'}}>The Garage requires at least 2 connected AI services for collaboration. Please connect more services in Settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="garage-page">
      <div className="garage-header">
        <h1>BUNNY Garage</h1>
        <p className="garage-subtitle">Multi-AI Collaborative System</p>
      </div>

      <div className="ai-team-bar">
        <h3>Your AI Team:</h3>
        <div className="ai-team-pills">
          {connectedServices.map(service => (
            <div key={service.id} className="ai-team-pill">
              <Icon name={service.icon as IconName} />
              <span>{service.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="garage-options-grid">
        {GARAGE_OPTIONS.map(option => (
          <div
            key={option.id}
            className="garage-option-card"
            style={{ '--card-accent-color': option.color } as React.CSSProperties}
            onClick={() => setSelectedOption(option)}
          >
            <div className="option-header">
              <span className="option-icon">{option.icon}</span>
              <h3 className="option-title">{option.title}</h3>
            </div>
            <p className="option-description">{option.description}</p>
            <div className="option-roles">
              {option.roles.map((role, index) => (
                <span key={index} className="role-tag">
                  {String.fromCharCode(65 + index)}: {role}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GaragePage;