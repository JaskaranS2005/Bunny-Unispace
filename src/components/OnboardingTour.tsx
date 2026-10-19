import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from './Icon';

interface TourStep {
  target: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '.logo',
    title: 'Welcome to Bunny',
    description: 'Bunny lets you send one prompt to several AI services and compare their answers in one workspace.',
  },
  {
    target: '.settings-button',
    title: 'Connect your AI team',
    description: 'Start in Settings. Add an API key and model for each provider you want to use.',
  },
  {
    target: '.ai-selection-bar',
    title: 'Choose who answers',
    description: 'Connected services are selected automatically. Tap a service to include or remove it from the next comparison.',
  },
  {
    target: '.prompt-board',
    title: 'Ask once, compare everywhere',
    description: 'Write your task here. Press Enter to send, or Shift + Enter for a new line. You can attach an image too.',
  },
  {
    target: '.garage-button',
    title: 'Build a multi-agent workflow',
    description: 'Garage assigns different roles to your connected models so they can refine, build, review, and explain a task together.',
  },
];

const OnboardingTour: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = useMemo(() => TOUR_STEPS[stepIndex], [stepIndex]);

  const finishTour = useCallback(() => {
    window.localStorage.setItem('bunny-onboarding-complete', 'true');
    setVisible(false);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem('bunny-onboarding-complete') === 'true') {
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const updateTarget = () => {
      const target = document.querySelector(step.target);
      setTargetRect(target ? target.getBoundingClientRect() : null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        finishTour();
      }
    };

    updateTarget();
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [finishTour, step, visible]);

  const goNext = () => {
    if (stepIndex === TOUR_STEPS.length - 1) {
      finishTour();
      return;
    }
    setStepIndex(current => current + 1);
  };

  if (!visible || !targetRect) return null;

  const cardWidth = Math.min(360, window.innerWidth - 32);
  const cardHeight = 230;
  const shouldOpenAbove = targetRect.bottom + cardHeight + 24 > window.innerHeight;
  const top = shouldOpenAbove
    ? Math.max(16, targetRect.top - cardHeight - 16)
    : Math.min(window.innerHeight - cardHeight - 16, targetRect.bottom + 16);
  const left = Math.min(
    Math.max(16, targetRect.left),
    Math.max(16, window.innerWidth - cardWidth - 16),
  );

  return (
    <div className="onboarding-tour" role="dialog" aria-modal="true" aria-labelledby="bunny-tour-title">
      <button type="button" className="onboarding-scrim" aria-label="Skip Bunny tour" onClick={finishTour} />
      <div
        className="onboarding-highlight"
        aria-hidden="true"
        style={{
          top: Math.max(8, targetRect.top - 8),
          left: Math.max(8, targetRect.left - 8),
          width: targetRect.width + 16,
          height: targetRect.height + 16,
        }}
      />
      <section className="onboarding-card" style={{ top, left, width: cardWidth }}>
        <div className="onboarding-card-header">
          <span>Getting started</span>
          <button type="button" className="onboarding-close" onClick={finishTour} aria-label="Close Bunny tour"><Icon name="FiX" aria-hidden="true" /></button>
        </div>
        <p className="onboarding-progress">Step {stepIndex + 1} of {TOUR_STEPS.length}</p>
        <h2 id="bunny-tour-title">{step.title}</h2>
        <p>{step.description}</p>
        <div className="onboarding-actions">
          <button type="button" className="onboarding-skip" onClick={finishTour}>Skip tour</button>
          <button type="button" className="onboarding-next" onClick={goNext}>
            {stepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default OnboardingTour;
