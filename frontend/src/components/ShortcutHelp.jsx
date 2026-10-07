export const SHORTCUTS = [
  ['1', 'Ship the goods'],
  ['2', 'Deliver the goods'],
  ['3', 'Buyer pays, agent settles'],
  ['D', 'Re-send the last webhook (duplicate)'],
  ['A', 'Send a forged webhook (attack)'],
  ['N', 'Open a new deal'],
  ['← →', 'Switch page'],
  ['P', 'Presenter mode (larger text)'],
  ['?', 'Show or hide this list'],
];

export function ShortcutHelp({ onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="slide-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">Keyboard shortcuts</h2>
        <dl className="flex flex-col gap-2">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt className="text-muted">{label}</dt>
              <dd><kbd className="rounded-md border border-line-strong bg-ground px-2 py-0.5 font-mono text-sm">{key}</kbd></dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-ink py-3 font-semibold text-white">Close</button>
      </div>
    </div>
  );
}
