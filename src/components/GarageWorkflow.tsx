import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { aiServiceManager, AIResponse } from '../services/aiService';
import { toast } from 'react-hot-toast';
import ResponseRenderer from './ResponseRenderer';
import Icon, { IconName } from './Icon';

interface WorkflowStep {
  id: string;
  role: string;
  roleName: string;
  assignedAI?: string;
  prompt: string;
  response?: string;
  status: 'pending' | 'processing' | 'completed' | 'user_input';
}

interface GarageWorkflowProps {
  selectedOption: any;
  connectedServices: any[];
  onBack: () => void;
}

const ROLE_DEFINITIONS: Record<string, Record<string, { name: string; description: string }>> = {
  build: {
    A: { name: "Prompt Refiner", description: "Refines user requirements and creates detailed specifications" },
    B: { name: "Backend Developer", description: "Creates backend code, APIs, and database structure" },
    C: { name: "Frontend Designer", description: "Builds UI/UX and frontend components" },
    D: { name: "Code Reviewer", description: "Reviews, optimizes, and fixes code issues" },
    E: { name: "Documentation Specialist", description: "Creates documentation and explanations" }
  },
  research: {
    A: { name: "Research Coordinator", description: "Defines research scope and methodology" },
    B: { name: "Data Collector", description: "Gathers information from multiple sources" },
    C: { name: "Research Analyst", description: "Analyzes and synthesizes findings" },
    D: { name: "Fact Checker", description: "Verifies accuracy and credibility" },
    E: { name: "Report Writer", description: "Creates final comprehensive report" }
  },
  math: {
    A: { name: "Problem Interpreter", description: "Understands and structures mathematical problems" },
    B: { name: "Solution Strategist", description: "Develops solution approaches and methods" },
    C: { name: "Calculator", description: "Performs calculations and computations" },
    D: { name: "Verification Specialist", description: "Checks accuracy and alternative methods" },
    E: { name: "Explainer", description: "Provides clear step-by-step explanations" }
  },
  ideas: {
    A: { name: "Idea Coordinator", description: "Structures and clarifies creative concepts" },
    B: { name: "Creative Generator", description: "Brainstorms and expands ideas" },
    C: { name: "Feasibility Analyst", description: "Evaluates practicality and market potential" },
    D: { name: "Idea Refiner", description: "Polishes and improves concepts" },
    E: { name: "Implementation Planner", description: "Creates actionable next steps" }
  }
};

