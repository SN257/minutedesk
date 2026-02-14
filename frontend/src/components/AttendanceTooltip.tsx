import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function TooltipPortal({ anchor, children }: { anchor?: HTMLElement | null; children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = document.createElement('div');
    node.style.position = 'fixed';
    node.style.zIndex = '9999';
    document.body.appendChild(node);
    setEl(node);

    return () => {
      if (node.parentNode) document.body.removeChild(node);
      setEl(null);
    };
  }, []);

  useEffect(() => {
    if (!el || !anchor) return;
    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.left;

      const tooltipHeight = el.offsetHeight || 0;
      const tooltipWidth = el.offsetWidth || 240;

      if (top + tooltipHeight > window.innerHeight - 12) {
        top = rect.top - tooltipHeight - 8;
        if (top < 8) top = 8;
      }

      if (left + tooltipWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - tooltipWidth - 12);
      }

      el.style.top = `${top}px`;
      el.style.left = `${left}px`;
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [el, anchor]);

  if (!el) return null;
  return createPortal(children, el);
}

export default function AttendanceTooltip({ attendance }: { attendance?: string }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [show, setShow] = useState(false);

  if (!attendance) return <div className="text-sm text-slate-700">-</div>;

  const names = (attendance || '').split(',').map((s: string) => s.trim()).filter(Boolean);

  return (
    <div className="inline-block">
      <div
        ref={(el) => setAnchorEl(el)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-default select-none"
      >
        <div className="text-sm text-slate-700 font-medium">{names.length}</div>
        <div className="text-xs text-slate-500">{names.length === 1 ? 'attendee' : 'attendees'}</div>
      </div>
      {show && anchorEl && (
        <TooltipPortal anchor={anchorEl}>
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-slate-700 max-w-xs">
            <div className="font-semibold mb-2">Attendees</div>
            <ul className="max-h-60 overflow-auto space-y-1">
              {names.map((n: string, idx: number) => (
                <li key={idx} className="truncate">{n}</li>
              ))}
            </ul>
          </div>
        </TooltipPortal>
      )}
    </div>
  );
}
