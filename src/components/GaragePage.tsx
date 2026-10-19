import React, { useState } from 'react';
import { AIService, getServiceDisplayName } from '../services/aiService';
import { useApp } from '../contexts/AppContext';
import GarageWorkflow from './GarageWorkflow';
import Icon, { IconName } from './Icon';

interface GaragePageProps {
  connectedServices: AIService[];
  onBack: () => void;
}

interface GarageOption {
  id: 'build' | 'research' | 'math' | 'ideas';
  title: string;
  icon: IconName;
  description: string;
  roles: string[];
}

const GARAGE_OPTIONS: GarageOption[] = [
  { id: 'build', title: 'Create an app', icon: 'FiTool', description: 'Move from a refined brief to implementation, review, and documentation.', roles: ['Prompt refiner', 'Backend developer', 'Frontend designer', 'Code reviewer', 'Documentation specialist'] },
  { id: 'research', title: 'Research a question', icon: 'FiSearch', description: 'Collect, analyse, verify, and present a useful answer as a small team.', roles: ['Research coordinator', 'Data collector', 'Research analyst', 'Fact checker', 'Report writer'] },
  { id: 'math', title: 'Solve a problem', icon: 'FiHash', description: 'Structure the problem, calculate, check the work, and explain the result.', roles: ['Problem interpreter', 'Solution strategist', 'Calculator', 'Verification specialist', 'Explainer'] },
  { id: 'ideas', title: 'Develop an idea', icon: 'FiEdit3', description: 'Generate options, check viability, and turn the strongest direction into next steps.', roles: ['Idea coordinator', 'Creative generator', 'Feasibility analyst', 'Idea refiner', 'Implementation planner'] },
];

const GaragePage: React.FC<GaragePageProps> = ({ connectedServices }) => {
  const { connections } = useApp();
  const [selectedOption, setSelectedOption] = useState<GarageOption | null>(null);

  if (selectedOption) {
    return <GarageWorkflow selectedOption={selectedOption} connectedServices={connectedServices} onBack={() => setSelectedOption(null)} />;
  }

  if (connectedServices.length < 2) {
    return (
      <section className="garage-page garage-empty" aria-labelledby="garage-empty-title">
        <Icon name="FiAlertCircle" size={28} aria-hidden="true" />
        <h1 id="garage-empty-title">Add one more provider</h1>
        <p>Garage works by assigning different roles to at least two connected providers.</p>
      </section>
    );
  }

  return (
    <section className="garage-page" aria-labelledby="garage-title">
      <header className="garage-header">
        <h1 id="garage-title">Garage</h1>
        <p>Compose a specialised AI team for work that benefits from more than one point of view.</p>
      </header>

      <div className="ai-team-bar" aria-label="Connected AI team">
        <span>Your team</span>
        <div className="ai-team-pills">
          {connectedServices.map(service => (
            <span key={service.id} className="ai-team-pill">
              <Icon name={service.icon as IconName} aria-hidden="true" />
              {getServiceDisplayName(service, connections[service.id])}
            </span>
          ))}
        </div>
      </div>

      <div className="garage-options-grid">
        {GARAGE_OPTIONS.map(option => (
          <button type="button" key={option.id} className="garage-option-card" onClick={() => setSelectedOption(option)}>
            <Icon name={option.icon} size={20} aria-hidden="true" />
            <h2>{option.title}</h2>
            <p>{option.description}</p>
            <span className="option-roles">{option.roles.join(' · ')}</span>
            <span className="garage-option-action">Choose workflow <Icon name="FiArrowRight" aria-hidden="true" /></span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default GaragePage;
