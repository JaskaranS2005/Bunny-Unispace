import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AIService, aiServiceManager, AIResponse } from '../services/aiService';
import { toast } from 'react-hot-toast';
import ResponseRenderer from './ResponseRenderer';
import Icon, { IconName } from './Icon';
import AgentThinking from './AgentThinking';

interface WorkflowStep {
  id: string;
  role: string;
  roleName: string;
  prompt: string;
  response?: string;
  status: 'pending' | 'processing' | 'completed' | 'user_input';
}

interface WorkflowOption {
  id: 'build' | 'research' | 'math' | 'ideas';
  title: string;
  icon: IconName;
  description: string;
}

interface GarageWorkflowProps {
  selectedOption: WorkflowOption;
  connectedServices: AIService[];
  onBack: () => void;
}

const buildWorkflowSteps = (roles: Record<string, { name: string; description: string }>): WorkflowStep[] =>
  Object.entries(roles).map(([role, definition]) => ({
    id: role,
    role,
    roleName: definition.name,
    prompt: '',
    status: 'pending',
  }));

const ROLE_DEFINITIONS: Record<WorkflowOption['id'], Record<string, { name: string; description: string }>> = {
  build: {
    A: { name: 'Prompt refiner', description: 'Turns the request into clear constraints and specifications.' },
    B: { name: 'Backend developer', description: 'Designs APIs, data structures, and server-side implementation.' },
    C: { name: 'Frontend designer', description: 'Builds the user interface and interaction approach.' },
    D: { name: 'Code reviewer', description: 'Checks the work for risk, quality, and opportunities to improve it.' },
    E: { name: 'Documentation specialist', description: 'Produces clear implementation notes and handoff guidance.' },
  },
  research: {
    A: { name: 'Research coordinator', description: 'Defines the question, scope, and method.' },
    B: { name: 'Data collector', description: 'Gathers relevant evidence and source material.' },
    C: { name: 'Research analyst', description: 'Synthesises findings and identifies the important themes.' },
    D: { name: 'Fact checker', description: 'Checks accuracy, currency, and source credibility.' },
    E: { name: 'Report writer', description: 'Produces the final concise report.' },
  },
  math: {
    A: { name: 'Problem interpreter', description: 'Structures the mathematical question and known values.' },
    B: { name: 'Solution strategist', description: 'Chooses an appropriate solution method.' },
    C: { name: 'Calculator', description: 'Performs the calculation carefully.' },
    D: { name: 'Verification specialist', description: 'Checks the result with alternative reasoning.' },
    E: { name: 'Explainer', description: 'Presents a clear step-by-step explanation.' },
  },
  ideas: {
    A: { name: 'Idea coordinator', description: 'Clarifies the creative problem and constraints.' },
    B: { name: 'Creative generator', description: 'Develops a range of useful directions.' },
    C: { name: 'Feasibility analyst', description: 'Tests practicality and likely impact.' },
    D: { name: 'Idea refiner', description: 'Strengthens the most promising direction.' },
    E: { name: 'Implementation planner', description: 'Turns the idea into next actions.' },
  },
};

