import { useEffect, useState } from 'react';
import type { StudioTab } from '../studioTypes';
import { newBoard, type BoardDocument } from '../../vision/document';
import { trashBoard, listBoards, saveBoard } from '../../vision/storage';

export type OpenBoard = (id: string, isNew: boolean, startTab?: StudioTab | null) => Promise<void>;
export function useHomeBoards(onOpen: OpenBoard) {
  const [boards, setBoards] = useState<{ id: string; document: BoardDocument }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [startMode, setStartMode] = useState<'blank' | 'templates' | 'photos'>('blank');
  const [removed, setRemoved] = useState<Array<{ id: string; document: BoardDocument }>>([]);
  const [orientation, setOrientation] = useState('1080x1920');
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
          title: title.trim() || 'My ' + year + ' vision',
          width,
          height,
          boardTheme: 'planning',
        },
        id,
      );
      await onOpen(
        id,
        true,
        startMode === 'templates' ? 'templates' : startMode === 'photos' ? 'uploads' : null,
      );
    } catch {
      setError('Unable to save your new board. Please try again.');
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    const board = boards.find((board) => board.id === id);
    if (!board || busy) return;
    setBusy(true);
    setError('');
    try {
      await trashBoard(window, id);
      setRemoved((current) => [...current, board]);
      setBoards((current) => current.filter((board) => board.id !== id));
    } catch {
      setError('Unable to delete this board. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const undoRemove = async () => {
    const board = removed.at(-1);
    if (!board || busy) return;
    setBusy(true);
    setError('');
    try {
      await trashBoard(window, board.id, true);
      setBoards((current) =>
        [board, ...current].sort(
          (a, b) => (b.document.updatedAt || 0) - (a.document.updatedAt || 0),
        ),
      );
      setRemoved((current) => current.slice(0, -1));
    } catch {
      setError('Unable to restore the board. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return {
    startMode,
    setStartMode,
    removed,
    undoRemove,
    dismissRemoved: () => setRemoved([]),
    boards,
    loading,
    busy,
    error,
    creating,
    setCreating,
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
