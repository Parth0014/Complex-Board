/** Validation builds render/migrate in memory but never change persisted boards. */
export const appearancePersistenceEnabled = () =>
  import.meta.env.VITE_APPEARANCE_PERSISTENCE !== 'preview';
export const LEGACY_RECOVERY_PREFIX = 'appearance-recovery:v2:';
