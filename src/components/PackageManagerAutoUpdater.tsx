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
// mycli rebrand: upstream version of this component polled an Anthropic GCS
// bucket every 30 minutes to show "Update available! Run brew upgrade
// claude-code" banners. We don't distribute through those channels, so the
// poll + banner are gone. The export is kept for REPL wiring stability.
export function PackageManagerAutoUpdater(_props: Props): React.ReactNode {
  return null;
}
