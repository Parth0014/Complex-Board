# Claude canvas review implementation

Reviewed both supplied Claude replies against the current desktop canvas code. The review is guidance, rather than proof that every reported issue exists. This pass implements the first correctness phase; the full redesign plan is not complete.

## Applied

- Share and locked Formatting remain focusable with `aria-disabled`, expose their explanation, and block activation.
- Tooltips avoid repeating an identical accessible label.
- Color validation uses React-generated IDs instead of labels containing spaces.
- The inspector has one complementary landmark; its inner content is a group.
- Canvas snapping controls and the hybrid formatting bar have explicit group/toolbar semantics.
- Formatting and opacity controls no longer advertise the wrong popup role.
- Keyboard and menu Select all share the same visible-object filter, including visible locked objects.
- Dialog, toast, and library-panel exits read the CSS duration token and respect reduced motion. Exit timers are cleaned up; dialog/toast timers use their owning window.
- Studio error messages use readable messages and fallbacks. The canvas save-status path also avoids serializing unknown objects.
- Error notifications remain until dismissed.

## Findings already satisfied

- The opacity value already uses `<output>`.
- Dialog props already accept `aria-labelledby` through native component props; individual dialog naming can be refined in the later accessibility pass.

## Validation

- Lint and production build passed (the existing large-chunk warning remains).
- 137 unit tests passed.
- Initial selected browser run: 33 passed, 2 failed. One new test read selection from the wrong object and was corrected. The other failure occurred while replacing the production build; the dialog focus test passed on rerun after the build completed.
- Focused follow-up: Share, selection, color-error IDs, and dialog focus all passed. The final four-test correctness run also passed, including error persistence beyond 10 seconds and dismissal.
- This does not claim the entire browser suite is green. The earlier full-suite baseline still needs triage.

## Remaining

Shared notification infrastructure, anchored-position/menu/number-field primitives, keyboard color-plane interaction, interaction preferences, inspector architecture decisions, component CSS separation, dependency cleanup, and remaining browser-suite triage. Desktop canvas remains the implementation focus.