const GarageWorkflow: React.FC<GarageWorkflowProps> = ({ selectedOption, connectedServices, onBack }) => {
  const { connections } = useApp();
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [userPrompt, setUserPrompt] = useState('');
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [additionalInput, setAdditionalInput] = useState('');
  const [showAddMore, setShowAddMore] = useState(false);

  const roles = ROLE_DEFINITIONS[selectedOption.id as keyof typeof ROLE_DEFINITIONS] || {};

  useEffect(() => {
    const steps: WorkflowStep[] = Object.keys(roles).map(roleId => ({
      id: roleId,
      role: roleId,
      roleName: roles[roleId as keyof typeof roles].name,
      prompt: '',
      status: 'pending' as const
    }));
    setWorkflowSteps(steps);
  }, [selectedOption, roles]);

  const handleRoleAssignment = (roleId: string, aiId: string) => {
    setRoleAssignments(prev => ({ ...prev, [roleId]: aiId }));
  };

  const validateSetup = () => {
    const assignedRoles = Object.keys(roleAssignments).filter(role => roleAssignments[role]);
    return assignedRoles.length >= 2 && userPrompt.trim().length > 0;
  };

  const startWorkflow = async () => {
    if (!validateSetup()) {
      toast.error('Please assign at least 2 AIs and enter a task description!');
      return;
    }
    setWorkflowStarted(true);
    await processStep(0, userPrompt);
  };

  const processStep = async (stepIndex: number, inputPrompt: string) => {
    const step = workflowSteps[stepIndex];
    if (!step) return;

    const assignedAIId = roleAssignments[step.role];
    if (!assignedAIId) {
      toast.error(`No AI assigned to role ${step.role}`);
      return;
    }

    const connection = connections[assignedAIId];
    if (!connection?.apiKey) {
      toast.error(`API key not found for ${assignedAIId}`);
      return;
    }

    setWorkflowSteps(prev => prev.map((s, i) => i === stepIndex ? { ...s, status: 'processing', prompt: inputPrompt } : s));
    setCurrentStep(stepIndex);

    try {
      const rolePrompt = createRolePrompt(step, inputPrompt, stepIndex);
      const response: AIResponse = await aiServiceManager.callAIService(assignedAIId, rolePrompt, connection.apiKey, connection.model);
      
      const newStatus = stepIndex === 0 ? 'user_input' : 'completed';
      setWorkflowSteps(prev => prev.map((s, i) => i === stepIndex ? { ...s, status: newStatus, response: response.content } : s));
      
      if (newStatus === 'user_input') {
        setShowAddMore(true);
      } else if (stepIndex < workflowSteps.length - 1) {
        setTimeout(() => {
          const nextPrompt = createNextStepPrompt(step, response.content, stepIndex + 1);
          processStep(stepIndex + 1, nextPrompt);
        }, 1000);
      } else {
        toast.success('Workflow completed successfully!');
      }

    } catch (error: any) {
      toast.error(`Error in ${step.roleName}: ${error.message}`);
      setWorkflowSteps(prev => prev.map((s, i) => i === stepIndex ? { ...s, status: 'pending' } : s));
    }
  };

  const createRolePrompt = (step: WorkflowStep, inputPrompt: string, stepIndex: number): string => {
    const roleContext = roles[step.role as keyof typeof roles];
    if (stepIndex === 0) {
      return `You are a ${roleContext.name}. Your role: ${roleContext.description}. The overall goal is to ${selectedOption.title}. User Request: "${inputPrompt}". Please refine and structure this request into clear objectives for the team.`;
    }
    return inputPrompt;
  };
  
  const createNextStepPrompt = (currentStep: WorkflowStep, currentResponse: string, nextStepIndex: number): string => {
    const nextStep = workflowSteps[nextStepIndex];
    const nextRole = roles[nextStep.role as keyof typeof roles];
    return `You are a ${nextRole.name}. Your role: ${nextRole.description}. The previous step was completed by ${currentStep.roleName}, who provided the following: "${currentResponse}". Based on this, please perform your task.`;
  };

  const handleAddMore = async () => {
    if (!additionalInput.trim()) {
      toast.error('Please enter additional requirements!');
      return;
    }
    const currentPromptForStep0 = workflowSteps.find(s => s.id === 'A')?.prompt || userPrompt;
    const combinedPrompt = `${currentPromptForStep0}\n\nAdditional requirements: ${additionalInput}`;
    setAdditionalInput('');
    setShowAddMore(false);
    await processStep(0, combinedPrompt);
  };

  const handlePassToNext = () => {
    const currentStepData = workflowSteps[currentStep];
    if (currentStepData.response) {
      setShowAddMore(false);
      const nextPrompt = createNextStepPrompt(currentStepData, currentStepData.response, currentStep + 1);
      processStep(currentStep + 1, nextPrompt);
    }
  };

  const resetWorkflow = () => {
    setWorkflowStarted(false);
    setCurrentStep(0);
    setUserPrompt('');
    setAdditionalInput('');
    setShowAddMore(false);
    setRoleAssignments({});
    const steps: WorkflowStep[] = Object.keys(roles).map(roleId => ({
      id: roleId,
      role: roleId,
      roleName: roles[roleId as keyof typeof roles].name,
      prompt: '',
      status: 'pending' as const
    }));
    setWorkflowSteps(steps);
  };
  
  if (!workflowStarted) {
    return (
      <div className="garage-workflow-setup">
        <div className="workflow-header">
            <button className="back-button" onClick={onBack}>← Back to Options</button>
            <div className="workflow-header-center">
                <h2>{selectedOption.icon} {selectedOption.title}</h2>
                <p>{selectedOption.description}</p>
            </div>
        </div>
        <div className="role-assignment-section">
          <h3>Assign AI Services to Roles</h3>
          <div className="roles-grid">
            {Object.entries(roles).map(([roleId, roleInfo]) => (
              <div key={roleId} className="role-assignment-card">
                <div className="role-header">
                  <h4><span className="role-id">Role {roleId}</span> {roleInfo.name}</h4>
                </div>
                <p className="role-description">{roleInfo.description}</p>
                <div className="ai-assignment-area">
                  {roleAssignments[roleId] ? (
                    <div className="assigned-ai-card" onClick={() => handleRoleAssignment(roleId, '')}>
                      <Icon name={connectedServices.find(s => s.id === roleAssignments[roleId])?.icon as IconName} />
                      <span>{connectedServices.find(s => s.id === roleAssignments[roleId])?.name}</span>
                      <button className="unassign-button" onClick={(e) => { e.stopPropagation(); handleRoleAssignment(roleId, ''); }}>✕</button>
                    </div>
                  ) : (
                    <div className="ai-pool">
                      {connectedServices.map(service => (
                          <button key={service.id} className="ai-chip" onClick={() => handleRoleAssignment(roleId, service.id)}>
                            <Icon name={service.icon as IconName} /> {service.name}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="prompt-board workflow-prompt-board">
          <div className="prompt-container">
            <div className="prompt-input-wrapper">
              <textarea
                className="prompt-input"
                placeholder={`Describe the task for the ${selectedOption.title} workflow...`}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={3}
              />
              <button 
                className="submit-button" 
                onClick={startWorkflow} 
                disabled={!validateSetup()}
                title="Start Collaborative Workflow"
              >
                <Icon name="FiPlay"/>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="garage-workflow-active">
      <div className="workflow-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h2>{selectedOption.icon} {selectedOption.title}</h2>
        <button className="reset-button" onClick={resetWorkflow}>🔄 Reset</button>
      </div>
      <div className="workflow-stepper">
        {workflowSteps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={`step-node ${step.status}`}>
              <div className="step-status-icon">
                {step.status === 'completed' && '✅'}
                {step.status === 'processing' && '⏳'}
                {step.status === 'pending' && '...'}
              </div>
              <div className="step-info">
                <span className="step-role-id">Role {step.role}</span>
                <span className="step-role-name">{step.roleName}</span>
              </div>
            </div>
            {index < workflowSteps.length - 1 && <div className="step-connector"></div>}
          </React.Fragment>
        ))}
      </div>
      <div className="workflow-results-container">
        {workflowSteps.filter(step => step.status !== 'pending' && step.response).map(step => {
          const service = connectedServices.find(s => s.id === roleAssignments[step.role]);
          return (
            <div key={step.id} className="workflow-result-item">
                <div className="response-header">
                    <div className="response-service" style={{ color: service?.color }}>
                        <Icon name={service?.icon as IconName} />
                        <span>{service?.name}</span>
                    </div>
                </div>
                <div className="response-content">
                  {step.status === 'processing' && (<div className="response-loading"><div className="loading-spinner"></div><p>Generating response...</p></div>)}
                  {step.response && (
                      <div className="response-body">
                           <div className="response-text">
                              <ResponseRenderer content={step.response || ''} serviceName={step.roleName} serviceIcon={''} />
                           </div>
                      </div>
                  )}
                </div>
                {step.status === 'user_input' && showAddMore && (
                  <div className="user-interaction-footer">
                    <div className="add-more-section">
                      <textarea placeholder="Add more requirements or clarifications..." value={additionalInput} onChange={(e) => setAdditionalInput(e.target.value)} rows={2} />
                      <button onClick={handleAddMore} disabled={!additionalInput.trim()}>Refine & Rerun</button>
                    </div>
                    <div className="or-divider">OR</div>
                    <button className="pass-to-next-button" onClick={handlePassToNext}>Looks good, pass to next role →</button>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GarageWorkflow;