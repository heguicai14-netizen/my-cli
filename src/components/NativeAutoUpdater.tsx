import * as React from 'react';
import type { AutoUpdaterResult } from '../utils/autoUpdater.js';
type Props = {
  isUpdating: boolean;
  onChangeIsUpdating: (isUpdating: boolean) => void;
  onAutoUpdaterResult: (autoUpdaterResult: AutoUpdaterResult) => void;
  autoUpdaterResult: AutoUpdaterResult | null;
  showSuccessMessage: boolean;
  verbose: boolean;
};
// mycli rebrand: upstream version of this component ran installLatest() every
// 30 minutes against the Anthropic GCS bucket, auto-downloaded new versions,
// and displayed "✓ Update installed · Restart to update" banners. We don't
// distribute through those channels — this file is kept as a no-op so REPL
// wiring (props, import path) stays stable.
export function NativeAutoUpdater(_props: Props): React.ReactNode {
  return null;
}
