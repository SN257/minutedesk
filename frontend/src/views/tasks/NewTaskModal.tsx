import { useEffect, useState, type FormEvent } from 'react';
import { addDaysToDateString, getLocalDateString } from '../../lib/date';
import { useToast } from '../../lib/toast';
import { Button, Field, Input, Modal, Select, Textarea } from '../../ui';
import { parseQuickAdd, parseWhen } from './model';
import type { TasksData } from './useTasksData';

export const NewTaskModal = ({ open, onClose, data }: { open: boolean; onClose: () => void; data: TasksData }) => {
  const toast = useToast();
  const today = getLocalDateString();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [due, setDue] = useState('');
  const [dest, setDest] = useState('personal');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setTitle(''); setDesc(''); setDue(''); setDest('personal'); } }, [open]);

  const quick = (v: string | null) => setDue(v ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseQuickAdd(title, today);
    if (!parsed.title) return;
    const dueDate = due || parsed.dueDate;
    setBusy(true);
    if (dest === 'personal') {
      const t = await data.addTask(parsed.title, dueDate, desc.trim() || undefined);
      if (t) toast('Task added');
      else { setBusy(false); return; }
    } else {
      const c = await data.addCard(dest, parsed.title, dueDate, { description: desc.trim() || undefined, assignee: data.me || undefined });
      if (c) toast('Card added to your board');
      else { setBusy(false); return; }
    }
    setBusy(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <form onSubmit={submit} className="space-y-4">
        <Field label="What needs doing?" hint="Tip: add #tomorrow, #fri or #3d to set a due date.">
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send the proposal" />
        </Field>
        <Field label="Where should it live?">
          <Select value={dest} onChange={(e) => setDest(e.target.value)}>
            <option value="personal">Just for me (personal task)</option>
            {data.boards.map((b) => (
              <optgroup key={b.id} label={`Board: ${b.title}`}>
                {(data.listsByBoard[b.id] ?? []).map((l) => <option key={l.id} value={l.id}>{b.title} › {l.title}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Due date">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="!w-auto" />
            {([['Today', today], ['Tomorrow', addDaysToDateString(today, 1)], ['Next week', parseWhen('nextweek', today)]] as const).map(([label, v]) => (
              <button key={label} type="button" onClick={() => quick(v)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${due === v ? 'bg-ink text-white border-ink' : 'bg-white border-line text-ink-2 hover:border-ink/30'}`}>{label}</button>
            ))}
          </div>
        </Field>
        <Field label="Notes (optional)">
          <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Anything worth remembering…" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={!title.trim()}>Create task</Button>
        </div>
      </form>
    </Modal>
  );
};