const GarageWorkflow: React.FC<GarageWorkflowProps> = ({ selectedOption, connectedServices, onBack }) => {
  const { connections } = useApp();
  const roles = ROLE_DEFINITIONS[selectedOption.id];
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [userPrompt, setUserPrompt] = useState('');
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [additionalInput, setAdditionalInput] = useState('');
  const [showAddMore, setShowAddMore] = useState(false);

  useEffect(() => {
    setWorkflowSteps(buildWorkflowSteps(roles));
  }, [roles]);

  const handleRoleAssignment = (roleId: string, aiId: string) => {
    setRoleAssignments(previous => ({ ...previous, [roleId]: aiId }));
  };

  const validateSetup = () => Object.values(roleAssignments).filter(Boolean).length >= 2 && userPrompt.trim().length > 0;

  const createRolePrompt = (step: WorkflowStep, inputPrompt: string, stepIndex: number): string => {
    const role = roles[step.role];
    if (stepIndex === 0) {
      return 'You are a ' + role.name + '. Your role is to ' + role.description + ' The overall goal is ' + selectedOption.title + '. User request: "' + inputPrompt + '". Refine and structure this request into clear objectives for the team.';
    }
    return inputPrompt;
  };

  const createNextStepPrompt = (completedStep: WorkflowStep, completedResponse: string, nextStepIndex: number): string => {
    const nextStep = workflowSteps[nextStepIndex];
    const nextRole = roles[nextStep.role];
    return 'You are a ' + nextRole.name + '. Your role is to ' + nextRole.description + ' The previous step was completed by ' + completedStep.roleName + ', with this result: "' + completedResponse + '". Continue the work with the specific output your role needs to provide.';
  };

  const processStep = async (stepIndex: number, inputPrompt: string) => {
    const step = workflowSteps[stepIndex];
    if (!step) return;

    const assignedServiceId = roleAssignments[step.role];
    const connection = connections[assignedServiceId];
    if (!assignedServiceId || !connection?.apiKey) {
      toast.error('The session key for ' + step.roleName + ' is unavailable. Add it again in Settings.');
      return;
    }

    setWorkflowSteps(previous => previous.map((item, index) => index === stepIndex
      ? { ...item, status: 'processing', prompt: inputPrompt }
      : item,
    ));
    setCurrentStep(stepIndex);

    try {
      const response: AIResponse = await aiServiceManager.callAIService(
        assignedServiceId,
        createRolePrompt(step, inputPrompt, stepIndex),
        connection.apiKey,
        connection.model,
      );
      const nextStatus = stepIndex === 0 ? 'user_input' : 'completed';
      setWorkflowSteps(previous => previous.map((item, index) => index === stepIndex
        ? { ...item, status: nextStatus, response: response.content }
        : item,
      ));

      if (nextStatus === 'user_input') {
        setShowAddMore(true);
      } else if (stepIndex < workflowSteps.length - 1) {
        window.setTimeout(() => {
          const nextPrompt = createNextStepPrompt(step, response.content, stepIndex + 1);
          processStep(stepIndex + 1, nextPrompt);
        }, 600);
      } else {
        toast.success('Workflow complete.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Request failed.';
      toast.error(step.roleName + ': ' + message);
      setWorkflowSteps(previous => previous.map((item, index) => index === stepIndex
        ? { ...item, status: 'pending' }
        : item,
      ));
    }
  };

  const startWorkflow = async () => {
    if (!validateSetup()) {
      toast.error('Assign at least two providers and describe the work first.');
      return;
    }
    setWorkflowStarted(true);
    await processStep(0, userPrompt);
  };

  const handleAddMore = async () => {
    if (!additionalInput.trim()) {
      toast.error('Add the requirements you want the team to consider.');
      return;
    }
    const firstPrompt = workflowSteps.find(step => step.id === 'A')?.prompt || userPrompt;
    setAdditionalInput('');
    setShowAddMore(false);
    await processStep(0, firstPrompt + '\n\nAdditional requirements: ' + additionalInput);
  };

  const handlePassToNext = () => {
    const activeStep = workflowSteps[currentStep];
    if (!activeStep?.response || currentStep >= workflowSteps.length - 1) return;
    setShowAddMore(false);
    processStep(currentStep + 1, createNextStepPrompt(activeStep, activeStep.response, currentStep + 1));
  };

  const resetWorkflow = () => {
    setWorkflowStarted(false);
    setCurrentStep(0);
    setUserPrompt('');
    setAdditionalInput('');
    setShowAddMore(false);
    setRoleAssignments({});
    setWorkflowSteps(buildWorkflowSteps(roles));
  };

  if (!workflowStarted) {
    return (
      <section className="garage-workflow-setup" aria-labelledby="workflow-title">
        <header className="workflow-header">
          <button type="button" className="back-button" onClick={onBack}><Icon name="FiArrowLeft" aria-hidden="true" /> Back to workflows</button>
          <div className="workflow-header-center">
            <h1 id="workflow-title"><Icon name={selectedOption.icon} aria-hidden="true" /> {selectedOption.title}</h1>
            <p>{selectedOption.description}</p>
          </div>
        </header>

        <div className="role-assignment-section">
          <h2>Assign the team</h2>
          <div className="roles-grid">
            {Object.entries(roles).map(([roleId, roleInfo]) => {
              const assignedService = connectedServices.find(service => service.id === roleAssignments[roleId]);
              return (
                <article key={roleId} className="role-assignment-card">
                  <div className="role-header">
                    <span className="role-id">Role {roleId}</span>
                    <h3>{roleInfo.name}</h3>
                  </div>
                  <p className="role-description">{roleInfo.description}</p>
                  <div className="ai-assignment-area">
                    {assignedService ? (
                      <div className="assigned-ai-card">
                        <Icon name={assignedService.icon as IconName} aria-hidden="true" />
                        <span>{assignedService.name}</span>
                        <button type="button" className="unassign-button" onClick={() => handleRoleAssignment(roleId, '')} aria-label={'Remove ' + assignedService.name + ' from ' + roleInfo.name}>
                          <Icon name="FiX" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <div className="ai-pool">
                        {connectedServices.map(service => (
                          <button type="button" key={service.id} className="ai-chip" onClick={() => handleRoleAssignment(roleId, service.id)}>
                            <Icon name={service.icon as IconName} aria-hidden="true" /> {service.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="prompt-board workflow-prompt-board">
          <div className="prompt-container">
            <div className="prompt-input-wrapper">
              <textarea
                className="prompt-input"
                placeholder={'Describe the task for the ' + selectedOption.title + ' workflow...'}
                value={userPrompt}
                onChange={event => setUserPrompt(event.target.value)}
                rows={3}
              />
              <button type="button" className="submit-button" onClick={startWorkflow} disabled={!validateSetup()} aria-label="Start workflow">
                <Icon name="FiPlay" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="garage-workflow-active" aria-label={selectedOption.title + ' workflow'}>
      <header className="workflow-header">
        <button type="button" className="back-button" onClick={onBack}><Icon name="FiArrowLeft" aria-hidden="true" /> Back</button>
        <h1><Icon name={selectedOption.icon} aria-hidden="true" /> {selectedOption.title}</h1>
        <button type="button" className="reset-button" onClick={resetWorkflow}><Icon name="FiRotateCcw" aria-hidden="true" /> Reset</button>
      </header>

      <div className="workflow-stepper" aria-label="Workflow progress">
        {workflowSteps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={'step-node ' + step.status}>
              <span className="step-status-icon" aria-hidden="true"><span className="step-status-dot" /></span>
              <span className="step-info">
                <span className="step-role-id">Role {step.role}</span>
                <span className="step-role-name">{step.roleName}</span>
                <span className="step-status-label">
                  {step.status === 'processing' ? 'Thinking' : step.status === 'completed' ? 'Complete' : step.status === 'user_input' ? 'Needs your input' : 'Waiting'}
                </span>
              </span>
            </div>
            {index < workflowSteps.length - 1 && <span className="step-connector" aria-hidden="true" />}
          </React.Fragment>
        ))}
      </div>

      <div className="workflow-results-container">
        {workflowSteps.filter(step => step.status !== 'pending').map(step => {
          const service = connectedServices.find(item => item.id === roleAssignments[step.role]);
          return (
            <article key={step.id} className="workflow-result-item">
              <div className="response-header">
                <div className="response-service">
                  {service && <Icon name={service.icon as IconName} aria-hidden="true" />}
                  <span>{service?.name || step.roleName}</span>
                </div>
              </div>
              <div className="response-content">
                {step.status === 'processing' && (
                  <div className="response-loading">
                    <AgentThinking serviceName={service?.name || step.roleName} compact />
                    <div className="response-skeleton" aria-hidden="true">
                      <span className="response-skeleton-line"></span>
                      <span className="response-skeleton-line"></span>
                      <span className="response-skeleton-line"></span>
                    </div>
                  </div>
                )}
                {step.response && <div className="response-text"><ResponseRenderer content={step.response} serviceName={step.roleName} serviceIcon="" /></div>}
              </div>
              {step.status === 'user_input' && showAddMore && (
                <footer className="user-interaction-footer">
                  <div className="add-more-section">
                    <label htmlFor="workflow-requirements">Add requirements before the next role</label>
                    <textarea id="workflow-requirements" placeholder="Add more requirements or clarifications..." value={additionalInput} onChange={event => setAdditionalInput(event.target.value)} rows={2} />
                    <button type="button" onClick={handleAddMore} disabled={!additionalInput.trim()}>Refine and rerun</button>
                  </div>
                  <div className="or-divider">or</div>
                  <button type="button" className="pass-to-next-button" onClick={handlePassToNext}>Pass to the next role <Icon name="FiArrowRight" aria-hidden="true" /></button>
                </footer>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default GarageWorkflow;
