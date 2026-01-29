/**
 * Onboarding Tour Controller
 */

import { logger } from '../core/logger.js';

let currentStep = 1;
const totalSteps = 4; // Changed from 5 to 4

/**
 * Initialize onboarding tour
 */
function initializeOnboarding(): void {
    // Set up event listeners
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const finishButton = document.getElementById('finishButton');
    const skipButton = document.getElementById('skipButton');
    const demoButton = document.getElementById('demoButton');

    if (prevButton) {
        prevButton.addEventListener('click', () => navigateStep(-1));
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => navigateStep(1));
    }

    if (finishButton) {
        finishButton.addEventListener('click', () => openExtensionPopup());
    }

    if (skipButton) {
        skipButton.addEventListener('click', () => completeOnboarding());
    }

    if (demoButton) {
        demoButton.addEventListener('click', () => runDemo());
    }

    // Add keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);

    // Show first step
    showStep(1);
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNavigation(event: KeyboardEvent): void {
    switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
            event.preventDefault();
            if (currentStep < totalSteps) {
                navigateStep(1);
            }
            break;
        case 'ArrowLeft':
        case 'ArrowUp':
            event.preventDefault();
            if (currentStep > 1) {
                navigateStep(-1);
            }
            break;
        case 'Escape':
            event.preventDefault();
            completeOnboarding();
            break;
        case 'Enter':
            event.preventDefault();
            if (currentStep < totalSteps) {
                navigateStep(1);
            } else {
                completeOnboarding();
            }
            break;
    }
}

/**
 * Navigate to a different step
 */
function navigateStep(direction: number): void {
    const newStep = currentStep + direction;

    if (newStep >= 1 && newStep <= totalSteps) {
        showStep(newStep);
    }
}

/**
 * Show a specific step
 */
function showStep(stepNumber: number): void {
    // Hide all steps
    const allSteps = document.querySelectorAll('.tour-step');
    allSteps.forEach((step) => {
        step.classList.remove('active');
    });

    // Show current step
    const currentStepEl = document.getElementById(`step${stepNumber}`);
    if (currentStepEl) {
        currentStepEl.classList.add('active');
    }

    // Update progress bar
    updateProgressBar(stepNumber);

    // Update progress text
    updateProgressText(stepNumber);

    // Update navigation buttons
    updateNavigationButtons(stepNumber);

    currentStep = stepNumber;
}

/**
 * Update progress bar
 */
function updateProgressBar(stepNumber: number): void {
    const progressSteps = document.querySelectorAll('.progress-step');

    progressSteps.forEach((step, index) => {
        const stepNum = index + 1;

        if (stepNum < stepNumber) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

/**
 * Update progress text
 */
function updateProgressText(stepNumber: number): void {
    const progressText = document.getElementById('progressText');
    if (progressText) {
        const percentage = Math.round((stepNumber / totalSteps) * 100);
        progressText.textContent = `Step ${stepNumber} of ${totalSteps} (${percentage}%)`;
    }
}

/**
 * Update navigation button states
 */
function updateNavigationButtons(stepNumber: number): void {
    const prevButton = document.getElementById('prevButton') as HTMLButtonElement;
    const nextButton = document.getElementById('nextButton') as HTMLButtonElement;
    const finishButton = document.getElementById('finishButton') as HTMLButtonElement;
    const skipButton = document.getElementById('skipButton') as HTMLButtonElement;

    if (prevButton) {
        prevButton.disabled = stepNumber === 1;
    }

    if (nextButton && finishButton) {
        if (stepNumber === totalSteps) {
            nextButton.style.display = 'none';
            finishButton.style.display = 'block';
        } else {
            nextButton.style.display = 'block';
            finishButton.style.display = 'none';
        }
    }

    // Hide Skip Tour button on last step (but keep space)
    if (skipButton) {
        if (stepNumber === totalSteps) {
            skipButton.style.visibility = 'hidden';
        } else {
            skipButton.style.visibility = 'visible';
        }
    }
}

/**
 * Run a quick demo
 */
async function runDemo(): Promise<void> {
    const demoButton = document.getElementById('demoButton') as HTMLButtonElement;
    if (!demoButton) return;

    try {
        demoButton.disabled = true;
        demoButton.innerHTML = '<span>⏳</span> Creating demo...';

        await logger.info('Onboarding', 'Demo button clicked');

        // Create a demo window with 3 tabs
        const demoWindow = await chrome.windows.create({
            url: [
                'https://www.google.com',
                'https://www.wikipedia.org',
                'https://www.github.com'
            ],
            focused: true,
            type: 'normal'
        });

        if (!demoWindow.id) {
            throw new Error('Failed to create demo window');
        }

        demoButton.innerHTML = '<span>▶️</span> Demo running...';

        // Wait a moment for tabs to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get all tabs in the demo window
        const tabs = await chrome.tabs.query({ windowId: demoWindow.id });

        if (tabs.length < 2) {
            throw new Error('Not enough tabs for demo');
        }

        // Switch between tabs 3 times (every 1.5 seconds)
        for (let i = 0; i < 3; i++) {
            const tabIndex = i % tabs.length;
            const tab = tabs[tabIndex];

            if (tab && tab.id) {
                await chrome.tabs.update(tab.id, { active: true });
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        // Show completion message
        demoButton.innerHTML = '<span>✅</span> Demo complete!';

        // Close demo window after 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        await chrome.windows.remove(demoWindow.id);

        // Reset button
        await new Promise(resolve => setTimeout(resolve, 500));
        demoButton.innerHTML = '<span>▶️</span> Try a Quick Demo';
        demoButton.disabled = false;

    } catch (error) {
        await logger.error('Onboarding', 'Error running demo', {
            error: error instanceof Error ? error.message : String(error)
        });
        demoButton.innerHTML = '<span>❌</span> Demo failed';
        await new Promise(resolve => setTimeout(resolve, 2000));
        demoButton.innerHTML = '<span>▶️</span> Try a Quick Demo';
        demoButton.disabled = false;
    }
}

/**
 * Open extension popup (simulated)
 */
async function openExtensionPopup(): Promise<void> {
    try {
        await logger.info('Onboarding', 'Open popup button clicked');
        // Note: Can't programmatically open popup, so we complete onboarding
        // User will need to click the extension icon manually
        await completeOnboarding();
    } catch (error) {
        await logger.error('Onboarding', 'Error opening popup', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}



/**
 * Complete onboarding and save flag
 */
async function completeOnboarding(): Promise<void> {
    try {
        // Save flag to storage
        await chrome.storage.local.set({ hasSeenOnboarding: true });

        await logger.info('Onboarding', 'Onboarding completed', {
            stepsCompleted: currentStep,
            totalSteps
        });

        // Close onboarding tab
        const tab = await chrome.tabs.getCurrent();
        if (tab && tab.id) {
            await chrome.tabs.remove(tab.id);
        }
    } catch (error) {
        await logger.error('Onboarding', 'Error completing onboarding', {
            error: error instanceof Error ? error.message : String(error)
        });
        // Fallback: just close the tab
        window.close();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOnboarding);
} else {
    initializeOnboarding();
}
