// The scripted demo: assistant and user text is written here; tool calls are executed for real by record.mjs.
import { DEMO } from './common.mjs';

const REQUIREMENTS = [
  ['Full braking force on emergency input', 'The brake controller shall apply full braking force within 150 ms of a pedal-to-floor input.', 'D'],
  ['No wheel lock-up on low-friction surfaces', 'The ABS shall prevent wheel lock-up on surfaces with a friction coefficient down to 0.1.', 'C'],
  ['Hydraulic pressure loss warning', 'The system shall detect a loss of hydraulic pressure and warn the driver within 500 ms.', 'D'],
];

/** Request body for postWorkItems with the given custom field name for the ASIL level. */
export function requirementsBody(customField) {
  return {
    data: REQUIREMENTS.map(([title, text, asil]) => ({
      type: 'workitems',
      attributes: { type: DEMO.workItemType, title, description: { type: 'text/html', value: `<p>${text}</p>` }, [customField]: asil },
      relationships: { module: { data: { type: 'documents', id: `${DEMO.project}/${DEMO.space}/${DEMO.document}` } } },
    })),
  };
}

/**
 * Storyboard (about 75 s). `holdSec` is how long the replay shows each step. A `tool` step is
 * executed against the real server; its `args` and the response are recorded, never invented.
 */
export function buildSteps(project = DEMO.project) {
  return [
    { kind: 'user', holdSec: 8, text: 'Draft three requirements for the brake-system LiveDoc from these notes.' },
    {
      kind: 'assistant', holdSec: 3,
      text: 'I will check the request first with dry_run, so nothing is written yet.',
    },
    {
      kind: 'tool', holdSec: 14, label: 'dry_run', tool: 'postWorkItems',
      args: { projectId: project, dry_run: true, requestBody: requirementsBody(DEMO.wrongCustomField) },
    },
    { kind: 'user', holdSec: 5, text: 'Fix the field name and go ahead.' },
    {
      kind: 'assistant', holdSec: 5,
      text: `The preview flagged "${DEMO.wrongCustomField}" as an unknown field. The project calls it "${DEMO.customField}". Writing the three requirements now.`,
    },
    {
      kind: 'tool', holdSec: 20, label: 'write', tool: 'postWorkItems',
      args: { projectId: project, requestBody: requirementsBody(DEMO.customField) },
    },
  ];
}

/** Seconds of the Polarion before/after scene and the end card appended after the recorded steps. */
export const LIVEDOC_SEC = 15;
export const END_CARD_SEC = 5;
