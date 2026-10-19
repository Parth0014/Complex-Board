import { useId, useLayoutEffect, useRef, useState } from 'react';
import { editorFonts, canonicalFontId } from '../vision/fonts';
import { Button } from './ui/Button';
import { Popover } from './ui/Popover';
import { ChevronDownIcon, CheckIcon } from './icons';
/** A regular editor popover avoids browser picker events leaking to the canvas. */
export function FontPicker({
  value,
  disabled,
  onChange,
}: {
  value?: string;
  disabled?: boolean;
  onChange: (id: keyof typeof editorFonts) => void;
}) {
  const [open, setOpen] = useState(false),
    trigger = useRef<HTMLButtonElement>(null),
    id = useId();
  const search = useRef({ text: '', time: 0 });
  const current = canonicalFontId(value);
  useLayoutEffect(() => {
    if (open)
      trigger.current?.ownerDocument
        .getElementById(id)
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.focus();
  }, [open, id]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <>
      <Button
        ref={trigger}
        className="vs-actionbar__font vs-font-trigger"
        aria-label="Font family"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{editorFonts[current]}</span>
        <ChevronDownIcon size={16} />
      </Button>
      {open && (
        <Popover
          anchor={trigger}
          onDismiss={() => setOpen(false)}
          className="vs vs-font-picker"
          id={id}
          role="listbox"
          aria-label="Fonts"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.ctrlKey || e.metaKey) return;
            const options = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'),
            );
            const index = options.indexOf(e.target as HTMLElement);
            let next = -1;
            if (e.key === 'ArrowDown') next = (index + 1) % options.length;
            if (e.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
            if (e.key === 'Home') next = 0;
            if (e.key === 'End') next = options.length - 1;
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.key !== ' ') {
              const now = Date.now();
              search.current.text =
                (now - search.current.time < 600 ? search.current.text : '') + e.key.toLowerCase();
              search.current.time = now;
              next = options.findIndex((o) =>
                o.textContent?.toLowerCase().startsWith(search.current.text),
              );
            }
            if (next >= 0) {
              e.preventDefault();
              options[next].focus();
              options[next].scrollIntoView({ block: 'nearest' });
            }
            if (e.key === 'Tab') setOpen(false);
            e.stopPropagation();
          }}
        >
          {Object.entries(editorFonts).map(([font, label]) => (
            <Button
              key={font}
              role="option"
              aria-selected={current === font}
              tabIndex={current === font ? 0 : -1}
              className="vs-font-option"
              onClick={() => {
                onChange(font as keyof typeof editorFonts);
                close();
              }}
            >
              <span>{label}</span>
              {current === font && <CheckIcon size={16} />}
            </Button>
          ))}
        </Popover>
      )}
    </>
  );
}
