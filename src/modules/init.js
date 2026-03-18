// Workflow Builder init
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof WorkflowBuilder !== 'undefined') { WorkflowBuilder.init('workflowBuilderRoot'); }
    if (typeof CapabilityRadar !== 'undefined') { CapabilityRadar.init('capabilityRadarRoot'); }
    if (typeof SetupChecklist !== 'undefined') { SetupChecklist.init('setupChecklistRoot'); }
  });
}
