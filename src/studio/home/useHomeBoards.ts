import { useEffect, useState } from 'react';
import { ELEMENT_THEMES } from '../../assets/elementThemes';
import { newBoard, type BoardDocument } from '../../vision/document';
import { deleteBoard, listBoards, saveBoard } from '../../vision/storage';

export type OpenBoard = (id: string, isNew: boolean) => Promise<void>;
export function useHomeBoards(onOpen: OpenBoard) {
  const [boards, setBoards] = useState<{ id: string; document: BoardDocument }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState('yearly');
  const [theme, setTheme] = useState('growth');
  const [orientation, setOrientation] = useState('1920x1080');
  const [title, setTitle] = useState('');
  const year = new Date().getFullYear();
  useEffect(() => {
    let active = true;
    listBoards(window)
      .then((value) => {
        if (active) setBoards(value);
      })
      .catch((error: unknown) => {
        if (active)
          setError(
            'Unable to load your boards. ' +
              (error instanceof Error ? error.message : 'Storage could not be read.') +
              ' Your saved data has not been cleared.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const open = async (id: string, isNew = false) => {
    setBusy(true);
    setError('');
    try {
      await onOpen(id, isNew);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to open board.');
      setBusy(false);
    }
  };
  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const id = 'board:' + window.crypto.randomUUID();
      const [width, height] = orientation.split('x').map(Number);
      await saveBoard(
        window,
        {
          ...newBoard(),
          title:
            title.trim() ||
            (kind === 'yearly'
              ? 'My ' + year + ' vision'
              : ELEMENT_THEMES.find((item) => item.id === theme)!.label),
          width,
          height,
          boardTheme: kind === 'yearly' ? 'planning' : theme,
        },
        id,
      );
      await open(id, true);
    } catch {
      setError('Unable to save your new board. Please try again.');
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    const board = boards.find((board) => board.id === id);
    if (
      !board ||
      busy ||
      !window.confirm(`Delete “${board.document.title}”? This cannot be undone.`)
    )
      return;
    setBusy(true);
    setError('');
    try {
      await deleteBoard(window, id);
      setBoards((current) => current.filter((board) => board.id !== id));
    } catch {
      setError('Unable to delete this board. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return {
    boards,
    loading,
    busy,
    error,
    creating,
    setCreating,
    kind,
    setKind,
    theme,
    setTheme,
    orientation,
    setOrientation,
    title,
    setTitle,
    year,
    open,
    create,
    remove,
  };
}
