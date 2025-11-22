/**
 * Onboarding Tour Controller
 */

let currentStep = 1;
const totalSteps = 5;

/**
 * Initialize onboarding tour
 */
function initializeOnboarding(): void {
    // Set up event listeners
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const finishButton = document.getElementById('finishButton');
    const skipButton = document.getElementById('skipButton');

    if (prevButton) {
        prevButton.addEventListener('click', () => navigateStep(-1));
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => navigateStep(1));
    }

    if (finishButton) {
        finishButton.addEventListener('click', () => completeOnboarding());
    }

    if (skipButton) {
        skipButton.addEventListener('click', () => completeOnboarding());
    }

    // Show first step
    showStep(1);
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
 * Update navigation button states
 */
function updateNavigationButtons(stepNumber: number): void {
    const prevButton = document.getElementById('prevButton') as HTMLButtonElement;
    const nextButton = document.getElementById('nextButton') as HTMLButtonElement;
    const finishButton = document.getElementById('finishButton') as HTMLButtonElement;

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
}

/**
 * Complete onboarding and save flag
 */
async function completeOnboarding(): Promise<void> {
    try {
        // Save flag to storage
        await chrome.storage.local.set({ hasSeenOnboarding: true });

        // Close onboarding tab
        const tab = await chrome.tabs.getCurrent();
        if (tab && tab.id) {
            await chrome.tabs.remove(tab.id);
        }
    } catch (error) {
        console.error('Error completing onboarding:', error);
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
