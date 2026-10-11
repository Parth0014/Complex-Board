import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  useEffect,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Button } from './Button';
import { Popover } from './Popover';

const MenuContext = createContext<{
  active: string | null;
  setActive: (id: string | null) => void;
} | null>(null);

export function navigateMenu(event: KeyboardEvent<HTMLElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const items = [
    ...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'),
  ].filter((node) => node.getClientRects().length > 0);
  if (!items.length) return;
  event.preventDefault();
  event.stopPropagation();
  const index = items.indexOf(event.target as HTMLElement);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  items[next].focus();
}

/** One active submenu per menu; clipboard commands and layer actions share keyboard navigation. */
export function Menu({ children, onKeyDown, ...props }: ComponentProps<'div'>) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <MenuContext.Provider value={{ active, setActive }}>
      <div
        {...props}
        role="menu"
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented) navigateMenu(event);
        }}
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export function Submenu({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error('Submenu requires a Menu parent');
  const [keyboard, setKeyboard] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();
  const open = menu.active === id;
  const cancel = () => clearTimeout(timer.current);
  const enter = () => {
    cancel();
    setKeyboard(false);
    menu.setActive(id);
  };
  const leave = () => {
    cancel();
    timer.current = setTimeout(() => menu.setActive(null), 150);
  };
  useEffect(() => {
    if (!open) clearTimeout(timer.current);
    return () => clearTimeout(timer.current);
  }, [open]);
  const openWithKeyboard = () => {
    cancel();
    setKeyboard(true);
    menu.setActive(id);
  };
  return (
    <>
      <Button
        ref={anchor}
        role="menuitem"
        className="gs-submenu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onClick={openWithKeyboard}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            openWithKeyboard();
          }
        }}
      >
        {icon}
        {label}
        <span className="vs-context-v2__chevron" aria-hidden="true">
          ›
        </span>
      </Button>
      {open && (
        <Popover
          anchor={anchor}
          side="right"
          role="menu"
          aria-label={label}
          id={id}
          className="gs-submenu"
          focusOnOpen={keyboard}
          onDismiss={() => menu.setActive(null)}
          onPointerEnter={cancel}
          onPointerLeave={leave}
          onBlur={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node) &&
              event.relatedTarget !== anchor.current
            )
              menu.setActive(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              event.stopPropagation();
              menu.setActive(null);
              anchor.current?.focus();
            } else navigateMenu(event);
          }}
        >
          {children}
        </Popover>
      )}
    </>
  );
}
