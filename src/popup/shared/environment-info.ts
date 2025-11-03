/**
 * Environment information display for hybrid popup
 */

import { isPacked } from '../../utils/environment';

/**
 * Show info message to user about environment
 *
 * @param minDelaySeconds - Minimum delay for current environment
 */
export function showEnvironmentInfo(minDelaySeconds: number): void {
  const infoEl = document.getElementById('environmentInfo');
  if (!infoEl) {
    const info = document.createElement('div');
    info.id = 'environmentInfo';
    info.className = 'alert alert-info mt-2';
    info.style.fontSize = '0.85em';

    const environment = isPacked() ? 'Production' : 'Development';

    info.innerHTML = `
      <strong>${environment} Mode</strong><br>
      Minimum delay: ${minDelaySeconds} seconds
      ${!isPacked() ? '<br><small>Production version allows 5-second minimum</small>' : ''}
    `;

    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
      formGroup.appendChild(info);
    }
  }
}
