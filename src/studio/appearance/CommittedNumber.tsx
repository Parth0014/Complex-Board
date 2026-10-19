import type { StudioAdapter } from '../../vision/contracts';
import { NumberField } from '../ui/NumberField';
export function CommittedNumber({
  adapter,
  label,
  ...props
}: {
  adapter: Pick<StudioAdapter, 'beginGesture' | 'endGesture' | 'cancelGesture'>;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onCommit(value: number): void;
}) {
  return (
    <label className="gs-committed-number">
      <span>{label}</span>
      <NumberField
        {...props}
        label={label}
        data-appearance-draft
        onBegin={() => adapter.beginGesture()}
        onEnd={() => adapter.endGesture()}
        onCancel={() => adapter.cancelGesture()}
      />
    </label>
  );
}
