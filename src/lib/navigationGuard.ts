export const LEAVE_IMPORT_FLOW_EVENT = "control-gastos:leave-import-flow";

export interface LeaveImportFlowDetail {
  onContinue?: () => void;
}

export function requestImportFlowLeave(onContinue?: () => void) {
  return window.dispatchEvent(
    new CustomEvent<LeaveImportFlowDetail>(LEAVE_IMPORT_FLOW_EVENT, {
      cancelable: true,
      detail: { onContinue },
    }),
  );
}
